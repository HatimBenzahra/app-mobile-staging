import { useRef, useState } from "react";
import { api } from "@/services/api";
import type { CreateZoneInput, Zone } from "@/types/api";
import { syncWorkspaceMutation } from "./data-sync";

export function useCreateZone() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);

  const cancel = () => {
    requestVersionRef.current += 1;
    setLoading(false);
  };

  const createZone = async (input: CreateZoneInput): Promise<Zone | null> => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    try {
      setLoading(true);
      setError(null);
      const result = await api.zones.create(input);
      if (requestVersion !== requestVersionRef.current) {
        return null;
      }
      // Créer/assigner une zone change les zones du profil manager (et de ses
      // commerciaux) → invalide le cache "workspace-profile:" pour que la liste
      // "Zones" et l'overlay carte se rechargent.
      syncWorkspaceMutation("ZONE_CREATED");
      return result;
    } catch (err: any) {
      if (requestVersion !== requestVersionRef.current) {
        return null;
      }
      setError(err?.message || "Erreur creation zone");
      return null;
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  };

  return { createZone, cancel, loading, error };
}
