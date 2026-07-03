import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as FileSystem from "expo-file-system/legacy";
import { authService } from "@/services/auth";
import { gpsApi } from "@/services/api/gps/gps.service";
import type { ReportPositionInput } from "@/types/api";
import {
  ensureConnectivityMonitoring,
  getIsOnline,
  isConnectivityInitialized,
  subscribeConnectivity,
} from "@/services/network/connectivity.service";

/**
 * GPS location tracking — the mobile app is the source of truth for the
 * commercial's position.
 *
 * Design (best-by-design, foreground AND background):
 *  - ONE high-accuracy position source (`BestForNavigation`). In foreground it
 *    is a `watchPositionAsync` stream; in background it is a
 *    `TaskManager` + `startLocationUpdatesAsync` task. Both funnel every fix
 *    into the same `ingestFix()`.
 *  - LOCAL real-time stream: `subscribeToPositions(cb)` receives EVERY fix
 *    instantly, in-process, with no network — this is what a future in-map
 *    navigation feature consumes.
 *  - THROTTLED uploader, fully decoupled from the local stream: fixes are only
 *    enqueued for the backend when they clear a time/distance threshold
 *    (see cadence constants below).
 *  - OFFLINE BUFFER: enqueued points are persisted to disk. `reportMyPositions`
 *    is a batch mutation, so if a send fails (offline) the buffer survives and
 *    is flushed as a single batch on the next successful send / reconnect.
 *
 * The background task runs in a separate (possibly headless) JS context, which
 * does NOT share in-memory state with the foreground. The on-disk buffer is the
 * shared medium, so all buffer/throttle state is persisted and re-read.
 */

export const LOCATION_TASK = "prowin-location-tracking";

// --- Cadence constants -----------------------------------------------------
// Local stream: fast, real-time, feeds the (future) navigation map only.
const FOREGROUND_WATCH_INTERVAL_MS = 2_000;
const FOREGROUND_WATCH_DISTANCE_M = 0;

// Uploader throttle (decoupled from the local stream).
const FOREGROUND_UPLOAD_INTERVAL_MS = 15_000;
const FOREGROUND_UPLOAD_DISTANCE_M = 20;
const BACKGROUND_UPLOAD_INTERVAL_MS = 30_000;
const BACKGROUND_UPLOAD_DISTANCE_M = 30;

// Background OS delivery cadence == background uploader cadence: the OS already
// throttles, so every delivered background fix passes the uploader threshold.
const BACKGROUND_WATCH_INTERVAL_MS = BACKGROUND_UPLOAD_INTERVAL_MS;
const BACKGROUND_WATCH_DISTANCE_M = BACKGROUND_UPLOAD_DISTANCE_M;

// Hard cap on buffered points to bound disk/memory when offline for long.
// Oldest points are dropped first.
const MAX_BUFFER_POINTS = 1_000;

type UploadSource = "foreground" | "background";

/** Real-time fix exposed to local subscribers (e.g. navigation map). */
export type LocationFix = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

/**
 * A buffered point carries a stable, monotonic `seq` used ONLY for local
 * bookkeeping: it lets `flush` remove exactly the points it sent by identity
 * (not by count), so points appended while a send is in flight — including
 * after a cap-trim drops the oldest ones — are never mistakenly discarded.
 * `seq` is persisted with the buffer but stripped before sending (the backend
 * input is {latitude,longitude,accuracy?,batteryLevel?,recordedAt?}).
 */
type BufferedPoint = ReportPositionInput & { seq: number };

type BufferStore = {
  points: BufferedPoint[];
  // Next `seq` to assign. Persisted so ids stay monotonic across app restarts
  // and across the (separate) foreground/background JS contexts.
  nextSeq: number;
  lastEnqueuedAt: number | null;
  lastLat: number | null;
  lastLng: number | null;
};

// --- Persistent buffer (disk is the source of truth across contexts) -------
const STORAGE_DIRECTORY = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
const BUFFER_FILE = STORAGE_DIRECTORY ? `${STORAGE_DIRECTORY}gps-position-buffer.json` : null;
const BUFFER_FILE_TMP = STORAGE_DIRECTORY
  ? `${STORAGE_DIRECTORY}gps-position-buffer.json.tmp`
  : null;

const EMPTY_STORE: BufferStore = {
  points: [],
  nextSeq: 0,
  lastEnqueuedAt: null,
  lastLat: null,
  lastLng: null,
};

let cachedStore: BufferStore | null = null;

function isBufferStore(value: unknown): value is BufferStore {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BufferStore>;
  return Array.isArray(candidate.points);
}

/**
 * Ensure every point has a stable `seq` and that `nextSeq` is strictly greater
 * than every assigned id. Backfills legacy buffers persisted before `seq`
 * existed, so identity-based removal in `flush` is always well-defined.
 */
function normalizeStore(store: BufferStore): BufferStore {
  let nextSeq = typeof store.nextSeq === "number" ? store.nextSeq : 0;
  for (const point of store.points) {
    if (typeof point.seq !== "number") {
      point.seq = nextSeq;
      nextSeq += 1;
    } else if (point.seq >= nextSeq) {
      nextSeq = point.seq + 1;
    }
  }
  store.nextSeq = nextSeq;
  return store;
}

async function loadStore(): Promise<BufferStore> {
  if (cachedStore) return cachedStore;
  if (!BUFFER_FILE) {
    cachedStore = { ...EMPTY_STORE };
    return cachedStore;
  }
  try {
    const info = await FileSystem.getInfoAsync(BUFFER_FILE);
    if (!info.exists) {
      cachedStore = { ...EMPTY_STORE };
      return cachedStore;
    }
    const raw = await FileSystem.readAsStringAsync(BUFFER_FILE);
    const parsed: unknown = JSON.parse(raw);
    cachedStore = isBufferStore(parsed) ? normalizeStore(parsed) : { ...EMPTY_STORE };
  } catch (err) {
    if (__DEV__) console.warn("[LocationTracking] loadStore failed:", err);
    cachedStore = { ...EMPTY_STORE };
  }
  return cachedStore;
}

async function persistStore(store: BufferStore): Promise<void> {
  cachedStore = store;
  if (!BUFFER_FILE || !BUFFER_FILE_TMP) return;
  try {
    await FileSystem.writeAsStringAsync(BUFFER_FILE_TMP, JSON.stringify(store));
    await FileSystem.moveAsync({ from: BUFFER_FILE_TMP, to: BUFFER_FILE });
  } catch (err) {
    if (__DEV__) console.warn("[LocationTracking] persistStore failed:", err);
  }
}

// --- Local real-time stream ------------------------------------------------
type LocalListener = (fix: LocationFix) => void;
const localListeners = new Set<LocalListener>();

function emitLocal(fix: LocationFix): void {
  localListeners.forEach((listener) => {
    try {
      listener(fix);
    } catch (err) {
      if (__DEV__) console.warn("[LocationTracking] local listener threw:", err);
    }
  });
}

/**
 * Subscribe to the raw, real-time position stream (every fix, no network).
 * Intended for a future in-map navigation feature. Returns an unsubscribe fn.
 */
export function subscribeToPositions(listener: LocalListener): () => void {
  localListeners.add(listener);
  return () => {
    localListeners.delete(listener);
  };
}

// --- Uploader throttle + flush --------------------------------------------
const EARTH_RADIUS_M = 6_371_000;

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

function shouldEnqueue(
  store: BufferStore,
  latitude: number,
  longitude: number,
  timestamp: number,
  intervalMs: number,
  distanceM: number,
): boolean {
  if (store.lastEnqueuedAt == null || store.lastLat == null || store.lastLng == null) {
    return true;
  }
  const elapsed = timestamp - store.lastEnqueuedAt;
  const moved = distanceMeters(store.lastLat, store.lastLng, latitude, longitude);
  return elapsed >= intervalMs || moved >= distanceM;
}

let flushing = false;

/**
 * Flush the buffered points to the backend as a single batch. On success the
 * sent points are removed; on failure (offline / server error) the buffer is
 * kept intact for the next attempt.
 */
async function flush(): Promise<void> {
  if (flushing) return;
  ensureConnectivityMonitoring();

  const store = await loadStore();
  if (store.points.length === 0) return;
  // Only skip when we positively know we are offline; if connectivity is not
  // yet initialized, attempt the send and let a network error re-buffer.
  if (isConnectivityInitialized() && !getIsOnline()) return;

  flushing = true;
  try {
    const batch = store.points.slice();
    const sentIds = new Set(batch.map((p) => p.seq));
    // Strip the local-only `seq` before sending: the backend input is
    // {latitude,longitude,accuracy?,batteryLevel?,recordedAt?} only.
    const payload: ReportPositionInput[] = batch.map(({ seq: _seq, ...rest }) => rest);
    await gpsApi.reportPositions(payload);
    // Re-read: new fixes may have been appended while the request was in
    // flight, and a cap-trim may have dropped the OLDEST points off the front.
    // Removing by identity (not by count) guarantees we drop exactly the points
    // we sent and keep every concurrently-appended, never-sent fix.
    const fresh = await loadStore();
    fresh.points = fresh.points.filter((p) => !sentIds.has(p.seq));
    await persistStore(fresh);
    if (__DEV__) console.log("[LocationTracking] flushed", batch.length, "point(s)");
  } catch (err) {
    if (__DEV__) console.warn("[LocationTracking] flush failed (buffered):", err);
  } finally {
    flushing = false;
  }
}

/**
 * Single ingestion path for every fix from either source. Emits to the local
 * stream immediately, then applies the throttle, buffers, and flushes.
 */
async function ingestFix(
  coords: Location.LocationObjectCoords,
  timestamp: number,
  source: UploadSource,
): Promise<void> {
  emitLocal({
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    heading: coords.heading,
    speed: coords.speed,
    timestamp,
  });

  const intervalMs =
    source === "background" ? BACKGROUND_UPLOAD_INTERVAL_MS : FOREGROUND_UPLOAD_INTERVAL_MS;
  const distanceM =
    source === "background" ? BACKGROUND_UPLOAD_DISTANCE_M : FOREGROUND_UPLOAD_DISTANCE_M;

  const store = await loadStore();
  if (!shouldEnqueue(store, coords.latitude, coords.longitude, timestamp, intervalMs, distanceM)) {
    return;
  }

  const point: BufferedPoint = {
    seq: store.nextSeq,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy ?? null,
    // batteryLevel omitted: expo-battery is not a dependency (see report).
    recordedAt: new Date(timestamp).toISOString(),
  };
  store.nextSeq += 1;

  store.points.push(point);
  if (store.points.length > MAX_BUFFER_POINTS) {
    store.points = store.points.slice(store.points.length - MAX_BUFFER_POINTS);
  }
  store.lastEnqueuedAt = timestamp;
  store.lastLat = coords.latitude;
  store.lastLng = coords.longitude;
  await persistStore(store);

  await flush();
}

// --- Background task (registered at module load, in global scope) ----------
// Must be defined at import time so it is available even in a headless launch
// (OS wakes the app for a location event). Import this module from the app
// root (app/_layout.tsx) to guarantee registration in every JS context.
TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(
  LOCATION_TASK,
  async ({ data, error }) => {
    if (error) {
      if (__DEV__) console.warn("[LocationTracking] background task error:", error.message);
      return;
    }
    const locations = data?.locations ?? [];
    for (const location of locations) {
      await ingestFix(location.coords, location.timestamp, "background");
    }
  },
);

// --- Lifecycle -------------------------------------------------------------
let started = false;
let watchSub: Location.LocationSubscription | null = null;
let connectivityUnsub: (() => void) | null = null;

async function startBackgroundUpdates(): Promise<void> {
  try {
    const background = await Location.requestBackgroundPermissionsAsync();
    if (!background.granted) {
      if (__DEV__) {
        console.log("[LocationTracking] background permission denied — foreground only");
      }
      return;
    }
    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(
      () => false,
    );
    if (alreadyRunning) return;

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: BACKGROUND_WATCH_INTERVAL_MS,
      distanceInterval: BACKGROUND_WATCH_DISTANCE_M,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "ProWin — suivi de position",
        notificationBody: "Ta position est partagée pendant la prospection.",
      },
    });
  } catch (err) {
    if (__DEV__) console.warn("[LocationTracking] startBackgroundUpdates failed:", err);
  }
}

/**
 * Start tracking. Role-gated (commercial + manager) and auth-gated. Requests
 * foreground THEN background permissions; gracefully no-ops with a logged
 * reason when a permission is denied. Idempotent.
 */
async function start(): Promise<void> {
  if (started) return;

  const [authenticated, role] = await Promise.all([
    authService.isAuthenticated(),
    authService.getUserRole(),
  ]);
  if (!authenticated) {
    if (__DEV__) console.log("[LocationTracking] not authenticated — skip");
    return;
  }
  if (role !== "commercial" && role !== "manager") {
    if (__DEV__) console.log("[LocationTracking] role is not commercial or manager — skip");
    return;
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    if (__DEV__) console.log("[LocationTracking] foreground permission denied — skip");
    return;
  }

  ensureConnectivityMonitoring();
  started = true;

  // Local real-time stream (single source in foreground).
  try {
    watchSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: FOREGROUND_WATCH_INTERVAL_MS,
        distanceInterval: FOREGROUND_WATCH_DISTANCE_M,
      },
      (location) => {
        void ingestFix(location.coords, location.timestamp, "foreground");
      },
    );
  } catch (err) {
    if (__DEV__) console.warn("[LocationTracking] watchPositionAsync failed:", err);
  }

  // Flush the buffer whenever connectivity returns.
  connectivityUnsub = subscribeConnectivity((isOnline) => {
    if (isOnline) void flush();
  });

  await startBackgroundUpdates();

  // Flush any points buffered during a previous (offline) session.
  void flush();
}

/** Stop tracking and tear down the foreground watch + background task. */
async function stop(): Promise<void> {
  if (watchSub) {
    watchSub.remove();
    watchSub = null;
  }
  if (connectivityUnsub) {
    connectivityUnsub();
    connectivityUnsub = null;
  }
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(
      () => false,
    );
    if (running) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch (err) {
    if (__DEV__) console.warn("[LocationTracking] stopLocationUpdatesAsync failed:", err);
  }
  started = false;
}

export const LocationTrackingService = {
  start,
  stop,
  subscribeToPositions,
  isTracking: () => started,
};
