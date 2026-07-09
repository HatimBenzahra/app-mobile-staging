import { CURRENT_USER_ASSIGNMENT } from "@/services/api/zones/zone.queries";
import { gql } from "@/services/core/graphql";
import type { UserType, Zone } from "@/types/api";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

/**
 * Assignation active (ZoneEnCours, UNIQUE par utilisateur) : `zoneId`, date
 * d'assignation, et la zone complète (géométrie) → suffit à dessiner « ma zone
 * en cours » sur la carte et à l'afficher dans le modal, sans passer par
 * `zonesForUser`.
 */
export type CurrentUserAssignment = {
  zoneId: number;
  assignedAt?: string | null;
  zone: Zone | null;
};

/**
 * Assignation active (ZoneEnCours) de l'utilisateur courant, via
 * `currentUserAssignment`. Sert à recentrer la carte sur « ma zone » (FAB).
 * Ne fetch pas tant que `userId` / `userType` ne sont pas connus.
 */
export function useCurrentAssignment(
  userId: number | null,
  userType: UserType | null,
): UseApiState<CurrentUserAssignment | null> {
  const fetchAssignment = useCallback(async (): Promise<CurrentUserAssignment | null> => {
    if (userId == null || userId <= 0 || userType == null) return null;
    const response = await gql<
      { currentUserAssignment: CurrentUserAssignment | null },
      { userId: number; userType: UserType }
    >(CURRENT_USER_ASSIGNMENT, { userId, userType });
    return response.currentUserAssignment;
  }, [userId, userType]);

  return useApiCall<CurrentUserAssignment | null>(fetchAssignment, [userId, userType], {
    cacheKey: `current-assignment:${userType ?? "none"}:${userId ?? 0}`,
    cacheTimeMs: 60_000,
  });
}
