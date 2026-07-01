import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type MapFocusTarget = {
  id: number;
  longitude: number;
  latitude: number;
};

type MapFocusContextValue = {
  focusTarget: MapFocusTarget | null;
  focusOnMap: (immeuble: {
    id: number;
    latitude?: number | null;
    longitude?: number | null;
  }) => void;
  clearFocus: () => void;
};

const MapFocusContext = createContext<MapFocusContextValue | undefined>(undefined);

export function MapFocusProvider({ children }: { children: React.ReactNode }) {
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget | null>(null);

  const focusOnMap = useCallback(
    (immeuble: { id: number; latitude?: number | null; longitude?: number | null }) => {
      // On ignore les bâtiments sans coordonnées valides (rien à centrer).
      if (immeuble.latitude == null || immeuble.longitude == null) return;
      setFocusTarget({
        id: immeuble.id,
        latitude: immeuble.latitude,
        longitude: immeuble.longitude,
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
