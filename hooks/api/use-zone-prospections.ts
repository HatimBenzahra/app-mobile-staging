import { GET_ZONE_PROSPECTIONS } from "@/services/api/zones/zone.queries";
import { gql } from "@/services/core/graphql";
import type { ZoneProspection } from "@/types/graphql-schema";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

/**
 * Prospections d'une zone (`zoneProspections`, triées par date desc côté
 * serveur). Réutilise le client `gql` partagé.
 */
export function useZoneProspections(
  zoneId: number | null,
): UseApiState<ZoneProspection[]> {
  const fetchProspections = useCallback(async (): Promise<ZoneProspection[]> => {
    if (zoneId == null || zoneId <= 0) return [];
    const response = await gql<
      { zoneProspections: ZoneProspection[] },
      { zoneId: number }
    >(GET_ZONE_PROSPECTIONS, { zoneId });
    return response.zoneProspections;
  }, [zoneId]);

  return useApiCall<ZoneProspection[]>(fetchProspections, [zoneId], {
    cacheKey: `zone-prospections:${zoneId ?? 0}`,
    cacheTimeMs: 60_000,
  });
}
