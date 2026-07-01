import { api } from "@/services/api";
import type { RankPeriod, RankSnapshotType } from "@/types/graphql-schema";
import { periodKeyFor } from "@/utils/business/periods";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

/** Classement complet (leaderboard) pour une période. periodKey déduit de la date du jour si omis. */
export function useLeaderboard(period: RankPeriod, periodKey?: string) {
  const key = periodKey ?? periodKeyFor(period);
  const fetch = useCallback(() => api.gamification.getRanking(period, key), [period, key]);

  return useApiCall<RankSnapshotType[]>(fetch, [period, key], {
    cacheKey: `gamification:leaderboard:${period}:${key}`,
    cacheTimeMs: 60_000,
  });
}
