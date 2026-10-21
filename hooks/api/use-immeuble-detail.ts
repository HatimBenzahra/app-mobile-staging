import { api } from "@/services/api";
import type { Immeuble } from "@/types/api";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

/**
 * Détail d'un immeuble (`mobileImmeubleDetail`) : membres, portes et auteur du
 * dernier passage de chaque porte. Rechargé par data-sync après toute mutation
 * (préfixe `immeuble-detail:`). Ne fetch pas tant que l'id est inconnu.
 */
export function useImmeubleDetail(
  immeubleId: number | null,
): UseApiState<Immeuble | null> {
  const fetchDetail = useCallback(async (): Promise<Immeuble | null> => {
    if (immeubleId == null || immeubleId <= 0) return null;
    return api.immeubles.getMobileDetail(immeubleId);
  }, [immeubleId]);

  return useApiCall<Immeuble | null>(fetchDetail, [immeubleId], {
    cacheKey: `immeuble-detail:${immeubleId ?? 0}`,
    cacheTimeMs: 15_000,
  });
}
