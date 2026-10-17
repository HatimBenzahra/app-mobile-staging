/**
 * Garanties sur la file d'upload des enregistrements audio.
 *
 * Un enregistrement de prospection n'existe que sur le téléphone tant qu'il
 * n'est pas envoyé : la file doit survivre à un redémarrage de l'app (fichier
 * JSON sur disque), n'envoyer chaque audio qu'une fois, et retenter les échecs
 * sans fin avec des pauses croissantes (jamais d'abandon ni de suppression).
 */

import type { UploadRecordingInput } from "@/services/audio/recordings/recording-upload.service";

type ConnectivityListener = (isOnline: boolean) => void;

type StoredUpload = UploadRecordingInput & {
  id: string;
  createdAt: number;
  retryCount: number;
  nextAttemptAt?: number;
  failedAt?: number;
  lastError?: string;
};

const DOC_DIR = "file:///doc/";
const CACHE_DIR = "file:///cache/";
const QUEUE_FILE = `${DOC_DIR}pending-uploads.json`;
const LEGACY_QUEUE_FILE = `${CACHE_DIR}pending-uploads.json`;
const RECORDINGS_DIR = `${DOC_DIR}recordings/`;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Système de fichiers en mémoire : chemin → contenu.
const mockFiles = new Map<string, string>();
// Chemins dont l'accès échoue (erreur disque simulée), durablement ou une fois.
const mockFailingPaths = new Set<string>();
const mockFailingOncePaths = new Set<string>();
// Journal des opérations sensibles, pour vérifier leur ordre.
const mockEvents: string[] = [];

function mockCheckAccess(path: string): void {
  if (mockFailingOncePaths.delete(path) || mockFailingPaths.has(path)) {
    throw new Error(`EIO ${path}`);
  }
}
const mockUploadRecording = jest.fn<Promise<unknown>, [UploadRecordingInput]>();
const mockConnectivity = {
  online: false,
  initialized: true,
  listeners: new Set<ConnectivityListener>(),
};

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///doc/",
  cacheDirectory: "file:///cache/",
  getInfoAsync: async (path: string) => {
    mockCheckAccess(path);
    if (mockFiles.has(path)) {
      return { exists: true, size: mockFiles.get(path)?.length ?? 0 };
    }
    // Un dossier existe dès qu'il contient au moins un fichier.
    const isDirectory =
      path.endsWith("/") && Array.from(mockFiles.keys()).some((file) => file.startsWith(path));
    return isDirectory ? { exists: true, isDirectory: true } : { exists: false };
  },
  readAsStringAsync: async (path: string) => {
    mockCheckAccess(path);
    const content = mockFiles.get(path);
    if (content === undefined) throw new Error(`ENOENT ${path}`);
    return content;
  },
  writeAsStringAsync: async (path: string, content: string) => {
    mockFiles.set(path, content);
  },
  moveAsync: async ({ from, to }: { from: string; to: string }) => {
    mockCheckAccess(to);
    const content = mockFiles.get(from);
    if (content === undefined) throw new Error(`ENOENT ${from}`);
    mockFiles.delete(from);
    mockFiles.set(to, content);
    if (to === "file:///doc/pending-uploads.json") mockEvents.push("queue-persist");
  },
  deleteAsync: async (path: string) => {
    mockFiles.delete(path);
  },
  readDirectoryAsync: async (dir: string) =>
    Array.from(mockFiles.keys())
      .filter((path) => path.startsWith(dir))
      .map((path) => path.slice(dir.length)),
}));

jest.mock("@/services/audio/recordings/recording-upload.service", () => ({
  uploadRecording: (input: UploadRecordingInput) => mockUploadRecording(input),
}));

jest.mock("@/services/audio/recordings/local-recording.service", () => ({
  getRecordingsDirectory: () => "file:///doc/recordings/",
  deleteRecordingRecovery: async (fileUri: string) => {
    mockEvents.push("recovery-delete");
    mockFiles.delete(`${fileUri}.recovery.json`);
  },
}));

jest.mock("@/services/network/connectivity.service", () => ({
  ensureConnectivityMonitoring: () => undefined,
  getIsOnline: () => mockConnectivity.online,
  isConnectivityInitialized: () => mockConnectivity.initialized,
  subscribeConnectivity: (listener: ConnectivityListener) => {
    mockConnectivity.listeners.add(listener);
    listener(mockConnectivity.online);
    return () => {
      mockConnectivity.listeners.delete(listener);
    };
  },
}));

type UploadQueueModule =
  typeof import("@/services/audio/recordings/upload-queue.service");

let service: UploadQueueModule;

// Simule un redémarrage de l'app : module neuf, mais le disque est conservé.
function restartApp(): void {
  jest.resetModules();
  service = jest.requireActual<UploadQueueModule>(
    "@/services/audio/recordings/upload-queue.service",
  );
}

function setOnline(isOnline: boolean): void {
  mockConnectivity.online = isOnline;
  mockConnectivity.listeners.forEach((listener) => listener(isOnline));
}

function recording(name: string): UploadRecordingInput {
  const fileUri = `${RECORDINGS_DIR}${name}.m4a`;
  mockFiles.set(fileUri, "audio");
  return { fileUri, roomName: `room-${name}`, durationMs: 60_000, fileSize: 5 };
}

function storedUpload(
  name: string,
  overrides: Partial<StoredUpload> = {},
): StoredUpload {
  return {
    ...recording(name),
    id: `id-${name}`,
    createdAt: Date.now(),
    retryCount: 0,
    ...overrides,
  };
}

function readQueueFile(): StoredUpload[] {
  const raw = mockFiles.get(QUEUE_FILE);
  if (raw === undefined) throw new Error("pending-uploads.json absent");
  return JSON.parse(raw) as StoredUpload[];
}

function writeRecovery(input: UploadRecordingInput): string {
  const recoveryPath = `${input.fileUri}.recovery.json`;
  mockFiles.set(
    recoveryPath,
    JSON.stringify({ roomName: input.roomName, durationMs: input.durationMs }),
  );
  return recoveryPath;
}

function uploadedRooms(): string[] {
  return mockUploadRecording.mock.calls.map(([input]) => input.roomName);
}

// Laisse les flush lancés en tâche de fond (`void flushUploadQueue()`) se terminer.
function settleBackgroundWork(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function enqueueOffline(input: UploadRecordingInput): Promise<void> {
  mockConnectivity.online = false;
  await service.enqueueUpload(input);
  mockConnectivity.online = true;
}

// Un upload que le test termine à la main, pour observer un flush en cours.
function blockNextUpload(): () => void {
  let release: () => void = () => undefined;
  mockUploadRecording.mockImplementationOnce(
    () => new Promise((resolve) => {
      release = () => resolve({});
    }),
  );
  return () => release();
}

// Attend que le flush en cours atteigne l'upload (chargement disque asynchrone).
async function waitForUploadCalls(count: number): Promise<void> {
  while (mockUploadRecording.mock.calls.length < count) {
    await Promise.resolve();
  }
}

describe("upload-queue.service", () => {
  beforeEach(() => {
    // Les timers de retry restent sous contrôle du test ; setImmediate reste
    // réel pour laisser se terminer le travail en tâche de fond.
    jest.useFakeTimers({ doNotFake: ["setImmediate"] });
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockFiles.clear();
    mockFailingPaths.clear();
    mockFailingOncePaths.clear();
    mockEvents.length = 0;
    mockConnectivity.online = false;
    mockConnectivity.initialized = true;
    mockConnectivity.listeners.clear();
    mockUploadRecording.mockResolvedValue({});
    restartApp();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("persistance", () => {
    it("écrit la file sur disque dès la mise en file (via fichier temporaire)", async () => {
      await service.enqueueUpload(recording("a"));

      const stored = readQueueFile();
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        fileUri: `${RECORDINGS_DIR}a.m4a`,
        roomName: "room-a",
        retryCount: 0,
      });
      expect(mockFiles.has(`${QUEUE_FILE}.tmp`)).toBe(false);
      expect(service.getUploadQueueCount()).toBe(1);
    });

    it("recharge la file après un redémarrage et l'envoie", async () => {
      await service.enqueueUpload(recording("a"));
      await service.enqueueUpload(recording("b"));

      restartApp();
      mockConnectivity.online = true;
      await service.flushUploadQueue();

      expect(uploadedRooms()).toEqual(["room-a", "room-b"]);
      expect(service.getUploadQueueCount()).toBe(0);
      expect(readQueueFile()).toEqual([]);
    });

    it("au rechargement, ignore les entrées invalides et celles dont l'audio a disparu", async () => {
      const valid = storedUpload("valid");
      const missingAudio = storedUpload("missing");
      mockFiles.delete(missingAudio.fileUri);
      mockFiles.set(
        QUEUE_FILE,
        JSON.stringify([valid, missingAudio, { id: "broken" }]),
      );

      restartApp();
      await service.flushUploadQueue();

      expect(service.getUploadQueueCount()).toBe(1);
    });

    it("au rechargement, un item marqué en échec par l'ancienne version est remis en circuit", async () => {
      // Même au-delà des 7 jours qui déclenchaient sa suppression avant.
      const legacyFailed = storedUpload("expired", {
        retryCount: 5,
        failedAt: Date.now() - 8 * DAY_MS,
        lastError: "S3 503",
      });
      mockFiles.set(QUEUE_FILE, JSON.stringify([legacyFailed]));
      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));

      restartApp();
      await service.flushUploadQueue();

      // Toujours en file, audio conservé, failedAt retiré.
      expect(service.getUploadQueueCount()).toBe(1);
      expect(mockFiles.has(legacyFailed.fileUri)).toBe(true);

      mockConnectivity.online = true;
      await service.flushUploadQueue();

      // Retenté avec une pause remise à zéro (1er échec → 30 s).
      expect(uploadedRooms()).toEqual(["room-expired"]);
      const [stored] = readQueueFile();
      expect(stored.failedAt).toBeUndefined();
      expect(stored.retryCount).toBe(1);
      expect(stored.nextAttemptAt).toBe(Date.now() + 30_000);

      await jest.advanceTimersByTimeAsync(30_000);
      expect(mockUploadRecording).toHaveBeenCalledTimes(2);
      expect(service.getUploadQueueCount()).toBe(0);
    });

    it("migre l'ancienne file stockée dans le cache vers le dossier documents", async () => {
      const legacy = storedUpload("legacy");
      mockFiles.set(LEGACY_QUEUE_FILE, JSON.stringify([legacy]));

      restartApp();
      await service.flushUploadQueue();

      expect(service.getUploadQueueCount()).toBe(1);
      expect(mockFiles.has(LEGACY_QUEUE_FILE)).toBe(false);
      expect(readQueueFile().map((item) => item.id)).toEqual(["id-legacy"]);
    });

    it("un fichier de file illisible est mis de côté (renommé), pas supprimé", async () => {
      mockFiles.set(QUEUE_FILE, "{pas du json");

      restartApp();
      await service.flushUploadQueue();

      expect(service.getUploadQueueCount()).toBe(0);
      expect(mockFiles.has(QUEUE_FILE)).toBe(false);
      const corruptFiles = Array.from(mockFiles.entries()).filter(([path]) =>
        /^file:\/\/\/doc\/pending-uploads\.corrupt-\d+\.json$/.test(path),
      );
      expect(corruptFiles).toEqual([[expect.any(String), "{pas du json"]]);
    });

    it("après un fichier illisible, les audios sont reconstruits via leurs .recovery.json", async () => {
      mockFiles.set(QUEUE_FILE, JSON.stringify({ pas: "un tableau" }));
      const audio = recording("orphan");
      mockFiles.set(
        `${audio.fileUri}.recovery.json`,
        JSON.stringify({ roomName: audio.roomName, durationMs: audio.durationMs }),
      );

      restartApp();
      await service.enableUploadQueueAutoSync();

      expect(service.getUploadQueueCount()).toBe(1);
      expect(readQueueFile().map((item) => item.roomName)).toEqual(["room-orphan"]);
    });
  });

  describe("retry", () => {
    it("un échec incrémente retryCount, garde l'élément et persiste l'erreur et la pause", async () => {
      await enqueueOffline(recording("a"));
      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));

      await service.flushUploadQueue();

      expect(service.getUploadQueueCount()).toBe(1);
      expect(readQueueFile()[0]).toMatchObject({
        retryCount: 1,
        lastError: "S3 503",
        nextAttemptAt: Date.now() + 30_000,
      });
    });

    it("un échec n'empêche pas l'envoi des éléments suivants", async () => {
      await enqueueOffline(recording("a"));
      await enqueueOffline(recording("b"));
      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));

      await service.flushUploadQueue();

      expect(mockUploadRecording).toHaveBeenCalledTimes(2);
      expect(readQueueFile().map((item) => item.roomName)).toEqual(["room-a"]);
    });

    it("un élément en pause est sauté par un flush, puis repris par le timer à l'échéance", async () => {
      await enqueueOffline(recording("a"));
      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));

      await service.flushUploadQueue();
      expect(mockUploadRecording).toHaveBeenCalledTimes(1);

      await service.flushUploadQueue();
      expect(mockUploadRecording).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(30_000);
      expect(mockUploadRecording).toHaveBeenCalledTimes(2);
      expect(service.getUploadQueueCount()).toBe(0);
    });

    it("le compteur de retry survit à un redémarrage", async () => {
      mockFiles.set(QUEUE_FILE, JSON.stringify([storedUpload("a", { retryCount: 4 })]));
      mockUploadRecording.mockRejectedValue(new Error("S3 503"));

      restartApp();
      mockConnectivity.online = true;
      await service.flushUploadQueue();

      expect(readQueueFile()[0]).toMatchObject({
        retryCount: 5,
        nextAttemptAt: Date.now() + 15 * MINUTE_MS,
      });
      expect(readQueueFile()[0].failedAt).toBeUndefined();
    });

    it("le retour du réseau remet les pauses à zéro et relance l'envoi", async () => {
      await service.enqueueUpload(recording("a"));
      await service.enableUploadQueueAutoSync();
      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));
      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));
      setOnline(true);
      await settleBackgroundWork();
      await jest.advanceTimersByTimeAsync(30_000);
      // 2 échecs : la prochaine pause serait de 1 min.
      expect(mockUploadRecording).toHaveBeenCalledTimes(2);

      setOnline(false);
      setOnline(true);
      await settleBackgroundWork();

      expect(mockUploadRecording).toHaveBeenCalledTimes(3);
      expect(service.getUploadQueueCount()).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe("jamais d'abandon", () => {
    it("échecs répétés : pauses croissantes plafonnées à 15 min, l'audio reste en file", async () => {
      await enqueueOffline(recording("a"));
      mockUploadRecording.mockRejectedValue(new Error("S3 503"));
      await service.flushUploadQueue();

      const expectedDelays = [
        30_000,
        MINUTE_MS,
        2 * MINUTE_MS,
        5 * MINUTE_MS,
        15 * MINUTE_MS,
        15 * MINUTE_MS,
        15 * MINUTE_MS,
      ];
      for (const [index, delay] of expectedDelays.entries()) {
        // Un seul timer de retry à la fois, jamais empilé.
        expect(jest.getTimerCount()).toBe(1);
        await jest.advanceTimersByTimeAsync(delay - 1);
        expect(mockUploadRecording).toHaveBeenCalledTimes(index + 1);
        await jest.advanceTimersByTimeAsync(1);
        expect(mockUploadRecording).toHaveBeenCalledTimes(index + 2);
      }

      expect(service.getUploadQueueCount()).toBe(1);
      expect(mockFiles.has(`${RECORDINGS_DIR}a.m4a`)).toBe(true);
      expect(readQueueFile()[0]).toMatchObject({ retryCount: expectedDelays.length + 1 });
      expect(readQueueFile()[0].failedAt).toBeUndefined();

      // Le jour où le serveur répond, l'audio part.
      mockUploadRecording.mockResolvedValue({});
      await jest.advanceTimersByTimeAsync(15 * MINUTE_MS);
      expect(service.getUploadQueueCount()).toBe(0);
    });

    it("un élément en pause ne bloque pas les autres", async () => {
      await enqueueOffline(recording("a"));
      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));
      await service.flushUploadQueue();

      await enqueueOffline(recording("b"));
      await service.flushUploadQueue();

      expect(uploadedRooms()).toEqual(["room-a", "room-b"]);
      expect(readQueueFile().map((item) => item.roomName)).toEqual(["room-a"]);
      expect(mockFiles.has(`${RECORDINGS_DIR}a.m4a`)).toBe(true);
    });

    it("plusieurs flush pendant une pause ne créent qu'un seul timer", async () => {
      await enqueueOffline(recording("a"));
      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));

      await service.flushUploadQueue();
      await service.flushUploadQueue();
      await service.flushUploadQueue();

      expect(jest.getTimerCount()).toBe(1);
    });
  });

  describe("conditions de flush", () => {
    it("ne flush pas hors ligne ni avant l'initialisation de la connectivité", async () => {
      await service.enqueueUpload(recording("a"));
      await service.flushUploadQueue();

      mockConnectivity.online = true;
      mockConnectivity.initialized = false;
      await service.flushUploadQueue();

      expect(mockUploadRecording).not.toHaveBeenCalled();
      expect(service.getUploadQueueCount()).toBe(1);
    });

    it("en ligne, la mise en file déclenche un envoi immédiat", async () => {
      mockConnectivity.online = true;
      await service.enqueueUpload(recording("a"));
      await settleBackgroundWork();

      expect(mockUploadRecording).toHaveBeenCalledTimes(1);
      expect(service.getUploadQueueCount()).toBe(0);
    });

    it("s'arrête si le réseau tombe en plein flush, le reste est conservé", async () => {
      await enqueueOffline(recording("a"));
      await enqueueOffline(recording("b"));
      mockUploadRecording.mockImplementationOnce(async () => {
        mockConnectivity.online = false;
        return {};
      });

      await service.flushUploadQueue();

      expect(mockUploadRecording).toHaveBeenCalledTimes(1);
      expect(readQueueFile().map((item) => item.roomName)).toEqual(["room-b"]);
    });

    it("le retour du réseau relance le flush une fois l'auto-sync activé", async () => {
      await service.enqueueUpload(recording("a"));
      await service.enableUploadQueueAutoSync();
      expect(mockUploadRecording).not.toHaveBeenCalled();

      setOnline(true);
      await settleBackgroundWork();

      expect(mockUploadRecording).toHaveBeenCalledTimes(1);
      expect(service.getUploadQueueCount()).toBe(0);
    });
  });

  describe("un seul envoi par audio (double flush)", () => {
    it("deux flush simultanés au démarrage n'envoient l'audio qu'une fois", async () => {
      mockFiles.set(QUEUE_FILE, JSON.stringify([storedUpload("a")]));
      restartApp();
      mockConnectivity.online = true;

      const first = service.flushUploadQueue();
      const second = service.flushUploadQueue();
      expect(second).toBe(first);
      await Promise.all([first, second]);

      expect(mockUploadRecording).toHaveBeenCalledTimes(1);
      expect(service.getUploadQueueCount()).toBe(0);
    });

    it("activation de l'auto-sync déjà en ligne avec 1 audio en attente : 1 seul envoi", async () => {
      mockFiles.set(QUEUE_FILE, JSON.stringify([storedUpload("a")]));
      restartApp();
      mockConnectivity.online = true;

      await service.enableUploadQueueAutoSync();
      await service.flushUploadQueue();
      await settleBackgroundWork();

      expect(mockUploadRecording).toHaveBeenCalledTimes(1);
      expect(service.getUploadQueueCount()).toBe(0);
    });

    it("un second flush pendant un upload en cours n'envoie rien de plus", async () => {
      await enqueueOffline(recording("a"));
      const release = blockNextUpload();

      const first = service.flushUploadQueue();
      await waitForUploadCalls(1);
      const second = service.flushUploadQueue();
      release();
      await Promise.all([first, second]);

      expect(mockUploadRecording).toHaveBeenCalledTimes(1);
      expect(service.getUploadQueueCount()).toBe(0);
    });

    it("un audio mis en file pendant un flush part au tour de relance", async () => {
      await enqueueOffline(recording("a"));
      const release = blockNextUpload();

      const first = service.flushUploadQueue();
      await waitForUploadCalls(1);
      // En ligne : la mise en file demande un flush, qui relance un tour.
      await service.enqueueUpload(recording("b"));
      release();
      await first;

      expect(uploadedRooms()).toEqual(["room-a", "room-b"]);
      expect(service.getUploadQueueCount()).toBe(0);
    });
  });

  describe("chargement raté : jamais d'écrasement de la file sur disque", () => {
    it("une erreur disque au chargement laisse le fichier intact (enable, flush)", async () => {
      const onDisk = JSON.stringify([storedUpload("a")]);
      mockFiles.set(QUEUE_FILE, onDisk);
      mockFailingPaths.add(QUEUE_FILE);

      restartApp();
      await service.enableUploadQueueAutoSync();
      mockConnectivity.online = true;
      await service.flushUploadQueue();

      mockFailingPaths.clear();
      expect(mockFiles.get(QUEUE_FILE)).toBe(onDisk);
      expect(service.getUploadQueueCount()).toBe(0);
    });

    it("une erreur en cours de lecture ne laisse pas de file partielle en mémoire", async () => {
      const a = storedUpload("a");
      const b = storedUpload("b");
      const onDisk = JSON.stringify([a, b]);
      mockFiles.set(QUEUE_FILE, onDisk);
      mockFailingPaths.add(b.fileUri);

      restartApp();
      await service.flushUploadQueue();
      expect(service.getUploadQueueCount()).toBe(0);
      expect(mockFiles.get(QUEUE_FILE)).toBe(onDisk);

      // Le disque redevient lisible : la file complète est rechargée.
      mockFailingPaths.clear();
      await service.flushUploadQueue();
      expect(service.getUploadQueueCount()).toBe(2);
    });

    it("mise en file pendant un chargement raté : l'item reste en mémoire, l'appelant est prévenu", async () => {
      const onDisk = JSON.stringify([storedUpload("a")]);
      mockFiles.set(QUEUE_FILE, onDisk);
      mockFailingPaths.add(QUEUE_FILE);

      restartApp();
      const input = recording("b");
      const recoveryPath = writeRecovery(input);
      await expect(service.enqueueUpload(input)).rejects.toThrow();

      expect(service.getUploadQueueCount()).toBe(1);
      mockFailingPaths.clear();
      expect(mockFiles.get(QUEUE_FILE)).toBe(onDisk);
      expect(mockFiles.has(recoveryPath)).toBe(true);

      // Au chargement suivant, les deux files sont fusionnées (disque en tête).
      await service.flushUploadQueue();
      expect(readQueueFile().map((item) => item.roomName)).toEqual(["room-a", "room-b"]);
    });

    it("la mise en file retente le chargement avant d'abandonner", async () => {
      mockFiles.set(QUEUE_FILE, JSON.stringify([storedUpload("a")]));
      // Erreur passagère : le premier chargement échoue, le second réussit.
      mockFailingOncePaths.add(QUEUE_FILE);

      restartApp();
      await service.enqueueUpload(recording("b"));

      expect(readQueueFile().map((item) => item.roomName)).toEqual(["room-a", "room-b"]);
    });

    it("un fichier illisible qui ne peut pas être mis de côté n'est pas écrasé", async () => {
      mockFiles.set(QUEUE_FILE, "{pas du json");
      mockFailingPaths.add(`${DOC_DIR}pending-uploads.corrupt-${Date.now()}.json`);

      restartApp();
      await expect(service.enqueueUpload(recording("b"))).rejects.toThrow();

      expect(mockFiles.get(QUEUE_FILE)).toBe("{pas du json");
      expect(service.getUploadQueueCount()).toBe(1);
    });
  });

  describe("écritures du fichier de file", () => {
    it("deux mises en file simultanées sont toutes deux écrites, sans conflit sur le .tmp", async () => {
      await Promise.all([
        service.enqueueUpload(recording("a")),
        service.enqueueUpload(recording("b")),
      ]);

      expect(readQueueFile().map((item) => item.roomName)).toEqual(["room-a", "room-b"]);
      expect(mockFiles.has(`${QUEUE_FILE}.tmp`)).toBe(false);
    });

    it("la mise en file rejette si la file n'a pas pu être écrite", async () => {
      mockFailingPaths.add(QUEUE_FILE);

      await expect(service.enqueueUpload(recording("a"))).rejects.toThrow();
      expect(service.getUploadQueueCount()).toBe(1);
    });

    it("la file est persistée après chaque envoi réussi, pas seulement en fin de tour", async () => {
      await enqueueOffline(recording("a"));
      await enqueueOffline(recording("b"));
      mockUploadRecording.mockResolvedValueOnce({});
      const release = blockNextUpload();

      const flush = service.flushUploadQueue();
      await waitForUploadCalls(2);
      // « a » est parti, « b » en cours : un arrêt brutal ici ne renverrait pas « a ».
      expect(readQueueFile().map((item) => item.roomName)).toEqual(["room-b"]);

      release();
      await flush;
      expect(readQueueFile()).toEqual([]);
    });
  });

  describe("fichiers de récupération (.recovery.json)", () => {
    it("conservé après la mise en file, supprimé une fois l'envoi confirmé", async () => {
      const input = recording("a");
      const recoveryPath = writeRecovery(input);

      await enqueueOffline(input);
      expect(mockFiles.has(recoveryPath)).toBe(true);

      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));
      await service.flushUploadQueue();
      expect(mockFiles.has(recoveryPath)).toBe(true);

      await jest.advanceTimersByTimeAsync(30_000);
      expect(service.getUploadQueueCount()).toBe(0);
      expect(mockFiles.has(recoveryPath)).toBe(false);
    });

    it("le .recovery.json est supprimé avant que la file ne soit réécrite", async () => {
      const input = recording("a");
      writeRecovery(input);
      await enqueueOffline(input);
      mockEvents.length = 0;

      await service.flushUploadQueue();

      // Un arrêt entre les deux ne peut pas reconstruire un audio déjà envoyé.
      expect(mockEvents[0]).toBe("recovery-delete");
      expect(mockEvents).toContain("queue-persist");
    });

    it("au démarrage, un audio déjà en file garde son .recovery.json et n'est pas dupliqué", async () => {
      const input = recording("a");
      const recoveryPath = writeRecovery(input);
      await service.enqueueUpload(input);

      restartApp();
      await service.enableUploadQueueAutoSync();

      expect(service.getUploadQueueCount()).toBe(1);
      expect(mockFiles.has(recoveryPath)).toBe(true);
    });

    it("file perdue : l'audio est reconstruit depuis son .recovery.json", async () => {
      const input = recording("a");
      writeRecovery(input);
      await service.enqueueUpload(input);
      mockFiles.delete(QUEUE_FILE);

      restartApp();
      await service.enableUploadQueueAutoSync();

      expect(readQueueFile().map((item) => item.fileUri)).toEqual([input.fileUri]);
    });

    it("récupération au démarrage et mise en file simultanées : un seul item par audio", async () => {
      const input = recording("a");
      writeRecovery(input);

      restartApp();
      await Promise.all([service.enableUploadQueueAutoSync(), service.enqueueUpload(input)]);

      expect(service.getUploadQueueCount()).toBe(1);
      expect(readQueueFile()).toHaveLength(1);
    });
  });

  describe("audio disparu", () => {
    it("un item dont l'audio n'existe plus est retiré au lieu d'être retenté sans fin", async () => {
      const input = recording("a");
      await enqueueOffline(input);
      mockFiles.delete(input.fileUri);

      await service.flushUploadQueue();

      expect(mockUploadRecording).not.toHaveBeenCalled();
      expect(service.getUploadQueueCount()).toBe(0);
      expect(readQueueFile()).toEqual([]);
    });
  });

  describe("abonnés", () => {
    it("reçoivent le compte courant puis ses évolutions", async () => {
      const counts: number[] = [];
      service.subscribeUploadQueue((count) => counts.push(count));

      await enqueueOffline(recording("a"));
      await service.flushUploadQueue();

      expect(counts).toEqual([0, 1, 0]);
    });
  });
});
