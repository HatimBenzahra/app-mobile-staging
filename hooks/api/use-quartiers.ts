import { api } from "@/services/api";
import { authService } from "@/services/auth";
import type { Quartier } from "@/types/api";
import { useEffect, useState } from "react";
import { useApiCall } from "./use-api-call";

export function useQuartiers() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [id, r] = await Promise.all([
        authService.getUserId(),
        authService.getUserRole(),
      ]);
      setUserId(id);
      setRole(r);
    };
    void load();
  }, []);

  return useApiCall<Quartier[]>(
    async () => {
      if (!userId || userId <= 0) return [];
      return api.immeubles.getQuartiers();
    },
    [userId, role],
    {
      cacheKey: `quartiers:${role ?? "unknown"}:${userId ?? 0}`,
      cacheTimeMs: 60_000,
      persist: true,
      skipPersistEmpty: true,
    },
  );
}
