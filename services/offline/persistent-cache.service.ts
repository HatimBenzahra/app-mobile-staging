import * as FileSystem from "expo-file-system/legacy";

export type PersistentCachePayload<T> = {
  data: T;
  savedAt: number;
};

const CACHE_STORAGE_DIR = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
const CACHE_DIR = `${CACHE_STORAGE_DIR ?? ""}persistent-cache/`;

let ensureDirPromise: Promise<void> | null = null;

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "_");
}

function getFileUri(key: string): string {
  return `${CACHE_DIR}${sanitizeKey(key)}.json`;
}

async function ensureCacheDirectory(): Promise<void> {
  if (!CACHE_STORAGE_DIR) {
    throw new Error("Persistent cache directory unavailable");
  }
  if (!ensureDirPromise) {
    ensureDirPromise = (async () => {
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
    })().catch((err) => {
      ensureDirPromise = null;
      throw err;
    });
  }
  return ensureDirPromise;
}

export async function writePersistentCache(key: string, data: unknown): Promise<void> {
  try {
    await ensureCacheDirectory();
    const payload: PersistentCachePayload<unknown> = {
      data,
      savedAt: Date.now(),
    };
    await FileSystem.writeAsStringAsync(getFileUri(key), JSON.stringify(payload));
  } catch (err) {
    if (__DEV__) {
      console.warn("[PersistentCache] writePersistentCache failed:", err);
    }
  }
}

export async function readPersistentCache<T>(
  key: string,
): Promise<PersistentCachePayload<T> | null> {
  try {
    const fileUri = getFileUri(key);
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) {
      return null;
    }
    const contents = await FileSystem.readAsStringAsync(fileUri);
    const parsed = JSON.parse(contents) as PersistentCachePayload<T>;
    if (!parsed || typeof parsed.savedAt !== "number") {
      return null;
    }
    return parsed;
  } catch (err) {
    if (__DEV__) {
      console.warn("[PersistentCache] readPersistentCache failed:", err);
    }
    return null;
  }
}

export async function clearPersistentCache(key: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(getFileUri(key), { idempotent: true });
  } catch (err) {
    if (__DEV__) {
      console.warn("[PersistentCache] clearPersistentCache failed:", err);
    }
  }
}

export async function clearPersistentCacheByPrefix(prefix: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      return;
    }
    const sanitizedPrefix = sanitizeKey(prefix);
    const fileNames = await FileSystem.readDirectoryAsync(CACHE_DIR);
    await Promise.all(
      fileNames
        .filter((fileName) => fileName.startsWith(sanitizedPrefix))
        .map((fileName) =>
          FileSystem.deleteAsync(`${CACHE_DIR}${fileName}`, { idempotent: true }),
        ),
    );
  } catch (err) {
    if (__DEV__) {
      console.warn("[PersistentCache] clearPersistentCacheByPrefix failed:", err);
    }
  }
}
