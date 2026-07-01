import { api } from "@/services/api";
import type { ContratValideType } from "@/types/graphql-schema";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

type Role = "commercial" | "manager";

/** Contrats validés de l'utilisateur courant (base du calcul de progression des badges). */
export function useMyContracts(userId: number | null, role: Role | null) {
  const fetch = useCallback(async () => {
    if (!userId || !role) return [];
    return role === "manager"
      ? api.gamification.getContratsByManager(userId)
      : api.gamification.getContratsByCommercial(userId);
  }, [userId, role]);

  return useApiCall<ContratValideType[]>(fetch, [userId, role], {
    cacheKey: `gamification:contracts:${role ?? "none"}:${userId ?? 0}`,
    cacheTimeMs: 60_000,
  });
}
