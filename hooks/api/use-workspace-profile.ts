import { api } from "@/services/api";
import type { Commercial, Manager } from "@/types/api";
import { useCallback } from "react";
import { useApiCall } from "./use-api-call";

type WorkspaceProfile = Commercial | Manager;

export function useWorkspaceProfile(userId: number | null, role: string | null) {
  const fetchProfile = useCallback(async (): Promise<WorkspaceProfile | null> => {
    if (!userId || userId <= 0) return null;
    if (role === "manager") {
      return api.managers.getPersonalById(userId);
    }
    return api.commercials.getFullById(userId);
  }, [userId, role]);

  return useApiCall<WorkspaceProfile | null>(
    fetchProfile,
    [userId, role],
    {
      cacheKey: `workspace-profile:${role ?? "unknown"}:${userId ?? 0}`,
      cacheTimeMs: 60_000,
      persist: true,
    },
  );
}
