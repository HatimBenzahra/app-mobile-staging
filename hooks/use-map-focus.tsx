import { zoneBounds, type ZoneBoundsInput } from "@/components/carte-terrain/geo-hull";
import type { LngLatBounds } from "@maplibre/maplibre-react-native";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Cible de focus carte. Deux formes discriminées par `kind` :
 *  - `point` : un bâtiment (recentrage + highlight), avec porte optionnelle à
 *    mettre en avant dans le BuildingSheet (agenda : on s'intéresse à la porte du
 *    RDV/repassage ; absent depuis Lieux → on met juste le bâtiment en avant).
 *  - `zone` : une zone, cadrée via `fitBounds` sur ses `bounds`
 *    (`[minLng,minLat,maxLng,maxLat]`, ordre `LngLatBounds` MapLibre).
 */
export type MapFocusTarget =
  | {
      kind: "point";
      id: number;
      longitude: number;
      latitude: number;
      porteId?: number;
    }
  | {
      kind: "zone";
      id: number;
      bounds: LngLatBounds;
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
  focusOnZone: (zone: ZoneBoundsInput & { id: number }) => void;
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
        kind: "point",
        id: immeuble.id,
        latitude: immeuble.latitude,
        longitude: immeuble.longitude,
        porteId: options?.porteId,
      });
    },
    [],
  );

  const focusOnZone = useCallback((zone: ZoneBoundsInput & { id: number }) => {
    const bounds = zoneBounds(zone);
    // Pas de géométrie exploitable → rien à cadrer.
    if (!bounds) return;
    setFocusTarget({ kind: "zone", id: zone.id, bounds });
  }, []);

  const clearFocus = useCallback(() => {
    setFocusTarget(null);
  }, []);

  const value = useMemo(
    () => ({ focusTarget, focusOnMap, focusOnZone, clearFocus }),
    [focusTarget, focusOnMap, focusOnZone, clearFocus],
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
