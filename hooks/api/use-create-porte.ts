import { useState } from "react";
import { api } from "@/services/api";
import type { CreatePorteInput, Porte } from "@/types/api";
import { syncWorkspaceMutation } from "./data-sync";

export function useCreatePorte() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (
    input: CreatePorteInput,
  ): Promise<{ porte: Porte | null; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.portes.create(input);
      syncWorkspaceMutation("PORTE_CREATED", {
        immeubleId: input.immeubleId,
        porteId: result.id,
      });
      return { porte: result };
    } catch (err: any) {
      const message = err?.message || "Erreur creation porte";
      setError(message);
      return { porte: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}
