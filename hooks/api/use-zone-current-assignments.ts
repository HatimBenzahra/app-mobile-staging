import { GET_ZONE_CURRENT_ASSIGNMENTS } from "@/services/api/zones/zone.queries";
import { gql } from "@/services/core/graphql";
import type { ZoneEnCours } from "@/types/graphql-schema";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

export type ZoneAssignment = Pick<
  ZoneEnCours,
  "id" | "userId" | "userType" | "zoneId" | "assignedAt"
>;

/**
 * Assignations actives d'une zone (`zoneCurrentAssignments`). Réutilise le
 * client `gql` partagé sans toucher aux services zone réservés.
 */
export function useZoneCurrentAssignments(
  zoneId: number | null,
): UseApiState<ZoneAssignment[]> {
  const fetchAssignments = useCallback(async (): Promise<ZoneAssignment[]> => {
    if (zoneId == null || zoneId <= 0) return [];
    const response = await gql<
      { zoneCurrentAssignments: ZoneAssignment[] },
      { zoneId: number }
    >(GET_ZONE_CURRENT_ASSIGNMENTS, { zoneId });
    return response.zoneCurrentAssignments;
  }, [zoneId]);

  return useApiCall<ZoneAssignment[]>(fetchAssignments, [zoneId], {
    cacheKey: `zone-assignments:${zoneId ?? 0}`,
    cacheTimeMs: 60_000,
  });
}
