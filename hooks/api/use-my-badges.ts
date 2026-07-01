import { api } from "@/services/api";
import type { CommercialBadgeType } from "@/types/graphql-schema";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

type Role = "commercial" | "manager";

/** Badges obtenus par l'utilisateur courant (route vers commercialBadges ou managerBadges selon le rôle). */
export function useMyBadges(userId: number | null, role: Role | null) {
  const fetch = useCallback(async () => {
    if (!userId || !role) return [];
    return role === "manager"
      ? api.gamification.getManagerBadges(userId)
      : api.gamification.getCommercialBadges(userId);
  }, [userId, role]);

  return useApiCall<CommercialBadgeType[]>(fetch, [userId, role], {
    cacheKey: `gamification:badges:${role ?? "none"}:${userId ?? 0}`,
    cacheTimeMs: 60_000,
  });
}
