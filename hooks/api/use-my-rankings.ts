import { api } from "@/services/api";
import type { RankSnapshotType } from "@/types/graphql-schema";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

/** Snapshots de classement du commercial courant (une entrée par période). */
export function useMyRankings(commercialId: number | null) {
  const fetch = useCallback(async () => {
    if (!commercialId) return [];
    return api.gamification.getCommercialRankings(commercialId);
  }, [commercialId]);

  return useApiCall<RankSnapshotType[]>(fetch, [commercialId], {
    cacheKey: `gamification:rankings:${commercialId ?? 0}`,
    cacheTimeMs: 60_000,
  });
}
