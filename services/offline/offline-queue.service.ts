import { api } from "@/services/api";
import { ErrorType, isGraphQLClientError } from "@/services/core/graphql/errors";
import {
  ensureConnectivityMonitoring,
  getIsOnline,
  subscribeConnectivity,
} from "@/services/network/connectivity.service";
import {
  movePersistentCacheAside,
  readPersistentCache,
  readPersistentCacheEntry,
  writePersistentCache,
} from "@/services/offline/persistent-cache.service";
import { getRetryDelayMs, isPermanentError } from "@/services/offline/retry-schedule";
import type { UpdatePorteInput } from "@/types/api";
import { syncWorkspaceMutation } from "@/hooks/api/data-sync";

type QueueListener = (count: number) => void;

type QueuedPorteUpdate = {
  key: string;
  immeubleId?: number;
  porteId: number;
  payload: UpdatePorteInput;
  // Pause propre à chaque porte : une porte en échec ne bloque pas les autres.
  failureCount?: number;
  nextAttemptAt?: number;
};

type RejectedPorteUpdate = QueuedPorteUpdate & {
  error: string;
  rejectedAt: number;
};

// File persistée sur disque : elle survit à un redémarrage de l'app hors ligne.
const QUEUE_CACHE_KEY = "offline-porte-queue";
// Journal des mises à jour refusées définitivement par le serveur.
const REJECTED_CACHE_KEY = "offline-porte-rejected";
const MAX_REJECTED_ENTRIES = 50;

const queue = new Map<string, QueuedPorteUpdate>();
const listeners = new Set<QueueListener>();
let autoSyncEnabled = false;
// État de la file sur disque :
// - "unknown" : pas encore relue (ou erreur d'accès disque) → aucune écriture,
//   nouvel essai de lecture au prochain flush ou à la prochaine écriture ;
// - "loaded" : relue, les écritures sont autorisées ;
// - "blocked" : fichier illisible qui n'a pas pu être mis de côté → on ne
//   l'écrase jamais, la file ne vit qu'en mémoire pour cette session.
let diskState: "unknown" | "loaded" | "blocked" = "unknown";
// Chargement en cours depuis le disque, partagé par les appels concurrents.
let loadPromise: Promise<void> | null = null;
// Portes mises en file avant la relecture du disque : leur version (même déjà
// envoyée) est plus récente que celle du disque, qui ne doit pas revenir.
const keysQueuedBeforeLoad = new Set<string>();
// Écritures disque chaînées : jamais deux en parallèle, toujours dans l'ordre.
let writeChain: Promise<void> = Promise.resolve();
// Flush en cours, partagé par les appels concurrents. Posé de façon synchrone
// pour qu'aucun second flush ne démarre pendant un `await` du premier.
let flushPromise: Promise<void> | null = null;
// Une demande arrivée pendant un flush relance un tour à la fin de celui-ci.
let flushRequested = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
// Souscription connectivité unique (module-level) pour éviter les doublons.
let connectivityUnsubscribe: (() => void) | null = null;
// Débounce du flush sur reconnexion pour absorber les changements rapides.
const FLUSH_DEBOUNCE_MS = 500;
let flushDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function getQueueCount(): number {
  return queue.size;
}

function notifyQueueListeners(): void {
  const count = getQueueCount();
  listeners.forEach((listener) => {
    listener(count);
  });
}

function makeKey(porteId: number, immeubleId?: number): string {
  return typeof immeubleId === "number"
    ? `immeuble:${immeubleId}:porte:${porteId}`
    : `porte:${porteId}`;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? "Unknown error");
}

function isQueuedPorteUpdate(item: unknown): item is QueuedPorteUpdate {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<QueuedPorteUpdate>;
  return (
    typeof candidate.key === "string" &&
    typeof candidate.porteId === "number" &&
    (candidate.immeubleId === undefined || typeof candidate.immeubleId === "number") &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null &&
    typeof candidate.payload.id === "number"
  );
}

// Fin de chargement réussie : les mises en file faites avant (dont l'écriture
// a pu être sautée, et dont la version du disque a pu être écartée) sont
// écrites maintenant.
function markDiskLoaded(): void {
  const hasChangesBeforeLoad = keysQueuedBeforeLoad.size > 0;
  diskState = "loaded";
  keysQueuedBeforeLoad.clear();
  if (hasChangesBeforeLoad || queue.size > 0) persistQueue();
}

async function loadFromDisk(): Promise<void> {
  const result = await readPersistentCacheEntry<unknown>(QUEUE_CACHE_KEY);

  if (result.status === "io-error") {
    // Le fichier est peut-être valide : on n'y touche pas et on n'écrit rien.
    if (__DEV__) console.warn("[OfflineQueue] Queue file not accessible, will retry:", result.error);
    return;
  }

  if (result.status === "missing") {
    markDiskLoaded();
    return;
  }

  if (result.status === "unreadable" || !Array.isArray(result.payload.data)) {
    // Fichier illisible : mis de côté plutôt qu'écrasé par la prochaine écriture.
    const movedAside = await movePersistentCacheAside(QUEUE_CACHE_KEY);
    if (__DEV__) console.warn("[OfflineQueue] Unreadable queue file, moved aside:", movedAside);
    if (movedAside) {
      markDiskLoaded();
    } else {
      diskState = "blocked";
    }
    return;
  }

  // Une session neuve repart sans pause : seules les données de la porte comptent.
  const stored = result.payload.data
    .filter(isQueuedPorteUpdate)
    .filter((entry) => !keysQueuedBeforeLoad.has(entry.key) || queue.has(entry.key))
    .map(({ key, immeubleId, porteId, payload }) => ({ key, immeubleId, porteId, payload }));

  if (stored.length > 0) {
    // Le disque contient les écritures les plus anciennes : elles passent devant
    // celles mises en file pendant le chargement, qui gagnent en cas de doublon.
    const queuedDuringLoad = Array.from(queue.values());
    queue.clear();
    for (const entry of stored) {
      queue.set(entry.key, entry);
    }
    for (const entry of queuedDuringLoad) {
      queue.set(entry.key, entry);
    }
    if (__DEV__) console.log("[OfflineQueue] Restored", stored.length, "item(s) from disk");
    notifyQueueListeners();
  }
  markDiskLoaded();
}

// Résout une fois la tentative de chargement terminée ; tant que la file n'a
// pas pu être relue (erreur disque), chaque appel retente la lecture.
function ensureLoaded(): Promise<void> {
  if (diskState !== "unknown") return Promise.resolve();
  if (!loadPromise) {
    loadPromise = loadFromDisk()
      .catch((err) => {
        if (__DEV__) console.warn("[OfflineQueue] loadFromDisk failed:", err);
      })
      .finally(() => {
        loadPromise = null;
      });
  }
  return loadPromise;
}

// Ajoute une écriture à la chaîne, après le chargement : une écriture ne peut
// donc jamais écraser une file pas encore relue depuis le disque.
function enqueueWrite(write: () => Promise<void>): void {
  writeChain = writeChain
    .then(ensureLoaded)
    .then(write)
    .catch((err) => {
      if (__DEV__) console.warn("[OfflineQueue] disk write failed:", err);
    });
}

// L'état de la file est relu au moment de l'écriture : la dernière écriture
// de la chaîne reflète toujours l'état le plus récent.
function persistQueue(): void {
  enqueueWrite(async () => {
    if (diskState !== "loaded") return;
    await writePersistentCache(QUEUE_CACHE_KEY, Array.from(queue.values()));
  });
}

function journalRejected(entry: QueuedPorteUpdate, err: unknown): void {
  const rejected: RejectedPorteUpdate = {
    ...entry,
    error: getErrorMessage(err),
    rejectedAt: Date.now(),
  };
  enqueueWrite(async () => {
    const cached = await readPersistentCache<unknown>(REJECTED_CACHE_KEY);
    const previous: unknown[] = Array.isArray(cached?.data) ? cached.data : [];
    await writePersistentCache(
      REJECTED_CACHE_KEY,
      [...previous, rejected].slice(-MAX_REJECTED_ENTRIES),
    );
  });
}

export function subscribeOfflineQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  listener(getQueueCount());
  return () => {
    listeners.delete(listener);
  };
}

export function queuePorteUpdate(
  payload: UpdatePorteInput,
  options?: { immeubleId?: number },
): number {
  const key = makeKey(payload.id, options?.immeubleId);
  if (diskState !== "loaded") keysQueuedBeforeLoad.add(key);
  queue.set(key, {
    key,
    immeubleId: options?.immeubleId,
    porteId: payload.id,
    payload,
  });
  notifyQueueListeners();
  persistQueue();
  // Ajout pendant un flush : il partira au tour de relance.
  if (flushPromise) flushRequested = true;
  return getQueueCount();
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
  for (const entry of queue.values()) {
    if (
      entry.nextAttemptAt !== undefined &&
      (nextAttemptAt === null || entry.nextAttemptAt < nextAttemptAt)
    ) {
      nextAttemptAt = entry.nextAttemptAt;
    }
  }
  if (nextAttemptAt === null) return;

  const delayMs = Math.max(0, nextAttemptAt - Date.now());
  if (__DEV__) console.log("[OfflineQueue] Next retry in", delayMs, "ms");
  retryTimer = setTimeout(() => {
    retryTimer = null;
    runFlushInBackground();
  }, delayMs);
}

// Retour du réseau : les pauses repartent à zéro, tout est retenté.
function resetBackoff(): void {
  clearRetryTimer();
  for (const entry of queue.values()) {
    entry.failureCount = undefined;
    entry.nextAttemptAt = undefined;
  }
  persistQueue();
}

function markFailed(entry: QueuedPorteUpdate): void {
  entry.failureCount = (entry.failureCount ?? 0) + 1;
  entry.nextAttemptAt = Date.now() + getRetryDelayMs(entry.failureCount);
  persistQueue();
}

// Retire l'entrée seulement si elle n'a pas été remplacée pendant l'envoi.
function removeEntry(entry: QueuedPorteUpdate): void {
  if (queue.get(entry.key) !== entry) return;
  queue.delete(entry.key);
  notifyQueueListeners();
  persistQueue();
}

// Échec dû au réseau : inutile d'essayer les portes suivantes maintenant.
function isNetworkFailure(err: unknown): boolean {
  return !getIsOnline() || (isGraphQLClientError(err) && err.type === ErrorType.NETWORK);
}

// Renvoie false si le tour s'est arrêté sur une coupure réseau : le retry
// planifié ou la reconnexion prennent alors le relais (pas de tour immédiat).
async function flushOnce(): Promise<boolean> {
  await ensureLoaded();
  if (!getIsOnline() || queue.size === 0) {
    return true;
  }

  let networkFailure = false;
  const entries = Array.from(queue.values());
  for (const entry of entries) {
    // Porte en pause après un échec : le timer de retry la reprendra à l'échéance.
    if (entry.nextAttemptAt !== undefined && entry.nextAttemptAt > Date.now()) {
      continue;
    }

    try {
      await api.portes.update(entry.payload);
    } catch (err) {
      if (isPermanentError(err)) {
        // Refus définitif : réessayer ne changerait rien. On l'écarte (journalisé).
        if (__DEV__) console.warn("[OfflineQueue] Update rejected, dropped:", entry.key, err);
        removeEntry(entry);
        journalRejected(entry, err);
        continue;
      }
      // Erreur temporaire : la porte garde sa place et prend une pause. Les
      // autres portes partent quand même (l'ordre entre portes différentes
      // n'a pas d'importance), sauf coupure réseau.
      markFailed(entry);
      if (__DEV__) console.warn("[OfflineQueue] Update failed, will retry:", entry.key, err);
      if (isNetworkFailure(err)) {
        networkFailure = true;
        break;
      }
      continue;
    }

    removeEntry(entry);
    try {
      syncWorkspaceMutation("PORTE_UPDATED", {
        immeubleId: entry.immeubleId,
        porteId: entry.porteId,
      });
    } catch (err) {
      // La porte est bien enregistrée côté serveur : un souci de synchro locale
      // ne doit pas bloquer la file.
      if (__DEV__) console.warn("[OfflineQueue] syncWorkspaceMutation failed:", err);
    }
  }

  scheduleRetry();
  return !networkFailure;
}

async function runFlushRounds(): Promise<void> {
  let completed: boolean;
  do {
    flushRequested = false;
    completed = await flushOnce();
  } while (completed && flushRequested);
}

export function flushOfflineQueue(): Promise<void> {
  if (flushPromise) {
    flushRequested = true;
    return flushPromise;
  }

  flushPromise = runFlushRounds().finally(() => {
    flushPromise = null;
  });
  return flushPromise;
}

// Flush déclenché par un timer : aucune erreur ne doit rester non gérée.
function runFlushInBackground(): void {
  flushOfflineQueue().catch((err) => {
    if (__DEV__) console.warn("[OfflineQueue] background flush failed:", err);
  });
}

function scheduleDebouncedFlush(): void {
  if (flushDebounceTimer) {
    clearTimeout(flushDebounceTimer);
  }
  flushDebounceTimer = setTimeout(() => {
    flushDebounceTimer = null;
    runFlushInBackground();
  }, FLUSH_DEBOUNCE_MS);
}

export function enableOfflineQueueAutoSync(): void {
  if (autoSyncEnabled) return;
  autoSyncEnabled = true;

  ensureConnectivityMonitoring();
  // Relit la file laissée sur disque par une session précédente.
  void ensureLoaded();

  // Souscription unique : on garde la fonction de désinscription au niveau
  // module pour ne jamais empiler plusieurs abonnements connectivité.
  if (!connectivityUnsubscribe) {
    connectivityUnsubscribe = subscribeConnectivity((isOnline) => {
      if (!isOnline) return;
      resetBackoff();
      scheduleDebouncedFlush();
    });
  }
}
