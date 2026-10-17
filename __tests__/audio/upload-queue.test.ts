/**
 * Garanties sur la file d'upload des enregistrements audio.
 *
 * Un enregistrement de prospection n'existe que sur le téléphone tant qu'il
 * n'est pas envoyé : la file doit survivre à un redémarrage de l'app (fichier
 * JSON sur disque), retenter les échecs et abandonner après MAX_RETRIES = 5.
 * Ces tests figent le comportement ACTUEL du service.
 */

import type { UploadRecordingInput } from "@/services/audio/recordings/recording-upload.service";

type ConnectivityListener = (isOnline: boolean) => void;

type StoredUpload = UploadRecordingInput & {
  id: string;
  createdAt: number;
  retryCount: number;
  failedAt?: number;
  lastError?: string;
};

const DOC_DIR = "file:///doc/";
const CACHE_DIR = "file:///cache/";
const QUEUE_FILE = `${DOC_DIR}pending-uploads.json`;
const LEGACY_QUEUE_FILE = `${CACHE_DIR}pending-uploads.json`;
const RECORDINGS_DIR = `${DOC_DIR}recordings/`;
const DAY_MS = 24 * 60 * 60 * 1000;

// Système de fichiers en mémoire : chemin → contenu.
const mockFiles = new Map<string, string>();
const mockUploadRecording = jest.fn<Promise<unknown>, [UploadRecordingInput]>();
const mockConnectivity = {
  online: false,
  initialized: true,
  listeners: new Set<ConnectivityListener>(),
};

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///doc/",
  cacheDirectory: "file:///cache/",
  getInfoAsync: async (path: string) =>
    mockFiles.has(path)
      ? { exists: true, size: mockFiles.get(path)?.length ?? 0 }
      : { exists: false },
  readAsStringAsync: async (path: string) => {
    const content = mockFiles.get(path);
    if (content === undefined) throw new Error(`ENOENT ${path}`);
    return content;
  },
  writeAsStringAsync: async (path: string, content: string) => {
    mockFiles.set(path, content);
  },
  moveAsync: async ({ from, to }: { from: string; to: string }) => {
    const content = mockFiles.get(from);
    if (content === undefined) throw new Error(`ENOENT ${from}`);
    mockFiles.delete(from);
    mockFiles.set(to, content);
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

// Laisse les flush lancés en tâche de fond (`void flushUploadQueue()`) se terminer.
function settleBackgroundWork(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function enqueueOffline(input: UploadRecordingInput): Promise<void> {
  mockConnectivity.online = false;
  await service.enqueueUpload(input);
  mockConnectivity.online = true;
}

describe("upload-queue.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockFiles.clear();
    mockConnectivity.online = false;
    mockConnectivity.initialized = true;
    mockConnectivity.listeners.clear();
    mockUploadRecording.mockResolvedValue({});
    restartApp();
  });

  afterEach(() => {
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

      expect(mockUploadRecording.mock.calls.map(([input]) => input.roomName)).toEqual([
        "room-a",
        "room-b",
      ]);
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

    it("au rechargement, supprime les échecs définitifs de plus de 7 jours et leur audio", async () => {
      const expired = storedUpload("expired", {
        retryCount: 5,
        failedAt: Date.now() - 8 * DAY_MS,
      });
      mockFiles.set(QUEUE_FILE, JSON.stringify([expired]));

      restartApp();
      await service.flushUploadQueue();

      expect(service.getUploadQueueCount()).toBe(0);
      expect(mockFiles.has(expired.fileUri)).toBe(false);
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

    it("un fichier de file illisible est supprimé : la file repart vide", async () => {
      mockFiles.set(QUEUE_FILE, "{pas du json");

      restartApp();
      await service.flushUploadQueue();

      expect(service.getUploadQueueCount()).toBe(0);
      expect(mockFiles.has(QUEUE_FILE)).toBe(false);
    });
  });

  describe("retry", () => {
    it("un échec incrémente retryCount, garde l'élément et persiste l'erreur", async () => {
      await enqueueOffline(recording("a"));
      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));

      await service.flushUploadQueue();

      expect(service.getUploadQueueCount()).toBe(1);
      expect(readQueueFile()[0]).toMatchObject({ retryCount: 1, lastError: "S3 503" });
      expect(readQueueFile()[0].failedAt).toBeUndefined();
    });

    it("un échec n'empêche pas l'envoi des éléments suivants", async () => {
      await enqueueOffline(recording("a"));
      await enqueueOffline(recording("b"));
      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));

      await service.flushUploadQueue();

      expect(mockUploadRecording).toHaveBeenCalledTimes(2);
      expect(readQueueFile().map((item) => item.roomName)).toEqual(["room-a"]);
    });

    it("un seul essai par élément et par flush : le retry attend le flush suivant", async () => {
      await enqueueOffline(recording("a"));
      mockUploadRecording.mockRejectedValueOnce(new Error("S3 503"));

      await service.flushUploadQueue();
      expect(mockUploadRecording).toHaveBeenCalledTimes(1);

      await service.flushUploadQueue();
      expect(mockUploadRecording).toHaveBeenCalledTimes(2);
      expect(service.getUploadQueueCount()).toBe(0);
    });

    it("le compteur de retry survit à un redémarrage", async () => {
      mockFiles.set(QUEUE_FILE, JSON.stringify([storedUpload("a", { retryCount: 4 })]));
      mockUploadRecording.mockRejectedValue(new Error("S3 503"));

      restartApp();
      mockConnectivity.online = true;
      await service.flushUploadQueue();

      expect(readQueueFile()[0].retryCount).toBe(5);
      expect(readQueueFile()[0].failedAt).toEqual(expect.any(Number));
    });
  });

  describe("MAX_RETRIES = 5", () => {
    it("après 5 échecs, l'élément est marqué en échec et n'est plus retenté", async () => {
      await enqueueOffline(recording("a"));
      mockUploadRecording.mockRejectedValue(new Error("S3 503"));

      for (let attempt = 1; attempt <= 4; attempt += 1) {
        await service.flushUploadQueue();
        expect(readQueueFile()[0]).toMatchObject({ retryCount: attempt });
        expect(readQueueFile()[0].failedAt).toBeUndefined();
      }

      await service.flushUploadQueue();
      expect(readQueueFile()[0]).toMatchObject({ retryCount: 5 });
      expect(readQueueFile()[0].failedAt).toEqual(expect.any(Number));

      await service.flushUploadQueue();
      expect(mockUploadRecording).toHaveBeenCalledTimes(5);
    });

    it("l'élément en échec reste en file (compté) et sur disque, sans bloquer les autres", async () => {
      await enqueueOffline(recording("a"));
      mockUploadRecording.mockRejectedValue(new Error("S3 503"));
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await service.flushUploadQueue();
      }

      mockUploadRecording.mockResolvedValue({});
      await enqueueOffline(recording("b"));
      await service.flushUploadQueue();

      expect(mockUploadRecording.mock.calls.at(-1)?.[0].roomName).toBe("room-b");
      expect(service.getUploadQueueCount()).toBe(1);
      expect(mockFiles.has(`${RECORDINGS_DIR}a.m4a`)).toBe(true);
      expect(readQueueFile().map((item) => item.roomName)).toEqual(["room-a"]);
    });

    it("un échec définitif rechargé avant 7 jours n'est toujours pas retenté", async () => {
      mockFiles.set(
        QUEUE_FILE,
        JSON.stringify([
          storedUpload("a", { retryCount: 5, failedAt: Date.now() - DAY_MS }),
        ]),
      );

      restartApp();
      mockConnectivity.online = true;
      await service.flushUploadQueue();

      expect(service.getUploadQueueCount()).toBe(1);
      expect(mockUploadRecording).not.toHaveBeenCalled();
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

    it("un second flush pendant le premier est ignoré", async () => {
      await enqueueOffline(recording("a"));
      let release: () => void = () => undefined;
      mockUploadRecording.mockImplementationOnce(
        () => new Promise((resolve) => {
          release = () => resolve({});
        }),
      );

      const first = service.flushUploadQueue();
      // Laisse le premier flush atteindre l'upload (chargement disque asynchrone).
      while (mockUploadRecording.mock.calls.length === 0) {
        await Promise.resolve();
      }
      await service.flushUploadQueue();
      release();
      await first;

      expect(mockUploadRecording).toHaveBeenCalledTimes(1);
      expect(service.getUploadQueueCount()).toBe(0);
    });

    it("le retour du réseau relance le flush une fois l'auto-sync activé", async () => {
      await service.enqueueUpload(recording("a"));
      await service.enableUploadQueueAutoSync();
      expect(mockUploadRecording).not.toHaveBeenCalled();

      mockConnectivity.online = true;
      mockConnectivity.listeners.forEach((listener) => listener(true));
      await settleBackgroundWork();

      expect(mockUploadRecording).toHaveBeenCalledTimes(1);
      expect(service.getUploadQueueCount()).toBe(0);
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
