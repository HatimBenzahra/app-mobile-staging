import { api } from "@/services/api";
import type { BadgeCategory, BadgeDefinitionType } from "@/types/graphql-schema";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

/** Catalogue des badges actifs (pour afficher obtenus vs verrouillés). */
export function useBadgeCatalog(category?: BadgeCategory) {
  const fetch = useCallback(() => api.gamification.getBadgeDefinitions(category, true), [category]);

  return useApiCall<BadgeDefinitionType[]>(fetch, [category], {
    cacheKey: `gamification:catalog:${category ?? "all"}`,
    cacheTimeMs: 300_000,
  });
}
