import {
  zoneApi,
  type UserZoneHistoryEntry,
} from "@/services/api/zones/zone.service";
import type { UserType } from "@/types/api";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

/**
 * Historique des assignations de zones d'un utilisateur (commercial ou manager),
 * via `userZoneHistory`. Alimente la section « Historique » du modal « Mes zones »
 * (lecture seule). Suit le pattern des autres hooks/api (cache + persistance
 * offline). Ne fetch pas tant que `userId` / `userType` ne sont pas connus.
 */
export function useUserZoneHistory(
  userId: number | null,
  userType: UserType | null,
): UseApiState<UserZoneHistoryEntry[]> {
  const fetchHistory = useCallback(async (): Promise<UserZoneHistoryEntry[]> => {
    if (userId == null || userId <= 0 || userType == null) return [];
    return zoneApi.getUserHistory(userId, userType);
  }, [userId, userType]);

  return useApiCall<UserZoneHistoryEntry[]>(fetchHistory, [userId, userType], {
    cacheKey: `user-zone-history:${userType ?? "none"}:${userId ?? 0}`,
    cacheTimeMs: 60_000,
    persist: true,
    skipPersistEmpty: true,
  });
}
