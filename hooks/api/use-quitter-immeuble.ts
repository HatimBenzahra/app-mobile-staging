import { useState } from "react";
import { api } from "@/services/api";
import { getErrorMessage } from "@/services/core/graphql";
import { syncWorkspaceMutation } from "./data-sync";

export function useQuitterImmeuble() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quitter = async (immeubleId: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await api.immeubles.quitter(immeubleId);
      // Vu de l'utilisateur, l'immeuble sort de son espace (Lieux, carte, stats).
      syncWorkspaceMutation("IMMEUBLE_DELETED", { immeubleId });
      return true;
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { quitter, loading, error };
}
