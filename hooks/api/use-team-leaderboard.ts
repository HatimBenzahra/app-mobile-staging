import { api } from "@/services/api";
import type { RankPeriod, RankSnapshotType } from "@/types/graphql-schema";
import { periodKeyFor } from "@/utils/business/periods";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

/**
 * Classement de l'équipe de l'utilisateur courant (commerciaux du même manager),
 * scopé + re-classé côté serveur. periodKey déduit de la date du jour si omis.
 */
export function useTeamLeaderboard(period: RankPeriod, periodKey?: string) {
  const key = periodKey ?? periodKeyFor(period);
  const fetch = useCallback(() => api.gamification.getTeamRanking(period, key), [period, key]);

  return useApiCall<RankSnapshotType[]>(fetch, [period, key], {
    cacheKey: `gamification:team:${period}:${key}`,
    cacheTimeMs: 60_000,
  });
}
