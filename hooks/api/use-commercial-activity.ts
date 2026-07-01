import { api } from "@/services/api";
import type { Porte } from "@/types/api";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

export function useCommercialActivity(immeubleId?: number) {
  const fetchModified = useCallback(
    async () => api.statistics.getPortesModifiedToday(immeubleId),
    [immeubleId],
  );
  const fetchRdvToday = useCallback(
    async () => api.statistics.getPortesRdvToday(),
    [],
  );

  const modified = useApiCall<Porte[]>(
    fetchModified,
    [immeubleId],
    {
      cacheKey: `commercial-activity:modified:${immeubleId ?? 0}`,
      cacheTimeMs: 20_000,
    },
  );

  const rdvToday = useApiCall<Porte[]>(
    fetchRdvToday,
    [],
    {
      cacheKey: "commercial-activity:rdv-today",
      cacheTimeMs: 20_000,
    },
  );

  return { modified, rdvToday };
}
