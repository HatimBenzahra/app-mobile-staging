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

// Supprime les fichiers temporaires laissés par une écriture interrompue (app
// tuée entre l'écriture et le déplacement). Best-effort.
async function removeOrphanTmpFiles(): Promise<void> {
  try {
    const fileNames = await FileSystem.readDirectoryAsync(CACHE_DIR);
    await Promise.all(
      fileNames
        .filter((fileName) => fileName.endsWith(".tmp"))
        .map((fileName) =>
          FileSystem.deleteAsync(`${CACHE_DIR}${fileName}`, { idempotent: true }),
        ),
    );
  } catch (err) {
    if (__DEV__) {
      console.warn("[PersistentCache] removeOrphanTmpFiles failed:", err);
    }
  }
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
        return;
      }
      // Une seule fois par session, avant toute écriture : aucun .tmp n'est en cours.
      await removeOrphanTmpFiles();
    })().catch((err) => {
      ensureDirPromise = null;
      throw err;
    });
  }
  return ensureDirPromise;
}

export type PersistentCacheReadResult<T> =
  | { status: "missing" }
  | { status: "ok"; payload: PersistentCachePayload<T> }
  // Contenu présent mais invalide (JSON tronqué, format inattendu).
  | { status: "unreadable"; error: unknown }
  // Accès disque en échec : le contenu est peut-être valide, ne pas y toucher.
  | { status: "io-error"; error: unknown };

// Écriture atomique : fichier temporaire (nom unique, deux écritures de la même
// clé ne se marchent pas dessus) puis déplacement. Un arrêt brutal de l'app ne
// laisse jamais un fichier tronqué.
export async function writePersistentCache(key: string, data: unknown): Promise<void> {
  const fileUri = getFileUri(key);
  const tmpUri = `${fileUri}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    await ensureCacheDirectory();
    const payload: PersistentCachePayload<unknown> = {
      data,
      savedAt: Date.now(),
    };
    await FileSystem.writeAsStringAsync(tmpUri, JSON.stringify(payload));
    await FileSystem.moveAsync({ from: tmpUri, to: fileUri });
  } catch (err) {
    if (__DEV__) {
      console.warn("[PersistentCache] writePersistentCache failed:", err);
    }
    await FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => void 0);
  }
}

/**
 * Lecture qui distingue une entrée absente d'une entrée illisible, pour les
 * données qu'on ne doit pas écraser à l'aveugle (files d'envoi).
 */
export async function readPersistentCacheEntry<T>(
  key: string,
): Promise<PersistentCacheReadResult<T>> {
  const fileUri = getFileUri(key);
  let contents: string;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) {
      return { status: "missing" };
    }
    contents = await FileSystem.readAsStringAsync(fileUri);
  } catch (err) {
    return { status: "io-error", error: err };
  }

  try {
    const parsed = JSON.parse(contents) as PersistentCachePayload<T> | null;
    if (!parsed || typeof parsed.savedAt !== "number") {
      return { status: "unreadable", error: new Error("Invalid persistent cache payload") };
    }
    return { status: "ok", payload: parsed };
  } catch (err) {
    return { status: "unreadable", error: err };
  }
}

export async function readPersistentCache<T>(
  key: string,
): Promise<PersistentCachePayload<T> | null> {
  const result = await readPersistentCacheEntry<T>(key);
  if ((result.status === "unreadable" || result.status === "io-error") && __DEV__) {
    console.warn("[PersistentCache] readPersistentCache failed:", result.error);
  }
  return result.status === "ok" ? result.payload : null;
}

/**
 * Met de côté une entrée illisible (`<clé>.corrupt-<timestamp>.json`) au lieu
 * de la laisser écraser. Renvoie true si le fichier a bien été déplacé.
 */
export async function movePersistentCacheAside(key: string): Promise<boolean> {
  try {
    await FileSystem.moveAsync({
      from: getFileUri(key),
      to: `${CACHE_DIR}${sanitizeKey(key)}.corrupt-${Date.now()}.json`,
    });
    return true;
  } catch (err) {
    if (__DEV__) {
      console.warn("[PersistentCache] movePersistentCacheAside failed:", err);
    }
    return false;
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
