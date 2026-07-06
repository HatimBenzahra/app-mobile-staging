import { colors } from "@/constants/theme";
import type { DraftPin } from "@/hooks/carte-terrain/types";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import { memo, useMemo } from "react";

/**
 * Tracé LIVE de la zone en cours de création (mode ZONE) : le polygone est
 * construit directement depuis l'ordre des sommets posés par le manager (pas une
 * enveloppe convexe comme les quartiers). Même accent que `ZoneContour`
 * (colors.info) pour rester cohérent avec l'overlay des zones existantes.
 *  - ≥ 3 sommets → polygone rempli + contour (anneau fermé) ;
 *  - 2 sommets   → simple ligne (aperçu du premier segment) ;
 *  - < 2 sommets → rien à tracer.
 */

const ZONE_ACCENT = colors.info;

type ZoneDraftProps = {
  zonePins: DraftPin[];
};

export const ZoneDraft = memo(function ZoneDraft({ zonePins }: ZoneDraftProps) {
  const featureCollection = useMemo<FeatureCollection<Geometry>>(() => {
    const ring: Position[] = zonePins.map((pin) => [pin.longitude, pin.latitude]);
    if (ring.length < 2) {
      return { type: "FeatureCollection", features: [] };
    }

    let geometry: Geometry;
    if (ring.length >= 3) {
      geometry = { type: "Polygon", coordinates: [[...ring, ring[0]]] };
    } else {
      geometry = { type: "LineString", coordinates: ring };
    }

    const feature: Feature<Geometry> = {
      type: "Feature",
      properties: {},
      geometry,
    };
    return { type: "FeatureCollection", features: [feature] };
  }, [zonePins]);

  if (featureCollection.features.length === 0) return null;

  return (
    <GeoJSONSource id="zone-draft" data={featureCollection}>
      <Layer
        id="zone-draft-fill"
        type="fill"
        paint={{ "fill-color": ZONE_ACCENT, "fill-opacity": 0.12 }}
      />
      <Layer
        id="zone-draft-line"
        type="line"
        paint={{ "line-color": ZONE_ACCENT, "line-width": 2, "line-opacity": 0.9 }}
      />
    </GeoJSONSource>
  );
});
