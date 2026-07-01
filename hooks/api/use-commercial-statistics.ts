import { api } from "@/services/api";
import type { Statistic } from "@/types/api";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

export function useCommercialStatistics(commercialId: number | null) {
  const fetchStatistics = useCallback(async (): Promise<Statistic[]> => {
    if (!commercialId || commercialId <= 0) return [];
    return api.statistics.getStatistics(commercialId);
  }, [commercialId]);

  return useApiCall<Statistic[]>(
    fetchStatistics,
    [commercialId],
    {
      cacheKey: `commercial-statistics:${commercialId ?? 0}`,
      cacheTimeMs: 45_000,
    },
  );
}
