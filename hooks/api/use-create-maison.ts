import { useRef, useState } from "react";
import { api } from "@/services/api";
import type { CreateImmeubleInput, Immeuble } from "@/types/api";
import { syncWorkspaceMutation } from "./data-sync";

export function useCreateMaison() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);

  const cancel = () => {
    requestVersionRef.current += 1;
    setLoading(false);
  };

  const createMaison = async (
    input: CreateImmeubleInput,
  ): Promise<Immeuble | null> => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    try {
      setLoading(true);
      setError(null);
      const result = await api.immeubles.createMaison({
        ...input,
        typeHabitat: "MAISON",
        nbEtages: 1,
        nbPortesParEtage: 1,
        ascenseurPresent: false,
      });
      if (requestVersion !== requestVersionRef.current) {
        return null;
      }
      syncWorkspaceMutation("IMMEUBLE_CREATED", { immeubleId: result.id });
      return result;
    } catch (err: any) {
      if (requestVersion !== requestVersionRef.current) {
        return null;
      }
      setError(err?.message || "Erreur creation maison");
      return null;
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  };

  return { createMaison, cancel, loading, error };
}
