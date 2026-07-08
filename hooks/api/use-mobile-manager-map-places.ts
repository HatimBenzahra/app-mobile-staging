import { api } from "@/services/api";
import type { MobileMapPlace } from "@/types/api";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

export function useMobileManagerMapPlaces(
  enabled: boolean,
  includeTeam: boolean,
): UseApiState<MobileMapPlace[]> {
  const fetchPlaces = useCallback(async (): Promise<MobileMapPlace[]> => {
    if (!enabled) return [];
    return api.immeubles.getMobileManagerMapPlaces(includeTeam);
  }, [enabled, includeTeam]);

  return useApiCall<MobileMapPlace[]>(fetchPlaces, [enabled, includeTeam], {
    cacheKey: `mobile-manager-map-places:${enabled ? "manager" : "off"}:${includeTeam ? "team" : "own"}`,
    cacheTimeMs: 60_000,
    persist: true,
    skipPersistEmpty: true,
  });
}
