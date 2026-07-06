import { colors } from "@/constants/theme";
import type { Zone } from "@/types/api";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import type { Feature, FeatureCollection, Polygon, Position } from "geojson";
import { memo, useMemo } from "react";
import { circlePolygon } from "./geo-hull";

/**
 * Contour translucide de la (des) zone(s) assignée(s) à l'utilisateur, affiché
 * sous les contours de quartier (z-order inférieur). Overlay purement visuel :
 * pas d'interaction en v1.
 *
 * Géométrie par zone :
 *  - `polygon` (anneau [[lng,lat],…], ≥ 3 points) → contour exact ;
 *  - sinon `xOrigin/yOrigin/rayon` → cercle approximé (rayon converti de mètres
 *    en degrés de latitude : 1° ≈ 111 320 m).
 * L'anneau est fermé (premier == dernier point) suivant la convention géométrique
 * du module `geo-hull`.
 */

const ZONE_ACCENT = colors.info;
const METERS_PER_DEG_LAT = 111_320;

type ZoneFeatureProps = { zoneId: number };

type ZoneContourProps = {
  zones: Zone[];
};

function closeRing(ring: Position[]): Position[] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, [first[0], first[1]]];
  }
  return ring;
}

function buildZoneFeature(zone: Zone): Feature<Polygon, ZoneFeatureProps> | null {
  let ring: Position[] | null = null;

  if (zone.polygon && zone.polygon.length >= 3) {
    ring = closeRing(zone.polygon.map((p) => [p[0], p[1]] as Position));
  } else if (
    zone.xOrigin != null &&
    zone.yOrigin != null &&
    zone.rayon != null &&
    zone.rayon > 0
  ) {
    ring = closeRing(
      circlePolygon([zone.xOrigin, zone.yOrigin], zone.rayon / METERS_PER_DEG_LAT),
    );
  }

  if (!ring || ring.length < 4) return null;

  return {
    type: "Feature",
    properties: { zoneId: zone.id },
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

export const ZoneContour = memo(function ZoneContour({ zones }: ZoneContourProps) {
  const featureCollection = useMemo<FeatureCollection<Polygon, ZoneFeatureProps>>(() => {
    const features = zones
      .map(buildZoneFeature)
      .filter((feature): feature is Feature<Polygon, ZoneFeatureProps> => feature !== null);
    return { type: "FeatureCollection", features };
  }, [zones]);

  if (featureCollection.features.length === 0) return null;

  return (
    <GeoJSONSource id="zone-contours" data={featureCollection}>
      <Layer
        id="zone-fill"
        type="fill"
        paint={{ "fill-color": ZONE_ACCENT, "fill-opacity": 0.1 }}
      />
      <Layer
        id="zone-line"
        type="line"
        paint={{ "line-color": ZONE_ACCENT, "line-width": 2, "line-opacity": 0.9 }}
      />
    </GeoJSONSource>
  );
});
