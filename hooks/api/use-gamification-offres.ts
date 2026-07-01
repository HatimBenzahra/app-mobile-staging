import { api } from "@/services/api";
import type { GamificationOffre } from "@/services/api/gamification/gamification.service";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

/** Offres (externalId → badgeProductKey), pour mapper les contrats aux produits. */
export function useGamificationOffres() {
  const fetch = useCallback(() => api.gamification.getOffres(), []);
  return useApiCall<GamificationOffre[]>(fetch, [], {
    cacheKey: "gamification:offres",
    cacheTimeMs: 300_000,
  });
}
