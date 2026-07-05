import { useRef, useState } from "react";
import { api } from "@/services/api";
import type { CreateQuartierInput, Quartier } from "@/types/api";
import { syncWorkspaceMutation } from "./data-sync";

export function useCreateQuartier() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);

  const cancel = () => {
    requestVersionRef.current += 1;
    setLoading(false);
  };

  const createQuartier = async (
    input: CreateQuartierInput,
  ): Promise<Quartier | null> => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    try {
      setLoading(true);
      setError(null);
      const result = await api.immeubles.createQuartier(input);
      if (requestVersion !== requestVersionRef.current) {
        return null;
      }
      // Créer un quartier change la structure des immeubles → invalide le cache
      // "quartiers:" (et "workspace-profile:") pour que la liste se recharge
      // avant la navigation vers l'écran du quartier.
      syncWorkspaceMutation("QUARTIER_CREATED");
      return result;
    } catch (err: any) {
      if (requestVersion !== requestVersionRef.current) {
        return null;
      }
      setError(err?.message || "Erreur creation quartier");
      return null;
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  };

  return { createQuartier, cancel, loading, error };
}
