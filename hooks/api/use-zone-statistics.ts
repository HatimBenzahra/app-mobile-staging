import { GET_ZONE_STATISTICS } from "@/services/api/zones/zone.queries";
import { gql } from "@/services/core/graphql";
import type { ZoneStatistic } from "@/types/graphql-schema";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

/**
 * Agrégat de stats d'une zone. `zoneStatistics` renvoie toutes les zones : on
 * filtre côté client sur la bonne `zoneId`. Réutilise le client `gql` partagé.
 */
export function useZoneStatistics(
  zoneId: number | null,
): UseApiState<ZoneStatistic | null> {
  const fetchStatistics = useCallback(async (): Promise<ZoneStatistic | null> => {
    if (zoneId == null || zoneId <= 0) return null;
    const response = await gql<{ zoneStatistics: ZoneStatistic[] }>(
      GET_ZONE_STATISTICS,
    );
    return response.zoneStatistics.find((s) => s.zoneId === zoneId) ?? null;
  }, [zoneId]);

  return useApiCall<ZoneStatistic | null>(fetchStatistics, [zoneId], {
    cacheKey: `zone-statistics:${zoneId ?? 0}`,
    cacheTimeMs: 60_000,
  });
}
