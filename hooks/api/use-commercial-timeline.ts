import { api } from "@/services/api";
import type { TimelinePoint } from "@/types/api";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

export function useCommercialTimeline(
  commercialId: number | null,
  startDate?: string,
  endDate?: string,
) {
  const fetchTimeline = useCallback(async (): Promise<TimelinePoint[]> => {
    if (!commercialId || commercialId <= 0) return [];
    return api.statistics.getStatsTimelineByCommercial(
      commercialId,
      startDate,
      endDate,
    );
  }, [commercialId, startDate, endDate]);

  return useApiCall<TimelinePoint[]>(
    fetchTimeline,
    [commercialId, startDate, endDate],
    {
      cacheKey: `commercial-timeline:${commercialId ?? 0}:${startDate ?? "none"}:${endDate ?? "none"}`,
      cacheTimeMs: 30_000,
    },
  );
}
