import { api } from "@/services/api";
import type { Coequipier } from "@/types/api";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

/**
 * Coéquipiers (même manager, hors soi) à qui partager un immeuble. Monté avec
 * la feuille de partage : ne fetch qu'à son ouverture.
 */
export function useMesCoequipiers(): UseApiState<Coequipier[]> {
  const fetchCoequipiers = useCallback(
    async (): Promise<Coequipier[]> => api.immeubles.getMesCoequipiers(),
    [],
  );

  return useApiCall<Coequipier[]>(fetchCoequipiers, [], {
    cacheKey: "mes-coequipiers",
    cacheTimeMs: 5 * 60_000,
  });
}
