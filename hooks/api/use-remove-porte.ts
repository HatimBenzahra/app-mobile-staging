import { useState } from "react";

import { api } from "@/services/api";
import type { Porte } from "@/types/api";

import { syncWorkspaceMutation } from "./data-sync";

export function useRemovePorte() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (porte: {
    id: number;
    immeubleId: number;
  }): Promise<Porte | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.portes.remove(porte.id);
      syncWorkspaceMutation("PORTE_DELETED", {
        immeubleId: porte.immeubleId,
        porteId: porte.id,
      });
      return result;
    } catch (err: any) {
      setError(err?.message || "Erreur suppression porte");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading, error };
}
