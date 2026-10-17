/**
 * Garanties sur la file hors ligne des mises à jour de portes.
 *
 * Quand le commercial prospecte sans réseau, chaque changement de statut est
 * mis en file puis rejoué au retour du réseau. Ces tests figent le
 * comportement ACTUEL du service (file en mémoire, dédup par porte, arrêt du
 * flush au premier échec) pour protéger toute évolution ultérieure.
 */

import type { UpdatePorteInput } from "@/types/api";

type ConnectivityListener = (isOnline: boolean) => void;

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

let service: OfflineQueueModule;

function setOnline(isOnline: boolean): void {
  mockConnectivity.online = isOnline;
  mockConnectivity.listeners.forEach((listener) => listener(isOnline));
}

function porteUpdate(id: number, statut: string): UpdatePorteInput {
  return { id, statut };
}

// Une promesse que le test résout à la main, pour observer un flush en cours.
function deferred(): { promise: Promise<unknown>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<unknown>((res) => {
    resolve = () => res(undefined);
  });
  return { promise, resolve };
}

describe("offline-queue.service", () => {
  beforeEach(() => {
    // L'état de la file est au niveau module : un module neuf par test
    // (registre vidé puis rechargé ; ses dépendances restent mockées).
    jest.resetModules();
    jest.clearAllMocks();
    mockConnectivity.online = true;
    mockConnectivity.listeners.clear();
    mockPorteUpdate.mockResolvedValue({});
    service = jest.requireActual<OfflineQueueModule>(
      "@/services/offline/offline-queue.service",
    );
  });

  afterEach(() => {
    jest.useRealTimers();
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

  describe("flush", () => {
    it("rejoue dans l'ordre d'insertion et vide la file", async () => {
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(2, "REFUS"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(3, "RENDEZ_VOUS_PRIS"), { immeubleId: 7 });

      await service.flushOfflineQueue();

      expect(mockPorteUpdate.mock.calls.map(([input]) => input.id)).toEqual([1, 2, 3]);
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

  describe("échec en plein flush", () => {
    it("s'arrête au premier échec, remonte l'erreur et ne perd rien", async () => {
      const failure = new Error("réseau coupé");
      mockPorteUpdate
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(failure);
      const counts: number[] = [];
      service.subscribeOfflineQueue((count) => counts.push(count));

      service.queuePorteUpdate(porteUpdate(1, "ABSENT"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(2, "REFUS"), { immeubleId: 7 });
      service.queuePorteUpdate(porteUpdate(3, "ABSENT"), { immeubleId: 7 });

      await expect(service.flushOfflineQueue()).rejects.toBe(failure);

      // Seule la porte 1 est partie ; la 3 n'a même pas été tentée.
      expect(mockPorteUpdate.mock.calls.map(([input]) => input.id)).toEqual([1, 2]);
      expect(mockSyncWorkspaceMutation).toHaveBeenCalledTimes(1);
      expect(counts).toEqual([0, 1, 2, 3, 2]);

      // Le flush suivant reprend les portes restantes, dans l'ordre.
      mockPorteUpdate.mockClear();
      mockPorteUpdate.mockResolvedValue({});
      await service.flushOfflineQueue();
      expect(mockPorteUpdate.mock.calls.map(([input]) => input.id)).toEqual([2, 3]);
      expect(counts[counts.length - 1]).toBe(0);
    });

    it("libère le verrou après un échec", async () => {
      mockPorteUpdate.mockRejectedValueOnce(new Error("500"));
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));

      await expect(service.flushOfflineQueue()).rejects.toThrow("500");
      await service.flushOfflineQueue();

      expect(mockPorteUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe("garde contre un double flush", () => {
    it("un second flush pendant le premier ne rejoue rien", async () => {
      const pending = deferred();
      mockPorteUpdate.mockReturnValueOnce(pending.promise);
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));
      service.queuePorteUpdate(porteUpdate(2, "REFUS"));

      const first = service.flushOfflineQueue();
      await service.flushOfflineQueue();
      expect(mockPorteUpdate).toHaveBeenCalledTimes(1);

      pending.resolve();
      await first;
      expect(mockPorteUpdate.mock.calls.map(([input]) => input.id)).toEqual([1, 2]);
    });

    it("une porte mise en file pendant un flush attend le flush suivant", async () => {
      const pending = deferred();
      mockPorteUpdate.mockReturnValueOnce(pending.promise);
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));

      const first = service.flushOfflineQueue();
      service.queuePorteUpdate(porteUpdate(2, "REFUS"));
      pending.resolve();
      await first;

      expect(mockPorteUpdate).toHaveBeenCalledTimes(1);
      await service.flushOfflineQueue();
      expect(mockPorteUpdate.mock.calls.map(([input]) => input.id)).toEqual([1, 2]);
    });
  });

  describe("synchro automatique au retour du réseau", () => {
    it("flush 500 ms après le retour du réseau (debounce)", async () => {
      jest.useFakeTimers();
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
      jest.useFakeTimers();
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
      jest.useFakeTimers();
      mockConnectivity.online = false;
      service.enableOfflineQueueAutoSync();
      service.queuePorteUpdate(porteUpdate(1, "ABSENT"));

      setOnline(false);
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockPorteUpdate).not.toHaveBeenCalled();
    });

    it("déjà en ligne à l'activation : flush programmé immédiatement", async () => {
      jest.useFakeTimers();
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
