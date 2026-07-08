import { api } from "@/services/api";
import { authService } from "@/services/auth";
import type { Quartier } from "@/types/api";
import { useCallback, useEffect, useState } from "react";
import { useApiCall } from "./use-api-call";

export function useMobileMapQuartiers() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [id, r] = await Promise.all([
        authService.getUserId(),
        authService.getUserRole(),
      ]);
      if (!mounted) return;
      setUserId(id);
      setRole(r);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchQuartiers = useCallback(async (): Promise<Quartier[]> => {
    if (!userId || userId <= 0 || !role) return [];
    return api.immeubles.getMobileMapQuartiers();
  }, [role, userId]);

  return useApiCall<Quartier[]>(fetchQuartiers, [userId, role], {
    cacheKey: `mobile-map-quartiers:${role ?? "unknown"}:${userId ?? 0}`,
    cacheTimeMs: 60_000,
    persist: true,
    skipPersistEmpty: true,
  });
}
