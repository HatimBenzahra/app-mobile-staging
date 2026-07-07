import { GET_ZONE_STATISTICS } from "@/services/api/zones/zone.queries";
import { gql } from "@/services/core/graphql";
import type { ZoneStatistic } from "@/types/graphql-schema";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

/**
 * Liste complète des agrégats de zones du périmètre courant (`zoneStatistics`
 * renvoie toutes les zones accessibles). Une seule requête, mappée ensuite par
 * `zoneId` côté écran Zones — évite une requête stats par carte. Réutilise le
 * client `gql` partagé.
 */
export function useZoneStatisticsList(): UseApiState<ZoneStatistic[]> {
  const fetchStatistics = useCallback(async (): Promise<ZoneStatistic[]> => {
    const response = await gql<{ zoneStatistics: ZoneStatistic[] }>(
      GET_ZONE_STATISTICS,
    );
    return response.zoneStatistics;
  }, []);

  return useApiCall<ZoneStatistic[]>(fetchStatistics, [], {
    cacheKey: "zone-statistics:all",
    cacheTimeMs: 60_000,
  });
}
