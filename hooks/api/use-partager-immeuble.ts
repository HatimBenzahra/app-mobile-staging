import { useState } from "react";
import { api } from "@/services/api";
import { getErrorMessage } from "@/services/core/graphql";
import type { ImmeubleMembre } from "@/types/api";
import { syncWorkspaceMutation } from "./data-sync";

export function usePartagerImmeuble() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partager = async (
    immeubleId: number,
    commercialId: number,
  ): Promise<ImmeubleMembre[] | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.immeubles.partager(immeubleId, commercialId);
      syncWorkspaceMutation("IMMEUBLE_UPDATED", { immeubleId });
      return result.membres;
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { partager, loading, error };
}
