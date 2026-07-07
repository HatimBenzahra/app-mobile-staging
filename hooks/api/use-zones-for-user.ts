import { zoneApi, type ZoneForUser } from "@/services/api/zones/zone.service";
import type { UserType } from "@/types/api";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

/**
 * Zones à afficher pour un utilisateur, via `zonesForUser` (source de vérité :
 * commercial = ZoneEnCours ; manager = zones possédées OU assignées). Chaque
 * zone embarque ses immeubles (points + compte). Suit le pattern des autres
 * hooks/api (cache + persistance offline). Ne fetch pas tant que `userId` /
 * `userType` ne sont pas connus.
 */
export function useZonesForUser(
  userId: number | null,
  userType: UserType | null,
): UseApiState<ZoneForUser[]> {
  const fetchZones = useCallback(async (): Promise<ZoneForUser[]> => {
    if (userId == null || userId <= 0 || userType == null) return [];
    return zoneApi.getForUser(userId, userType);
  }, [userId, userType]);

  return useApiCall<ZoneForUser[]>(fetchZones, [userId, userType], {
    cacheKey: `zones-for-user:${userType ?? "none"}:${userId ?? 0}`,
    cacheTimeMs: 60_000,
    persist: true,
    skipPersistEmpty: true,
  });
}
