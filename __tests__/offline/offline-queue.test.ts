/**
 * Garanties sur la file hors ligne des mises à jour de portes.
 *
 * Quand le commercial prospecte sans réseau, chaque changement de statut est
 * mis en file puis rejoué au retour du réseau. La file est persistée sur
 * disque (elle survit à un redémarrage), dédupliquée par porte, rejouée dans
 * l'ordre. Une erreur temporaire met la porte en pause (croissante) sans
 * bloquer les autres, sauf coupure réseau qui arrête le tour ; un refus
 * définitif est écarté et journalisé.
 */

import type { ErrorType } from "@/services/core/graphql/errors";
import type { UpdatePorteInput } from "@/types/api";

type ConnectivityListener = (isOnline: boolean) => void;

type CachedPayload = { data: unknown; savedAt: number };
// Contenu illisible (fichier tronqué, JSON invalide).
const CORRUPT = "corrupt";

const QUEUE_CACHE_KEY = "offline-porte-queue";
const REJECTED_CACHE_KEY = "offline-porte-rejected";
const MINUTE_MS = 60_000;

const mockPorteUpdate = jest.fn<Promise<unknown>, [UpdatePorteInput]>();
const mockSyncWorkspaceMutation = jest.fn<
  void,
  [string, { immeubleId?: number; porteId?: number } | undefined]
>();
const mockEnsureConnectivityMonitoring = jest.fn<void, []>();
const mockConnectivity = {
  online: true,
  listeners: new Set<ConnectivityListener>(),
};
// Cache persistant en mémoire : clé → contenu. Conservé entre deux
// « redémarrages » de l'app (jest.resetModules), comme le disque.
const mockCache = new Map<string, CachedPayload | typeof CORRUPT>();
// ioErrorReads : nombre de prochaines lectures en erreur d'accès disque.
const mockCacheControl = { moveAsideFails: false, ioErrorReads: 0 };

jest.mock("@/services/api", () => ({
  api: {
    portes: {
      update: (input: UpdatePorteInput) => mockPorteUpdate(input),
    },
  },
}));

jest.mock("@/hooks/api/data-sync", () => ({
  syncWorkspaceMutation: (
    eventType: string,
    options?: { immeubleId?: number; porteId?: number },
  ) => mockSyncWorkspaceMutation(eventType, options),
}));

jest.mock("@/services/offline/persistent-cache.service", () => {
  const readEntry = async (key: string) => {
    if (mockCacheControl.ioErrorReads > 0) {
      mockCacheControl.ioErrorReads -= 1;
      return { status: "io-error", error: new Error("EIO") };
    }
    const cached = mockCache.get(key);
    if (cached === undefined) return { status: "missing" };
    if (cached === "corrupt") return { status: "unreadable", error: new Error("JSON invalide") };
    return { status: "ok", payload: cached };
  };
  return {
    writePersistentCache: async (key: string, data: unknown) => {
      // Copie profonde : le disque ne partage aucune référence avec la mémoire.
      mockCache.set(key, { data: JSON.parse(JSON.stringify(data)), savedAt: Date.now() });
    },
    readPersistentCacheEntry: readEntry,
    readPersistentCache: async (key: string) => {
      const result = await readEntry(key);
      return result.status === "ok" ? result.payload : null;
    },
    movePersistentCacheAside: async (key: string) => {
      const cached = mockCache.get(key);
      if (mockCacheControl.moveAsideFails || cached === undefined) return false;
      mockCache.delete(key);
      mockCache.set(`${key}.corrupt-${Date.now()}`, cached);
      return true;
    },
  };
});

// Reproduit le contrat du vrai service : l'abonné reçoit immédiatement l'état
// courant, puis chaque changement.
jest.mock("@/services/network/connectivity.service", () => ({
  ensureConnectivityMonitoring: () => mockEnsureConnectivityMonitoring(),
  getIsOnline: () => mockConnectivity.online,
  subscribeConnectivity: (listener: ConnectivityListener) => {
    mockConnectivity.listeners.add(listener);
    listener(mockConnectivity.online);
    return () => {
      mockConnectivity.listeners.delete(listener);
    };
  },
}));

type OfflineQueueModule =
  typeof import("@/services/offline/offline-queue.service");
type ErrorsModule = typeof import("@/services/core/graphql/errors");

type StoredEntry = { porteId: number; payload: UpdatePorteInput };
type RejectedEntry = { porteId: number; error: string; rejectedAt: number };

let service: OfflineQueueModule;
let errors: ErrorsModule;

// Simule un redémarrage de l'app : module neuf, mais le disque est conservé.
function restartApp(): void {
  jest.resetModules();
  // Même registre que le service : `instanceof GraphQLClientError` reste valide.
  errors = jest.requireActual<ErrorsModule>("@/services/core/graphql/errors");
  service = jest.requireActual<OfflineQueueModule>(
    "@/services/offline/offline-queue.service",
  );
}

function setOnline(isOnline: boolean): void {
  mockConnectivity.online = isOnline;
  mockConnectivity.listeners.forEach((listener) => listener(isOnline));
}

function porteUpdate(id: number, statut: string): UpdatePorteInput {
  return { id, statut };
}

function graphQLError(type: ErrorType): Error {
  return new errors.GraphQLClientError(`erreur ${type}`, type);
}

function updatedIds(): number[] {
  return mockPorteUpdate.mock.calls.map(([input]) => input.id);
}

function storedData(key: string): unknown {
  const cached = mockCache.get(key);
  if (cached === CORRUPT) throw new Error(`${key} illisible`);
  return cached?.data ?? [];
}

function storedQueue(): StoredEntry[] {
  return storedData(QUEUE_CACHE_KEY) as StoredEntry[];
}

function storedRejected(): RejectedEntry[] {
  return storedData(REJECTED_CACHE_KEY) as RejectedEntry[];
}

// Laisse se terminer les écritures disque chaînées (fire-and-forget).
function settleBackgroundWork(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// Une promesse que le test résout à la main, pour observer un flush en cours.
function deferred(): { promise: Promise<unknown>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<unknown>((res) => {
    resolve = () => res(undefined);
  });
  return { promise, resolve };
}

// Attend que le flush en cours atteigne l'envoi (chargement disque asynchrone).
async function waitForUpdateCall(): Promise<void> {
  while (mockPorteUpdate.mock.calls.length === 0) {
    await Promise.resolve();
  }
}

describe("offline-queue.service", () => {
  beforeEach(() => {
    // Les timers de retry restent sous contrôle du test ; setImmediate reste
    // réel pour laisser se terminer le travail en tâche de fond.
    jest.useFakeTimers({ doNotFake: ["setImmediate"] });
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockConnectivity.online = true;
    mockConnectivity.listeners.clear();
    mockCache.clear();
    mockCacheControl.moveAsideFails = false;
    mockCacheControl.ioErrorReads = 0;
    mockPorteUpdate.mockResolvedValue({});
    restartApp();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("dédup par porte", () => {
    it("la dernière écriture gagne pour une même porte d'un même immeuble", async () => {
      service.queuePorteUpdate(porteUpdate(10, "ABSENT"), { immeubleId: 1 });
      const count = service.queuePorteUpdate(porteUpdate(10, "REFUS"), {
        immeubleId: 1,
      });

      expect(count).toBe(1);
      await service.flushOfflineQueue();
      expect(mockPorteUpdate).toHaveBeenCalledTimes(1);
      expect(mockPorteUpdate).toHaveBeenCalledWith(porteUpdate(10, "REFUS"));
    });

    it("distingue les clés immeuble:X:porte:Y et porte:Y", () => {
      expect(service.queuePorteUpdate(porteUpdate(10, "ABSENT"), { immeubleId: 1 })).toBe(1);
      expect(service.queuePorteUpdate(porteUpdate(10, "ABSENT"), { immeubleId: 2 })).toBe(2);
      expect(service.queuePorteUpdate(porteUpdate(10, "ABSENT"))).toBe(3);
      expect(service.queuePorteUpdate(porteUpdate(10, "REFUS"))).toBe(3);
    });

    it("une écriture dédupliquée garde la position d'origine dans la file", async () => {
      service.queuePorteUpdate(porteUpdate(10, "ABSENT"), { immeubleId: 1 });
      service.queuePorteUpdate(porteUpdate(11, "ABSENT"), { immeubleId: 1 });
      service.queuePorteUpdate(porteUpdate(10, "CONTRAT_SIGNE"), { immeubleId: 1 });

      await service.flushOfflineQueue();
      expect(mockPorteUpdate.mock.calls.map(([input]) => input)).toEqual([
        porteUpdate(10, "CONTRAT_SIGNE"),
        porteUpdate(11, "ABSENT"),
      ]);
    });
  });

  describe("persistance", () => {
    it("chaque mise en file est écrite sur disque, dans l'ordre", async () => {
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(2, "REFUS"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(1, "CONTRAT_SIGNE"), { immeubleId: 7 });
      await settleBackgroundWork();

      expect(storedQueue().map((entry) => entry.payload)).toEqual([
        porteUpdate(1, "CONTRAT_SIGNE"),
        porteUpdate(2, "REFUS"),
      ]);
    });

    it("la file survit à un redémarrage hors ligne puis part au retour du réseau", async () => {
      mockConnectivity.online = false;
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(2, "REFUS"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(3, "ABSENT"), { immeubleId: 7 });
      await settleBackgroundWork();

      restartApp();
      const counts: number[] = [];
      service.subscribeOfflineQueue((count) => counts.push(count));
      service.enableOfflineQueueAutoSync();
      await settleBackgroundWork();
      expect(counts).toEqual([0, 3]);

      setOnline(true);
      await jest.advanceTimersByTimeAsync(500);

      expect(updatedIds()).toEqual([1, 2, 3]);
      expect(counts.at(-1)).toBe(0);
      await settleBackgroundWork();
      expect(storedQueue()).toEqual([]);
    });

    it("une mise en file pendant le chargement n'écrase pas la file sur disque", async () => {
      mockConnectivity.online = false;
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(2, "ABSENT"), { immeubleId: 7 });
      await settleBackgroundWork();

      restartApp();
      // Avant la fin du chargement : la porte 2 est modifiée, la 3 ajoutée.
      service.queuePorteUpdate(porteUpdate(2, "REFUS"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(3, "ABSENT"), { immeubleId: 7 });
      await settleBackgroundWork();

      expect(storedQueue().map((entry) => entry.payload)).toEqual([
        porteUpdate(1, "ABSENT"),
        porteUpdate(2, "REFUS"),
        porteUpdate(3, "ABSENT"),
      ]);

      mockConnectivity.online = true;
      await service.flushOfflineQueue();
      expect(updatedIds()).toEqual([1, 2, 3]);
    });

    it("ignore les entrées invalides sur disque", async () => {
      mockCache.set(QUEUE_CACHE_KEY, {
        data: [
          { key: "porte:1", porteId: 1, payload: porteUpdate(1, "ABSENT") },
          { key: "porte:2" },
          "corrompu",
        ],
        savedAt: Date.now(),
      });

      restartApp();
      await service.flushOfflineQueue();

      expect(updatedIds()).toEqual([1]);
    });

    it("un fichier de file illisible est mis de côté, pas écrasé", async () => {
      mockCache.set(QUEUE_CACHE_KEY, CORRUPT);
      mockConnectivity.online = false;

      restartApp();
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      await settleBackgroundWork();

      const asideKeys = Array.from(mockCache.keys()).filter((key) =>
        /^offline-porte-queue\.corrupt-\d+$/.test(key),
      );
      expect(asideKeys).toHaveLength(1);
      expect(mockCache.get(asideKeys[0])).toBe(CORRUPT);
      expect(storedQueue().map((entry) => entry.porteId)).toEqual([1]);
    });

    it("erreur d'accès disque au chargement : file conservée telle quelle, relue plus tard", async () => {
      mockConnectivity.online = false;
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      await settleBackgroundWork();
      const onDisk = mockCache.get(QUEUE_CACHE_KEY);

      restartApp();
      mockCacheControl.ioErrorReads = Number.POSITIVE_INFINITY;
      service.enableOfflineQueueAutoSync();
      service.queuePorteUpdate(porteUpdate(2, "ABSENT"));
      await service.flushOfflineQueue();
      await settleBackgroundWork();

      // Ni mise de côté ni écrasement : le fichier valide est intact.
      expect(mockCache.get(QUEUE_CACHE_KEY)).toBe(onDisk);
      expect(Array.from(mockCache.keys())).toEqual([QUEUE_CACHE_KEY]);

      // Le disque redevient lisible : la file est relue puis réécrite, fusionnée.
      mockCacheControl.ioErrorReads = 0;
      await service.flushOfflineQueue();
      await settleBackgroundWork();
      expect(storedQueue().map((entry) => entry.porteId)).toEqual([1, 2]);

      mockConnectivity.online = true;
      await service.flushOfflineQueue();
      expect(updatedIds()).toEqual([1, 2]);
    });

    it("une porte déjà renvoyée avant la relecture du disque n'est pas rejouée avec son ancienne valeur", async () => {
      mockConnectivity.online = false;
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      await settleBackgroundWork();

      restartApp();
      mockConnectivity.online = true;
      mockCacheControl.ioErrorReads = Number.POSITIVE_INFINITY;
      service.queuePorteUpdate(porteUpdate(1, "CONTRAT_SIGNE"));
      await service.flushOfflineQueue();
      await settleBackgroundWork();
      expect(updatedIds()).toEqual([1]);

      // Relecture réussie : l'ancienne valeur (ABSENT) du disque est ignorée,
      // et la file sur disque est réécrite sans elle.
      mockCacheControl.ioErrorReads = 0;
      await service.flushOfflineQueue();
      await settleBackgroundWork();
      expect(mockPorteUpdate.mock.calls.map(([input]) => input)).toEqual([
        porteUpdate(1, "CONTRAT_SIGNE"),
      ]);
      expect(storedQueue()).toEqual([]);
    });

    it("si le fichier illisible ne peut pas être mis de côté, il n'est jamais écrasé", async () => {
      mockCache.set(QUEUE_CACHE_KEY, CORRUPT);
      mockCacheControl.moveAsideFails = true;

      restartApp();
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      await settleBackgroundWork();
      expect(mockCache.get(QUEUE_CACHE_KEY)).toBe(CORRUPT);

      // La file fonctionne quand même en mémoire.
      await service.flushOfflineQueue();
      expect(updatedIds()).toEqual([1]);
      await settleBackgroundWork();
      expect(mockCache.get(QUEUE_CACHE_KEY)).toBe(CORRUPT);
    });
  });

  describe("flush", () => {
    it("rejoue dans l'ordre d'insertion et vide la file", async () => {
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(2, "REFUS"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(3, "RENDEZ_VOUS_PRIS"), { immeubleId: 7 });

      await service.flushOfflineQueue();

      expect(updatedIds()).toEqual([1, 2, 3]);
      expect(service.queuePorteUpdate(porteUpdate(4, "ABSENT"))).toBe(1);
    });

    it("notifie la synchro du workspace pour chaque porte rejouée", async () => {
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(2, "REFUS"));

      await service.flushOfflineQueue();

      expect(mockSyncWorkspaceMutation.mock.calls).toEqual([
        ["PORTE_UPDATED", { immeubleId: 7, porteId: 1 }],
        ["PORTE_UPDATED", { immeubleId: undefined, porteId: 2 }],
      ]);
    });

    it("ne fait rien hors ligne : la file est conservée", async () => {
      mockConnectivity.online = false;
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));

      await service.flushOfflineQueue();

      expect(mockPorteUpdate).not.toHaveBeenCalled();
      expect(service.queuePorteUpdate(porteUpdate(2, "ABSENT"))).toBe(2);
    });

    it("ne fait rien si la file est vide", async () => {
      await service.flushOfflineQueue();
      expect(mockPorteUpdate).not.toHaveBeenCalled();
    });
  });

  describe("erreur temporaire en plein flush", () => {
    it("coupure réseau : s'arrête sans rejeter, ne perd rien et planifie un retry", async () => {
      mockPorteUpdate
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(graphQLError(errors.ErrorType.NETWORK));
      const counts: number[] = [];
      service.subscribeOfflineQueue((count) => counts.push(count));

      service.queuePorteUpdate(porteUpdate(1, "ABSENT"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(2, "REFUS"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(3, "ABSENT"), { immeubleId: 7 });

      await expect(service.flushOfflineQueue()).resolves.toBeUndefined();

      // Seule la porte 1 est partie ; la 3 n'a même pas été tentée (réseau coupé).
      expect(updatedIds()).toEqual([1, 2]);
      expect(mockSyncWorkspaceMutation).toHaveBeenCalledTimes(1);
      expect(counts).toEqual([0, 1, 2, 3, 2]);

      // Le retry planifié (30 s) reprend les portes restantes, dans l'ordre.
      mockPorteUpdate.mockClear();
      await jest.advanceTimersByTimeAsync(30_000 - 1);
      expect(mockPorteUpdate).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      expect(updatedIds()).toEqual([2, 3]);
      expect(counts.at(-1)).toBe(0);
    });

    it("un réseau perdu en plein flush arrête aussi le tour", async () => {
      mockPorteUpdate.mockImplementationOnce(async () => {
        mockConnectivity.online = false;
        throw new Error("timeout");
      });
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      service.queuePorteUpdate(porteUpdate(2, "ABSENT"));

      await service.flushOfflineQueue();

      expect(updatedIds()).toEqual([1]);
    });

    it("serveur, session expirée et erreurs inconnues : temporaires, sans bloquer les autres portes", async () => {
      const transientTypes = [
        errors.ErrorType.SERVER,
        errors.ErrorType.AUTHENTICATION,
        errors.ErrorType.GRAPHQL,
        errors.ErrorType.UNKNOWN,
      ];
      transientTypes.forEach((type, index) => {
        mockPorteUpdate.mockRejectedValueOnce(graphQLError(type));
        service.queuePorteUpdate(porteUpdate(index + 1, "ABSENT"));
      });
      service.queuePorteUpdate(porteUpdate(99, "ABSENT"));

      await service.flushOfflineQueue();
      await settleBackgroundWork();

      // Toutes tentées, la 99 est partie, les autres restent en file.
      expect(updatedIds()).toEqual([1, 2, 3, 4, 99]);
      expect(storedQueue().map((entry) => entry.porteId)).toEqual([1, 2, 3, 4]);
      expect(storedRejected()).toEqual([]);
    });

    it("une porte en erreur temporaire ne bloque pas les suivantes et est retentée seule", async () => {
      // Ex. : refus métier non reconnu comme définitif (type GRAPHQL).
      mockPorteUpdate
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(graphQLError(errors.ErrorType.GRAPHQL));
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      service.queuePorteUpdate(porteUpdate(2, "ABSENT"));
      service.queuePorteUpdate(porteUpdate(3, "ABSENT"));

      await service.flushOfflineQueue();
      expect(updatedIds()).toEqual([1, 2, 3]);
      expect(service.queuePorteUpdate(porteUpdate(4, "ABSENT"))).toBe(2);

      // La 4 n'est pas en pause : un flush l'envoie, la 2 attend sa pause.
      mockPorteUpdate.mockClear();
      await service.flushOfflineQueue();
      expect(updatedIds()).toEqual([4]);

      mockPorteUpdate.mockClear();
      await jest.advanceTimersByTimeAsync(30_000);
      expect(updatedIds()).toEqual([2]);
    });

    it("pauses croissantes entre essais, plafonnées à 15 min, sans empiler de timers", async () => {
      mockPorteUpdate.mockRejectedValue(new Error("503"));
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      await service.flushOfflineQueue();
      expect(mockPorteUpdate).toHaveBeenCalledTimes(1);

      const expectedDelays = [
        30_000,
        MINUTE_MS,
        2 * MINUTE_MS,
        5 * MINUTE_MS,
        15 * MINUTE_MS,
        15 * MINUTE_MS,
      ];
      for (const [index, delay] of expectedDelays.entries()) {
        expect(jest.getTimerCount()).toBe(1);
        await jest.advanceTimersByTimeAsync(delay - 1);
        expect(mockPorteUpdate).toHaveBeenCalledTimes(index + 1);
        await jest.advanceTimersByTimeAsync(1);
        expect(mockPorteUpdate).toHaveBeenCalledTimes(index + 2);
      }

      // Jamais abandonnée : la porte est toujours en file.
      expect(service.queuePorteUpdate(porteUpdate(1, "ABSENT"))).toBe(1);
    });

    it("un flush manuel pendant la pause remplace le timer au lieu d'en ajouter un", async () => {
      mockPorteUpdate.mockRejectedValue(new Error("503"));
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));

      await service.flushOfflineQueue();
      await service.flushOfflineQueue();
      await service.flushOfflineQueue();

      expect(jest.getTimerCount()).toBe(1);
    });

    it("le retour du réseau remet la pause à zéro et relance le flush", async () => {
      service.enableOfflineQueueAutoSync();
      await jest.advanceTimersByTimeAsync(500);
      mockPorteUpdate.mockRejectedValue(new Error("503"));
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      // 3 échecs : la prochaine pause serait de 2 min.
      await service.flushOfflineQueue();
      await jest.advanceTimersByTimeAsync(30_000);
      await jest.advanceTimersByTimeAsync(MINUTE_MS);
      expect(mockPorteUpdate).toHaveBeenCalledTimes(3);

      setOnline(false);
      setOnline(true);
      // Pause remise à zéro : le timer de 2 min est remplacé par le debounce.
      expect(jest.getTimerCount()).toBe(1);
      await jest.advanceTimersByTimeAsync(500);
      expect(mockPorteUpdate).toHaveBeenCalledTimes(4);

      // Nouvel échec après la reconnexion : la pause repart de 30 s.
      await jest.advanceTimersByTimeAsync(30_000);
      expect(mockPorteUpdate).toHaveBeenCalledTimes(5);
    });

    it("chaque porte a sa propre pause : une nouvelle porte en échec repart de 30 s", async () => {
      mockPorteUpdate.mockRejectedValueOnce(new Error("503")).mockRejectedValueOnce(new Error("503"));
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      await service.flushOfflineQueue();
      await jest.advanceTimersByTimeAsync(30_000);
      await jest.advanceTimersByTimeAsync(MINUTE_MS);
      expect(mockPorteUpdate).toHaveBeenCalledTimes(3);
      expect(jest.getTimerCount()).toBe(0);

      mockPorteUpdate.mockRejectedValueOnce(new Error("503"));
      service.queuePorteUpdate(porteUpdate(2, "ABSENT"));
      await service.flushOfflineQueue();
      mockPorteUpdate.mockClear();
      await jest.advanceTimersByTimeAsync(30_000);
      expect(updatedIds()).toEqual([2]);
    });
  });

  describe("refus définitif du serveur", () => {
    it("l'entrée est écartée, journalisée, et les suivantes partent quand même", async () => {
      mockPorteUpdate
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(graphQLError(errors.ErrorType.VALIDATION));
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(2, "REFUS"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(3, "ABSENT"), { immeubleId: 7 });

      await service.flushOfflineQueue();
      await settleBackgroundWork();

      expect(updatedIds()).toEqual([1, 2, 3]);
      expect(
        mockSyncWorkspaceMutation.mock.calls.map(([, options]) => options?.porteId),
      ).toEqual([1, 3]);
      expect(storedQueue()).toEqual([]);
      expect(storedRejected()).toEqual([
        expect.objectContaining({
          porteId: 2,
          error: `erreur ${errors.ErrorType.VALIDATION}`,
          rejectedAt: expect.any(Number),
        }),
      ]);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("autorisation refusée et ressource introuvable sont aussi définitives", async () => {
      mockPorteUpdate
        .mockRejectedValueOnce(graphQLError(errors.ErrorType.AUTHORIZATION))
        .mockRejectedValueOnce(graphQLError(errors.ErrorType.NOT_FOUND));
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      service.queuePorteUpdate(porteUpdate(2, "ABSENT"));

      await service.flushOfflineQueue();
      await settleBackgroundWork();

      expect(storedRejected().map((entry) => entry.porteId)).toEqual([1, 2]);
      expect(storedQueue()).toEqual([]);
    });

    it("le journal ne garde que les 50 derniers refus", async () => {
      mockCache.set(REJECTED_CACHE_KEY, {
        data: Array.from({ length: 50 }, (_, index) => ({ porteId: 1000 + index })),
        savedAt: Date.now(),
      });
      mockPorteUpdate.mockRejectedValueOnce(graphQLError(errors.ErrorType.VALIDATION));
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));

      await service.flushOfflineQueue();
      await settleBackgroundWork();

      const rejected = storedRejected();
      expect(rejected).toHaveLength(50);
      expect(rejected[0].porteId).toBe(1001);
      expect(rejected.at(-1)?.porteId).toBe(1);
    });
  });

  describe("garde contre un double flush", () => {
    it("deux flush simultanés partagent le même envoi", async () => {
      const pending = deferred();
      mockPorteUpdate.mockReturnValueOnce(pending.promise);
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      service.queuePorteUpdate(porteUpdate(2, "REFUS"));

      const first = service.flushOfflineQueue();
      const second = service.flushOfflineQueue();
      expect(second).toBe(first);

      pending.resolve();
      await Promise.all([first, second]);
      expect(updatedIds()).toEqual([1, 2]);
    });

    it("une porte mise en file pendant un flush part au tour de relance", async () => {
      const pending = deferred();
      mockPorteUpdate.mockReturnValueOnce(pending.promise);
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));

      const first = service.flushOfflineQueue();
      await waitForUpdateCall();
      service.queuePorteUpdate(porteUpdate(2, "REFUS"));
      pending.resolve();
      await first;

      expect(updatedIds()).toEqual([1, 2]);
    });

    it("une porte modifiée pendant son envoi garde sa nouvelle valeur en file", async () => {
      const pending = deferred();
      mockPorteUpdate.mockReturnValueOnce(pending.promise);
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));

      const first = service.flushOfflineQueue();
      await waitForUpdateCall();
      service.queuePorteUpdate(porteUpdate(1, "CONTRAT_SIGNE"));
      pending.resolve();
      await first;

      expect(mockPorteUpdate.mock.calls.map(([input]) => input)).toEqual([
        porteUpdate(1, "ABSENT"),
        porteUpdate(1, "CONTRAT_SIGNE"),
      ]);
    });
  });

  describe("synchro automatique au retour du réseau", () => {
    it("flush 500 ms après le retour du réseau (debounce)", async () => {
      mockConnectivity.online = false;
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      service.enableOfflineQueueAutoSync();

      setOnline(true);
      await jest.advanceTimersByTimeAsync(499);
      expect(mockPorteUpdate).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      expect(mockPorteUpdate).toHaveBeenCalledTimes(1);
    });

    it("des reconnexions rapprochées ne déclenchent qu'un seul flush", async () => {
      mockConnectivity.online = false;
      service.enableOfflineQueueAutoSync();
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));

      setOnline(true);
      await jest.advanceTimersByTimeAsync(300);
      setOnline(false);
      setOnline(true);
      await jest.advanceTimersByTimeAsync(300);
      expect(mockPorteUpdate).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(200);
      expect(mockPorteUpdate).toHaveBeenCalledTimes(1);
    });

    it("une coupure ne déclenche pas de flush", async () => {
      mockConnectivity.online = false;
      service.enableOfflineQueueAutoSync();
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));

      setOnline(false);
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockPorteUpdate).not.toHaveBeenCalled();
    });

    it("déjà en ligne à l'activation : flush programmé immédiatement", async () => {
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      service.enableOfflineQueueAutoSync();

      await jest.advanceTimersByTimeAsync(500);
      expect(mockPorteUpdate).toHaveBeenCalledTimes(1);
    });

    it("l'activation est idempotente : un seul abonnement connectivité", () => {
      service.enableOfflineQueueAutoSync();
      service.enableOfflineQueueAutoSync();

      expect(mockConnectivity.listeners.size).toBe(1);
      expect(mockEnsureConnectivityMonitoring).toHaveBeenCalledTimes(1);
    });

    it("une erreur inattendue du flush différé ne laisse aucun rejet non géré", async () => {
      const unhandled = jest.fn();
      process.on("unhandledRejection", unhandled);
      try {
        service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
        // Un abonné défaillant fait échouer le flush de façon inattendue.
        service.subscribeOfflineQueue((count) => {
          if (count === 0) throw new Error("bug inattendu");
        });
        service.enableOfflineQueueAutoSync();

        await jest.advanceTimersByTimeAsync(500);
        await settleBackgroundWork();
        await settleBackgroundWork();

        expect(mockPorteUpdate).toHaveBeenCalledTimes(1);
        expect(unhandled).not.toHaveBeenCalled();
      } finally {
        process.off("unhandledRejection", unhandled);
      }
    });
  });

  describe("synchro du workspace", () => {
    it("un échec de la synchro locale ne bloque pas la file", async () => {
      mockSyncWorkspaceMutation.mockImplementationOnce(() => {
        throw new Error("bug synchro");
      });
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      service.queuePorteUpdate(porteUpdate(2, "ABSENT"));

      await expect(service.flushOfflineQueue()).resolves.toBeUndefined();

      expect(updatedIds()).toEqual([1, 2]);
      expect(service.queuePorteUpdate(porteUpdate(3, "ABSENT"))).toBe(1);
    });
  });

  describe("abonnés", () => {
    it("reçoivent le compte courant à l'abonnement puis à chaque changement", async () => {
      const counts: number[] = [];
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      service.subscribeOfflineQueue((count) => counts.push(count));

      service.queuePorteUpdate(porteUpdate(2, "ABSENT"));
      service.queuePorteUpdate(porteUpdate(2, "REFUS"));
      await service.flushOfflineQueue();

      expect(counts).toEqual([1, 2, 2, 1, 0]);
    });

    it("ne reçoivent plus rien après désabonnement", () => {
      const listener = jest.fn<void, [number]>();
      const unsubscribe = service.subscribeOfflineQueue(listener);
      unsubscribe();

      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(0);
    });
  });
});
