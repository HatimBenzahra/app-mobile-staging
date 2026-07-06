import { GET_ZONE_DETAIL } from "@/services/api/zones/zone.queries";
import { gql } from "@/services/core/graphql";
import type { Immeuble, Zone } from "@/types/graphql-schema";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

export type ZoneDetailImmeuble = Pick<
  Immeuble,
  "id" | "adresse" | "latitude" | "longitude"
>;

export type ZoneDetail = Pick<
  Zone,
  "id" | "nom" | "polygon" | "xOrigin" | "yOrigin" | "rayon"
> & {
  immeubles?: ZoneDetailImmeuble[] | null;
};

/**
 * Charge une zone (métadonnées + immeubles) via la query bas-niveau `zone(id)`.
 * Réutilise le client GraphQL partagé (`gql`) sans passer par zone.service.
 */
export function useZoneDetail(
  zoneId: number | null,
): UseApiState<ZoneDetail | null> {
  const fetchZone = useCallback(async (): Promise<ZoneDetail | null> => {
    if (zoneId == null || zoneId <= 0) return null;
    const response = await gql<{ zone: ZoneDetail | null }, { id: number }>(
      GET_ZONE_DETAIL,
      { id: zoneId },
    );
    return response.zone ?? null;
  }, [zoneId]);

  return useApiCall<ZoneDetail | null>(fetchZone, [zoneId], {
    cacheKey: `zone-detail:${zoneId ?? 0}`,
    cacheTimeMs: 60_000,
  });
}
