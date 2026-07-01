import { api } from "@/services/api";
import type { Manager } from "@/types/api";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

export function useManagers() {
  const fetchManagers = useCallback(() => api.managers.getAll(), []);
  return useApiCall<Manager[]>(fetchManagers, [], {
    cacheKey: "managers:all",
    cacheTimeMs: 120_000,
  });
}
