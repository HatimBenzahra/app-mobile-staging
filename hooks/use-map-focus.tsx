import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type MapFocusTarget = {
  id: number;
  longitude: number;
  latitude: number;
  // Porte à mettre en avant dans le BuildingSheet (agenda : on s'intéresse à la
  // porte du RDV/repassage). Absent depuis Lieux : on met alors juste le
  // bâtiment en avant, sans ouvrir le sheet ni cibler de porte.
  porteId?: number;
};

type MapFocusContextValue = {
  focusTarget: MapFocusTarget | null;
  focusOnMap: (
    immeuble: {
      id: number;
      latitude?: number | null;
      longitude?: number | null;
    },
    options?: { porteId?: number },
  ) => void;
  clearFocus: () => void;
};

const MapFocusContext = createContext<MapFocusContextValue | undefined>(undefined);

export function MapFocusProvider({ children }: { children: React.ReactNode }) {
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget | null>(null);

  const focusOnMap = useCallback(
    (
      immeuble: { id: number; latitude?: number | null; longitude?: number | null },
      options?: { porteId?: number },
    ) => {
      // On ignore les bâtiments sans coordonnées valides (rien à centrer).
      if (immeuble.latitude == null || immeuble.longitude == null) return;
      setFocusTarget({
        id: immeuble.id,
        latitude: immeuble.latitude,
        longitude: immeuble.longitude,
        porteId: options?.porteId,
      });
    },
    [],
  );

  const clearFocus = useCallback(() => {
    setFocusTarget(null);
  }, []);

  const value = useMemo(
    () => ({ focusTarget, focusOnMap, clearFocus }),
    [focusTarget, focusOnMap, clearFocus],
  );

  return (
    <MapFocusContext.Provider value={value}>
      {children}
    </MapFocusContext.Provider>
  );
}

export function useMapFocus() {
  const context = useContext(MapFocusContext);
  if (!context) {
    throw new Error("useMapFocus must be used within MapFocusProvider");
  }
  return context;
}
