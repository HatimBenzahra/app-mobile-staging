import * as FileSystem from "expo-file-system/legacy";
import {
  ensureConnectivityMonitoring,
  getIsOnline,
  isConnectivityInitialized,
  subscribeConnectivity,
} from "@/services/network/connectivity.service";
import { getRetryDelayMs } from "@/services/offline/retry-schedule";
import { deleteRecordingRecovery, getRecordingsDirectory } from "./local-recording.service";
import type { UploadRecordingInput } from "./recording-upload.service";
import { uploadRecording } from "./recording-upload.service";

// Un audio non envoyé n'est jamais abandonné : retryCount ne sert qu'à
// calculer la pause avant le prochain essai (nextAttemptAt).
type PendingUpload = UploadRecordingInput & {
  id: string;
  createdAt: number;
  retryCount: number;
  nextAttemptAt?: number;
  lastError?: string;
};

// Format stocké : les anciennes versions marquaient `failedAt` après 5 échecs
// et n'y touchaient plus. Ces items sont remis en circuit au chargement.
type StoredPendingUpload = PendingUpload & { failedAt?: number };

type QueueListener = (count: number) => void;

const STORAGE_DIRECTORY = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
const QUEUE_FILE = STORAGE_DIRECTORY ? `${STORAGE_DIRECTORY}pending-uploads.json` : null;
const QUEUE_FILE_TMP = STORAGE_DIRECTORY ? `${STORAGE_DIRECTORY}pending-uploads.json.tmp` : null;
const LEGACY_QUEUE_FILE =
  FileSystem.cacheDirectory &&
  STORAGE_DIRECTORY &&
  STORAGE_DIRECTORY !== FileSystem.cacheDirectory
    ? `${FileSystem.cacheDirectory}pending-uploads.json`
    : null;

const queue = new Map<string, PendingUpload>();
const listeners = new Set<QueueListener>();
let autoSyncEnabled = false;
// Flush en cours, partagé par les appels concurrents. Posé de façon synchrone
// pour qu'aucun second flush ne démarre pendant un `await` du premier.
let flushPromise: Promise<void> | null = null;
// Une demande arrivée pendant un flush relance un tour à la fin de celui-ci.
let flushRequested = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
// Vrai seulement quand la file sur disque a été entièrement relue : tant que ce
// n'est pas le cas, on n'écrit jamais le fichier (on écraserait des audios en attente).
let loaded = false;
let loadingPromise: Promise<void> | null = null;
// Écritures du fichier de file chaînées : jamais deux en parallèle sur le même `.tmp`.
let persistChain: Promise<boolean> = Promise.resolve(true);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function notifyListeners(): void {
  const count = queue.size;
  listeners.forEach((l) => l(count));
}

async function writeQueueFile(): Promise<boolean> {
  if (!QUEUE_FILE || !QUEUE_FILE_TMP) {
    if (__DEV__) console.warn("[UploadQueue] No writable directory available to persist queue");
    return false;
  }
  if (!loaded) {
    if (__DEV__) console.warn("[UploadQueue] Queue not loaded from disk, persist skipped");
    return false;
  }

  try {
    // État relu au moment de l'écriture : la dernière écriture de la chaîne
    // reflète toujours la file la plus récente.
    const data = JSON.stringify(Array.from(queue.values()));
    await FileSystem.writeAsStringAsync(QUEUE_FILE_TMP, data);
    await FileSystem.moveAsync({
      from: QUEUE_FILE_TMP,
      to: QUEUE_FILE,
    });
    if (__DEV__) console.log("[UploadQueue] Persisted", queue.size, "item(s) to disk");
    return true;
  } catch (err) {
    if (__DEV__) console.warn("[UploadQueue] persist failed:", err);
    return false;
  }
}

// Renvoie false si la file n'a pas pu être écrite (jamais de rejet).
function persist(): Promise<boolean> {
  persistChain = persistChain.then(writeQueueFile);
  return persistChain;
}

// Ajoute un item sauf si son audio est déjà en file (un seul envoi par fichier).
function addToQueue(item: PendingUpload): boolean {
  for (const existing of queue.values()) {
    if (existing.fileUri === item.fileUri) return false;
  }
  queue.set(item.id, item);
  return true;
}

function isStoredPendingUpload(item: unknown): item is StoredPendingUpload {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<StoredPendingUpload>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.fileUri === "string" &&
    typeof candidate.roomName === "string" &&
    typeof candidate.durationMs === "number" &&
    typeof candidate.fileSize === "number" &&
    typeof candidate.createdAt === "number" &&
    typeof candidate.retryCount === "number"
  );
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err ?? "Unknown error");
}

function parseQueueFile(raw: string): unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Renvoie true si le fichier illisible a bien été mis de côté.
async function quarantineCorruptQueueFile(path: string): Promise<boolean> {
  if (!STORAGE_DIRECTORY) return false;
  const corruptPath = `${STORAGE_DIRECTORY}pending-uploads.corrupt-${Date.now()}.json`;
  try {
    await FileSystem.moveAsync({ from: path, to: corruptPath });
    if (__DEV__) console.warn("[UploadQueue] Unreadable queue file moved to:", corruptPath);
    return true;
  } catch (err) {
    if (__DEV__) console.warn("[UploadQueue] Failed to move unreadable queue file:", err);
    return false;
  }
}

// Intègre les items relus du disque, en tête : ils sont plus anciens que ceux
// mis en file en mémoire pendant un chargement raté.
function commitLoadedItems(restored: PendingUpload[]): void {
  const inMemory = Array.from(queue.values());
  queue.clear();
  for (const item of [...restored, ...inMemory]) {
    addToQueue(item);
  }
}

async function loadFromDisk(): Promise<void> {
  if (loaded) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    if (!QUEUE_FILE) {
      loaded = true;
      if (__DEV__) console.warn("[UploadQueue] No writable directory available to load queue");
      return;
    }

    if (__DEV__) console.log("[UploadQueue] Loading from disk...");

    let queueFileToRead = QUEUE_FILE;
    let migrateLegacyQueue = false;

    try {
      const info = await FileSystem.getInfoAsync(queueFileToRead);
      if (!info.exists && LEGACY_QUEUE_FILE) {
        const legacyInfo = await FileSystem.getInfoAsync(LEGACY_QUEUE_FILE);
        if (legacyInfo.exists) {
          queueFileToRead = LEGACY_QUEUE_FILE;
          migrateLegacyQueue = true;
          if (__DEV__) {
            console.log("[UploadQueue] Using legacy queue file for migration:", LEGACY_QUEUE_FILE);
          }
        }
      }

      const fileToReadInfo = await FileSystem.getInfoAsync(queueFileToRead);
      if (!fileToReadInfo.exists) {
        loaded = true;
        if (__DEV__) console.log("[UploadQueue] No queue file on disk");
        return;
      }

      const raw = await FileSystem.readAsStringAsync(queueFileToRead);
      const parsedItems = parseQueueFile(raw);
      if (!parsedItems) {
        // Fichier illisible : on le met de côté au lieu de le supprimer. Les
        // audios encore présents sont reconstruits via leurs `.recovery.json`.
        // S'il n'a pas pu être déplacé, on ne l'écrasera pas : nouvel essai plus tard.
        loaded = await quarantineCorruptQueueFile(queueFileToRead);
        return;
      }

      if (__DEV__) console.log("[UploadQueue] Found", parsedItems.length, "item(s) on disk");

      // Items relus d'abord à part : une erreur en cours de lecture ne laisse
      // jamais une file partielle en mémoire.
      const restored: PendingUpload[] = [];
      for (const rawItem of parsedItems) {
        if (!isStoredPendingUpload(rawItem)) {
          if (__DEV__) console.warn("[UploadQueue] Invalid queue item skipped");
          continue;
        }

        const { failedAt, ...stored } = rawItem;
        const revived = failedAt !== undefined;
        if (revived && __DEV__) console.log("[UploadQueue] Reviving failed item:", stored.id);

        const item: PendingUpload = {
          ...stored,
          retryCount: revived ? 0 : Math.max(0, stored.retryCount),
          nextAttemptAt:
            !revived && typeof stored.nextAttemptAt === "number" ? stored.nextAttemptAt : undefined,
        };

        const fileInfo = await FileSystem.getInfoAsync(item.fileUri);
        if (!fileInfo.exists) {
          if (__DEV__) console.warn("[UploadQueue] File missing, skipping:", item.fileUri);
          continue;
        }

        restored.push(item);
        if (__DEV__) console.log("[UploadQueue] Restored:", item.id, "file:", item.fileUri);
      }

      // Items mis en file en mémoire pendant un chargement raté : à écrire
      // maintenant que la file sur disque est intégrée.
      const hasUnpersistedItems = queue.size > 0;
      commitLoadedItems(restored);
      loaded = true;

      if (migrateLegacyQueue || hasUnpersistedItems) {
        const persisted = await persist();
        if (migrateLegacyQueue && persisted) {
          await FileSystem.deleteAsync(queueFileToRead, { idempotent: true }).catch(() => void 0);
          if (__DEV__) {
            console.log("[UploadQueue] Legacy queue migrated to:", QUEUE_FILE);
          }
        }
      }

      if (__DEV__) console.log("[UploadQueue] Loaded", queue.size, "valid item(s)");
      notifyListeners();
    } catch (err) {
      // Erreur d'accès disque : le fichier est conservé, la file en mémoire
      // n'est pas touchée, nouvel essai au prochain appel.
      if (__DEV__) console.warn("[UploadQueue] loadFromDisk failed:", err);
      loaded = false;
    } finally {
      loadingPromise = null;
    }
  })();

  await loadingPromise;
}

async function recoverOrphanedRecordings(): Promise<void> {
  try {
    const dir = getRecordingsDirectory();
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) return;

    const files = await FileSystem.readDirectoryAsync(dir);
    const recoveryFiles = files.filter((f) => f.endsWith(".recovery.json"));

    for (const recoveryFile of recoveryFiles) {
      const recoveryPath = `${dir}${recoveryFile}`;
      const audioPath = recoveryPath.replace(".recovery.json", "");

      const audioInfo = await FileSystem.getInfoAsync(audioPath);
      if (!audioInfo.exists || !audioInfo.size) {
        await FileSystem.deleteAsync(recoveryPath, { idempotent: true }).catch(() => void 0);
        continue;
      }

      // Le `.recovery.json` est conservé jusqu'à l'envoi confirmé de l'audio.
      const alreadyQueued = Array.from(queue.values()).some((item) => item.fileUri === audioPath);
      if (alreadyQueued) {
        continue;
      }

      try {
        const raw = await FileSystem.readAsStringAsync(recoveryPath);
        const meta = JSON.parse(raw) as Record<string, unknown>;

        if (typeof meta.roomName !== "string" || typeof meta.durationMs !== "number") {
          await FileSystem.deleteAsync(recoveryPath, { idempotent: true }).catch(() => void 0);
          continue;
        }

        const audioSize = audioInfo.exists && audioInfo.size ? audioInfo.size : 0;

        const pending: PendingUpload = {
          fileUri: audioPath,
          roomName: meta.roomName as string,
          durationMs: meta.durationMs as number,
          fileSize: typeof meta.fileSize === "number" ? meta.fileSize : audioSize,
          immeubleId: typeof meta.immeubleId === "number" ? meta.immeubleId : undefined,
          participantIdentity: typeof meta.participantIdentity === "string" ? meta.participantIdentity : undefined,
          id: generateId(),
          createdAt: Date.now(),
          retryCount: 0,
        };

        // Nouveau contrôle au moment d'ajouter : une mise en file a pu arriver
        // pendant la lecture du fichier de récupération.
        if (addToQueue(pending) && __DEV__) {
          console.log("[UploadQueue] Recovered orphaned recording:", audioPath);
        }
      } catch (parseErr) {
        if (__DEV__) console.warn("[UploadQueue] Failed to parse recovery file:", recoveryPath, parseErr);
        await FileSystem.deleteAsync(recoveryPath, { idempotent: true }).catch(() => void 0);
      }
    }
  } catch (err) {
    if (__DEV__) console.warn("[UploadQueue] recoverOrphanedRecordings failed:", err);
  }
}

export function subscribeUploadQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  listener(queue.size);
  return () => {
    listeners.delete(listener);
  };
}

export function getUploadQueueCount(): number {
  return queue.size;
}

/**
 * Met un audio en file. Rejette si la file n'a pas pu être écrite sur disque :
 * l'item reste alors en mémoire (il sera envoyé) et l'appelant conserve le
 * `.recovery.json`, qui permet de le reconstruire après un redémarrage.
 */
export async function enqueueUpload(input: UploadRecordingInput): Promise<void> {
  if (__DEV__) console.log("[UploadQueue] Enqueueing upload. file:", input.fileUri, "room:", input.roomName);
  ensureConnectivityMonitoring();
  await loadFromDisk();
  if (!loaded) {
    await loadFromDisk();
  }

  const pending: PendingUpload = {
    ...input,
    id: generateId(),
    createdAt: Date.now(),
    retryCount: 0,
  };

  if (!addToQueue(pending) && __DEV__) {
    console.log("[UploadQueue] Already queued:", input.fileUri);
  }
  const persisted = await persist();
  notifyListeners();

  if (__DEV__) console.log("[UploadQueue] Enqueued:", pending.id, "queue size:", queue.size);

  if (isConnectivityInitialized() && getIsOnline()) {
    if (__DEV__) console.log("[UploadQueue] Online after enqueue, attempting immediate flush");
    void flushUploadQueue();
  }

  if (!persisted) {
    throw new Error("Upload queue could not be persisted to disk");
  }
}

async function processOne(item: PendingUpload): Promise<boolean> {
  if (__DEV__) console.log("[UploadQueue] Processing:", item.id, "attempt:", item.retryCount + 1);
  try {
    await uploadRecording(item);
    item.lastError = undefined;
    if (__DEV__) console.log("[UploadQueue] Success:", item.id);
    return true;
  } catch (err) {
    item.retryCount += 1;
    item.lastError = getErrorMessage(err);
    item.nextAttemptAt = Date.now() + getRetryDelayMs(item.retryCount);
    if (__DEV__) {
      console.warn(
        "[UploadQueue] Failed:",
        item.id,
        "attempt:",
        item.retryCount,
        "next attempt in:",
        getRetryDelayMs(item.retryCount),
        "ms, error:",
        item.lastError,
      );
    }
    return false;
  }
}

function clearRetryTimer(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

// Programme un seul timer, à l'échéance de la plus proche pause en cours.
function scheduleRetry(): void {
  clearRetryTimer();

  let nextAttemptAt: number | null = null;
  for (const item of queue.values()) {
    if (item.nextAttemptAt !== undefined && (nextAttemptAt === null || item.nextAttemptAt < nextAttemptAt)) {
      nextAttemptAt = item.nextAttemptAt;
    }
  }
  if (nextAttemptAt === null) return;

  const delayMs = Math.max(0, nextAttemptAt - Date.now());
  if (__DEV__) console.log("[UploadQueue] Next retry in", delayMs, "ms");
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushUploadQueue();
  }, delayMs);
}

// Retour du réseau : les pauses repartent à zéro, tout est retenté tout de suite.
function resetBackoff(): void {
  clearRetryTimer();
  for (const item of queue.values()) {
    item.retryCount = 0;
    item.nextAttemptAt = undefined;
  }
}

// Dans le doute (erreur d'accès disque), l'audio est considéré présent : on tente l'envoi.
async function isAudioMissing(fileUri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    return !info.exists;
  } catch {
    return false;
  }
}

// Retire l'item terminé et persiste aussitôt : un arrêt brutal de l'app juste
// après ne provoque pas de second envoi. Le `.recovery.json` est supprimé en
// premier : s'il survivait à un arrêt avant l'écriture de la file, il
// reconstruirait un audio déjà envoyé.
async function removeUploaded(entry: PendingUpload): Promise<void> {
  await deleteRecordingRecovery(entry.fileUri);
  queue.delete(entry.id);
  notifyListeners();
  await persist();
}

async function flushOnce(): Promise<void> {
  ensureConnectivityMonitoring();
  await loadFromDisk();

  if (__DEV__) {
    console.log(
      "[UploadQueue] flush called. online:",
      getIsOnline(),
      "ready:",
      isConnectivityInitialized(),
      "queueSize:",
      queue.size,
    );
  }

  if (!isConnectivityInitialized() || !getIsOnline() || queue.size === 0) {
    return;
  }

  if (__DEV__) console.log("[UploadQueue] Flushing", queue.size, "item(s)...");

  const entries = Array.from(queue.values());

  for (const entry of entries) {
    if (!getIsOnline()) {
      if (__DEV__) console.log("[UploadQueue] Lost connection, stopping flush");
      break;
    }

    // Item en pause après un échec : le timer de retry le reprendra à l'échéance.
    if (entry.nextAttemptAt !== undefined && entry.nextAttemptAt > Date.now()) {
      continue;
    }

    // Audio disparu du téléphone : plus rien à envoyer, inutile de réessayer.
    if (await isAudioMissing(entry.fileUri)) {
      if (__DEV__) console.warn("[UploadQueue] Audio file missing, dropping:", entry.id, entry.fileUri);
      await removeUploaded(entry);
      continue;
    }

    const success = await processOne(entry);

    if (success) {
      await removeUploaded(entry);
    }
  }

  await persist();
  scheduleRetry();
  if (__DEV__) console.log("[UploadQueue] Flush done. Remaining:", queue.size);
}

async function runFlushRounds(): Promise<void> {
  do {
    flushRequested = false;
    await flushOnce();
  } while (flushRequested);
}

export function flushUploadQueue(): Promise<void> {
  if (flushPromise) {
    flushRequested = true;
    return flushPromise;
  }

  flushPromise = runFlushRounds().finally(() => {
    flushPromise = null;
  });
  return flushPromise;
}

export async function enableUploadQueueAutoSync(): Promise<void> {
  if (autoSyncEnabled) return;
  autoSyncEnabled = true;

  if (__DEV__) console.log("[UploadQueue] Enabling auto-sync...");
  ensureConnectivityMonitoring();
  await loadFromDisk();
  await recoverOrphanedRecordings();
  await persist();

  // L'abonné reçoit immédiatement l'état courant : si on est déjà en ligne,
  // ce premier appel lance le flush des items en attente.
  subscribeConnectivity((isOnline) => {
    if (__DEV__) {
      console.log("[UploadQueue] Connectivity changed: online =", isOnline, "queueSize:", queue.size);
    }
    if (!isOnline) return;
    resetBackoff();
    void flushUploadQueue();
  });

  if (__DEV__) {
    console.log(
      "[UploadQueue] Auto-sync enabled. online:",
      getIsOnline(),
      "ready:",
      isConnectivityInitialized(),
      "queueSize:",
      queue.size,
    );
  }
}
