import { api } from "@/services/api";
import {
  ensureConnectivityMonitoring,
  getIsOnline,
  subscribeConnectivity,
} from "@/services/network/connectivity.service";
import type { UpdatePorteInput } from "@/types/api";
import { syncWorkspaceMutation } from "@/hooks/api/data-sync";

type QueueListener = (count: number) => void;

type QueuedPorteUpdate = {
  key: string;
  immeubleId?: number;
  porteId: number;
  payload: UpdatePorteInput;
};

const queue = new Map<string, QueuedPorteUpdate>();
const listeners = new Set<QueueListener>();
let autoSyncEnabled = false;
let flushing = false;
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
  queue.set(key, {
    key,
    immeubleId: options?.immeubleId,
    porteId: payload.id,
    payload,
  });
  notifyQueueListeners();
  return getQueueCount();
}

export async function flushOfflineQueue(): Promise<void> {
  if (flushing || !getIsOnline() || queue.size === 0) {
    return;
  }

  flushing = true;
  try {
    const entries = Array.from(queue.values());
    for (const entry of entries) {
      await api.portes.update(entry.payload);
      queue.delete(entry.key);
      syncWorkspaceMutation("PORTE_UPDATED", {
        immeubleId: entry.immeubleId,
        porteId: entry.porteId,
      });
      notifyQueueListeners();
    }
  } finally {
    flushing = false;
  }
}

function scheduleDebouncedFlush(): void {
  if (flushDebounceTimer) {
    clearTimeout(flushDebounceTimer);
  }
  flushDebounceTimer = setTimeout(() => {
    flushDebounceTimer = null;
    void flushOfflineQueue();
  }, FLUSH_DEBOUNCE_MS);
}

export function enableOfflineQueueAutoSync(): void {
  if (autoSyncEnabled) return;
  autoSyncEnabled = true;

  ensureConnectivityMonitoring();

  // Souscription unique : on garde la fonction de désinscription au niveau
  // module pour ne jamais empiler plusieurs abonnements connectivité.
  if (!connectivityUnsubscribe) {
    connectivityUnsubscribe = subscribeConnectivity((isOnline) => {
      if (!isOnline) return;
      scheduleDebouncedFlush();
    });
  }
}
