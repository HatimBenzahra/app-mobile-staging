import { api } from "@/services/api";
import { authService } from "@/services/auth";
import {
  readPersistentCache,
  writePersistentCache,
} from "@/services/offline/persistent-cache.service";
import type {
  Immeuble,
  ImmeubleProgressFilter,
  ImmeublesPage,
  ImmeublesPageSummary,
  TypeHabitat,
} from "@/types/api";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 20;

export type ImmeublesPageFilters = {
  search?: string;
  typeHabitat?: TypeHabitat | null;
  progress?: ImmeubleProgressFilter;
};

export type UseImmeublesPageResult = {
  items: Immeuble[];
  summary: ImmeublesPageSummary | null;
  totalCount: number;
  hasMore: boolean;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMore: () => void;
  reload: () => Promise<void>;
};

/**
 * Pagination keyset (curseur) de la liste des lieux autonomes pour l'onglet
 * Lieux, adossée à la query serveur `immeublesPage`. Filtres (recherche/type/
 * progression) appliqués **côté serveur**. Stale-while-revalidate : la première
 * page est servie depuis le cache persistant (offline-first) puis revalidée.
 */
export function useImmeublesPage(
  filters: ImmeublesPageFilters,
): UseImmeublesPageResult {
  const { search, typeHabitat, progress } = filters;
  const filterSig = `${search?.trim() ?? ""}|${typeHabitat ?? ""}|${progress ?? "ALL"}`;

  const [items, setItems] = useState<Immeuble[]>([]);
  const [summary, setSummary] = useState<ImmeublesPageSummary | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const hasDataRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const buildInput = useCallback(
    (cursor: string | null) => ({
      limit: PAGE_SIZE,
      cursor,
      search: search?.trim() || null,
      typeHabitat: typeHabitat ?? null,
      progress: progress ?? ("ALL" as ImmeubleProgressFilter),
    }),
    [search, typeHabitat, progress],
  );

  const loadFirstPage = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    loadingRef.current = true;
    hasDataRef.current = false;
    setError(null);
    setLoadingInitial(true);

    const [uid, role] = await Promise.all([
      authService.getUserId(),
      authService.getUserRole(),
    ]);
    if (!mountedRef.current || requestId !== requestIdRef.current) return;
    const cacheKey = `immeubles-page:${role ?? "?"}:${uid ?? 0}:${filterSig}`;

    // Offline-first : afficher la 1re page en cache pendant la revalidation.
    const cached = await readPersistentCache<ImmeublesPage>(cacheKey);
    if (mountedRef.current && requestId === requestIdRef.current && cached?.data) {
      setItems(cached.data.items ?? []);
      setSummary(cached.data.summary ?? null);
      setTotalCount(cached.data.totalCount ?? 0);
      setHasMore(cached.data.hasMore ?? false);
      cursorRef.current = cached.data.nextCursor ?? null;
      hasDataRef.current = true;
      setLoadingInitial(false);
    }

    try {
      const page = await api.immeubles.getPage(buildInput(null));
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setItems(page.items);
      setSummary(page.summary);
      setTotalCount(page.totalCount);
      setHasMore(page.hasMore);
      cursorRef.current = page.nextCursor ?? null;
      hasDataRef.current = true;
      void writePersistentCache(cacheKey, page);
    } catch (err: unknown) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoadingInitial(false);
        loadingRef.current = false;
      }
    }
  }, [buildInput, filterSig]);

  // (Re)chargement à chaque changement de filtre : on réinitialise l'état pour
  // ne pas afficher les résultats de l'ancien filtre pendant le fetch.
  useEffect(() => {
    cursorRef.current = null;
    setItems([]);
    setHasMore(false);
    setTotalCount(0);
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore || !cursorRef.current) return;
    const cursor = cursorRef.current;
    const requestId = requestIdRef.current;
    loadingRef.current = true;
    setLoadingMore(true);
    void (async () => {
      try {
        const page = await api.immeubles.getPage(buildInput(cursor));
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
        });
        setSummary(page.summary);
        setTotalCount(page.totalCount);
        setHasMore(page.hasMore);
        cursorRef.current = page.nextCursor ?? null;
      } catch (err: unknown) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoadingMore(false);
          loadingRef.current = false;
        }
      }
    })();
  }, [buildInput, hasMore]);

  const reload = useCallback(async () => {
    cursorRef.current = null;
    await loadFirstPage();
  }, [loadFirstPage]);

  return {
    items,
    summary,
    totalCount,
    hasMore,
    loadingInitial,
    loadingMore,
    error,
    loadMore,
    reload,
  };
}
