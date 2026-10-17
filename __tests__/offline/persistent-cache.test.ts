/**
 * Garanties du cache persistant (fichiers JSON du dossier documents).
 *
 * Il porte aussi la file hors ligne des portes : une écriture interrompue ne
 * doit jamais laisser un fichier tronqué, et une entrée illisible doit pouvoir
 * être distinguée d'une entrée absente, puis mise de côté.
 */

const CACHE_DIR = "file:///doc/persistent-cache/";

// Système de fichiers en mémoire : chemin → contenu.
const mockFiles = new Map<string, string>();
const mockFs = { failMove: false, failAccess: false };

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///doc/",
  cacheDirectory: "file:///cache/",
  getInfoAsync: async (path: string) => {
    if (mockFs.failAccess) throw new Error(`EIO ${path}`);
    return { exists: mockFiles.has(path) || path === "file:///doc/persistent-cache/" };
  },
  makeDirectoryAsync: async () => undefined,
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
    if (mockFs.failMove || content === undefined) throw new Error(`move failed ${from}`);
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

type PersistentCacheModule =
  typeof import("@/services/offline/persistent-cache.service");

let cache: PersistentCacheModule;

describe("persistent-cache.service", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockFiles.clear();
    mockFs.failMove = false;
    mockFs.failAccess = false;
    cache = jest.requireActual<PersistentCacheModule>(
      "@/services/offline/persistent-cache.service",
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("écrit via un fichier temporaire puis le déplace (aucun .tmp restant)", async () => {
    await cache.writePersistentCache("offline-porte-queue", [1, 2]);

    expect(Array.from(mockFiles.keys())).toEqual([`${CACHE_DIR}offline_porte_queue.json`]);
    expect(await cache.readPersistentCache("offline-porte-queue")).toEqual({
      data: [1, 2],
      savedAt: expect.any(Number),
    });
  });

  it("une écriture interrompue laisse l'ancienne valeur intacte et nettoie le .tmp", async () => {
    await cache.writePersistentCache("k", "ancien");
    mockFs.failMove = true;

    await cache.writePersistentCache("k", "nouveau");

    expect(Array.from(mockFiles.keys())).toEqual([`${CACHE_DIR}k.json`]);
    expect((await cache.readPersistentCache("k"))?.data).toBe("ancien");
  });

  it("deux écritures simultanées de la même clé n'entrent pas en conflit", async () => {
    await Promise.all([
      cache.writePersistentCache("k", "a"),
      cache.writePersistentCache("k", "b"),
    ]);

    expect(Array.from(mockFiles.keys())).toEqual([`${CACHE_DIR}k.json`]);
    expect(["a", "b"]).toContain((await cache.readPersistentCache("k"))?.data);
  });

  it("distingue une entrée absente, lisible ou illisible", async () => {
    expect(await cache.readPersistentCacheEntry("k")).toEqual({ status: "missing" });

    await cache.writePersistentCache("k", { a: 1 });
    expect(await cache.readPersistentCacheEntry("k")).toEqual({
      status: "ok",
      payload: { data: { a: 1 }, savedAt: expect.any(Number) },
    });

    mockFiles.set(`${CACHE_DIR}k.json`, "{tronqué");
    expect(await cache.readPersistentCacheEntry("k")).toMatchObject({ status: "unreadable" });
    // L'API historique reste inchangée : null pour une entrée illisible.
    expect(await cache.readPersistentCache("k")).toBeNull();
  });

  it("une erreur d'accès disque est distinguée d'un contenu illisible", async () => {
    await cache.writePersistentCache("k", { a: 1 });
    mockFs.failAccess = true;

    expect(await cache.readPersistentCacheEntry("k")).toMatchObject({ status: "io-error" });
    expect(await cache.readPersistentCache("k")).toBeNull();
  });

  it("supprime au démarrage les .tmp orphelins laissés par une écriture interrompue", async () => {
    mockFiles.set(`${CACHE_DIR}k.json.123-abc.tmp`, "{tronq");
    mockFiles.set(`${CACHE_DIR}autre.json`, "{}");

    await cache.writePersistentCache("k", "valeur");
    // Une seule fois par session : un .tmp apparu ensuite n'est pas concerné.
    mockFiles.set(`${CACHE_DIR}k.json.456-def.tmp`, "{en cours");
    await cache.writePersistentCache("k", "valeur 2");

    expect(Array.from(mockFiles.keys()).sort()).toEqual([
      `${CACHE_DIR}autre.json`,
      `${CACHE_DIR}k.json`,
      `${CACHE_DIR}k.json.456-def.tmp`,
    ]);
  });

  it("met de côté une entrée illisible sans la supprimer", async () => {
    mockFiles.set(`${CACHE_DIR}offline_porte_queue.json`, "{tronqué");

    expect(await cache.movePersistentCacheAside("offline-porte-queue")).toBe(true);

    const keys = Array.from(mockFiles.keys());
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/offline_porte_queue\.corrupt-\d+\.json$/);
    expect(mockFiles.get(keys[0])).toBe("{tronqué");
    expect(await cache.readPersistentCacheEntry("offline-porte-queue")).toEqual({
      status: "missing",
    });
  });

  it("signale l'échec de la mise de côté", async () => {
    expect(await cache.movePersistentCacheAside("absente")).toBe(false);
  });
});
