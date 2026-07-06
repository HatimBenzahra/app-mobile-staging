import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { TerrainMode } from "@/hooks/carte-terrain/types";

/**
 * Signal inter-onglets pour piloter le mode de la carte terrain depuis un autre
 * onglet (ex: bouton « Créer une zone » de l'onglet Zones). Calqué sur
 * `use-map-focus` : l'écran d'accueil consomme `requestedMode` pour basculer sur
 * l'onglet Carte, et `useCarteTerrain` le consomme pour appliquer `setMode` puis
 * l'efface via `clearTerrainModeRequest`.
 */
type TerrainModeRequestContextValue = {
  requestedMode: TerrainMode | null;
  requestTerrainMode: (mode: TerrainMode) => void;
  clearTerrainModeRequest: () => void;
};

const TerrainModeRequestContext = createContext<
  TerrainModeRequestContextValue | undefined
>(undefined);

export function TerrainModeRequestProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [requestedMode, setRequestedMode] = useState<TerrainMode | null>(null);

  const requestTerrainMode = useCallback((mode: TerrainMode) => {
    setRequestedMode(mode);
  }, []);

  const clearTerrainModeRequest = useCallback(() => {
    setRequestedMode(null);
  }, []);

  const value = useMemo(
    () => ({ requestedMode, requestTerrainMode, clearTerrainModeRequest }),
    [requestedMode, requestTerrainMode, clearTerrainModeRequest],
  );

  return (
    <TerrainModeRequestContext.Provider value={value}>
      {children}
    </TerrainModeRequestContext.Provider>
  );
}

export function useTerrainModeRequest() {
  const context = useContext(TerrainModeRequestContext);
  if (!context) {
    throw new Error(
      "useTerrainModeRequest must be used within TerrainModeRequestProvider",
    );
  }
  return context;
}
