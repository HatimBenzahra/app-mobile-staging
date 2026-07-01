import { api } from "@/services/api";
import type { Commercial } from "@/types/api";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

export function useCommercials() {
  const fetchCommercials = useCallback(() => api.commercials.getAll(), []);
  return useApiCall<Commercial[]>(fetchCommercials, [], {
    cacheKey: "commercials:all",
    cacheTimeMs: 120_000,
  });
}
