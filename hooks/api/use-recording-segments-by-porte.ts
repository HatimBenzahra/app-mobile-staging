import { api } from "@/services/api";
import { useApiCall } from "./use-api-call";

export function useLastPorteRecordingDuration(porteId: number | null) {
  return useApiCall<number | null>(
    async () => {
      if (!porteId || porteId <= 0) return null;
      return api.recordings.getLastPorteDurationSec(porteId);
    },
    [porteId],
    {
      cacheKey: `recording-duration:porte:${porteId ?? 0}`,
      cacheTimeMs: 30_000,
    },
  );
}
