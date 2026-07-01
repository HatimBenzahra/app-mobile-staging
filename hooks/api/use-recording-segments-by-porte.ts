import { api } from "@/services/api";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

export function useLastPorteRecordingDuration(porteId: number | null) {
  const fetchDuration = useCallback(async (): Promise<number | null> => {
    if (!porteId || porteId <= 0) return null;
    return api.recordings.getLastPorteDurationSec(porteId);
  }, [porteId]);

  return useApiCall<number | null>(
    fetchDuration,
    [porteId],
    {
      cacheKey: `recording-duration:porte:${porteId ?? 0}`,
      cacheTimeMs: 30_000,
    },
  );
}
