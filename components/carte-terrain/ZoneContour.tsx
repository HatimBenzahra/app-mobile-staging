import { colors } from "@/constants/theme";
import type { TerrainMode } from "@/hooks/carte-terrain/types";
import type { Zone } from "@/types/api";
import { GeoJSONSource, Layer, Marker } from "@maplibre/maplibre-react-native";
import type { Feature, FeatureCollection, Polygon, Position } from "geojson";
import { memo, useMemo } from "react";
import { Text, View, type NativeSyntheticEvent } from "react-native";
import { circlePolygon } from "./geo-hull";
import { styles } from "./styles";

/**
 * Contours des zones de l'utilisateur, sous les contours de quartier.
 *
 * Deux axes visuels distincts (voir légende) :
 *  - MA zone en cours (`active`) → rouge, trait PLEIN épais, nom affiché au
 *    centre. Toujours visible.
 *  - Anciennes zones → bleu, trait EN POINTILLÉS estompé. Masquées par défaut,
 *    révélées par le toggle « Anciennes zones » (`showOldZones`).
 *
 * On sépare en DEUX sources : `line-dasharray` n'étant pas data-driven dans
 * MapLibre, une source « active » (plein) et une source « anciennes » (pointillé)
 * évitent tout `case`/`filter` fragile. La source active est montée en dernier
 * → elle passe au-dessus.
 */

const ZONE_ACCENT = colors.info; // bleu — anciennes zones
const ZONE_ACTIVE_ACCENT = colors.danger; // rouge — ma zone en cours
const METERS_PER_DEG_LAT = 111_320;

type ZoneFeatureProps = { zoneId: number; nom: string; active: boolean };
type ZoneLabel = { position: [number, number]; nom: string };

type ZoneContourProps = {
  zones: Zone[];
  mode?: TerrainMode;
  onSelectZone?: (zoneId: number) => void;
  activeZoneId?: number | null;
  /** Afficher les anciennes zones (non actives). La zone active reste toujours rendue. */
  showOldZones?: boolean;
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

function buildRing(zone: Zone): Position[] | null {
  if (zone.polygon && zone.polygon.length >= 3) {
    return closeRing(zone.polygon.map((p) => [p[0], p[1]] as Position));
  }
  if (
    zone.xOrigin != null &&
    zone.yOrigin != null &&
    zone.rayon != null &&
    zone.rayon > 0
  ) {
    return closeRing(
      circlePolygon([zone.xOrigin, zone.yOrigin], zone.rayon / METERS_PER_DEG_LAT),
    );
  }
  return null;
}

function buildZoneFeature(
  ring: Position[],
  zone: Zone,
  active: boolean,
): Feature<Polygon, ZoneFeatureProps> {
  return {
    type: "Feature",
    properties: { zoneId: zone.id, nom: zone.nom, active },
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

/** Centroïde approché = moyenne des sommets uniques (anneau fermé → on ignore le dernier). */
function ringCentroid(ring: Position[]): [number, number] {
  const pts = ring.slice(0, -1);
  const n = pts.length || 1;
  const sum = pts.reduce<[number, number]>(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1]],
    [0, 0],
  );
  return [sum[0] / n, sum[1] / n];
}

export const ZoneContour = memo(function ZoneContour({
  zones,
  mode,
  onSelectZone,
  activeZoneId,
  showOldZones = false,
}: ZoneContourProps) {
  const { activeFC, oldFC, activeLabel } = useMemo(() => {
    const activeFeatures: Feature<Polygon, ZoneFeatureProps>[] = [];
    const oldFeatures: Feature<Polygon, ZoneFeatureProps>[] = [];
    let label: ZoneLabel | null = null;

    for (const zone of zones) {
      const active = zone.id === activeZoneId;
      if (!active && !showOldZones) continue; // anciennes masquées → on saute
      const ring = buildRing(zone);
      if (!ring || ring.length < 4) continue;
      const feature = buildZoneFeature(ring, zone, active);
      if (active) {
        activeFeatures.push(feature);
        label = { position: ringCentroid(ring), nom: zone.nom };
      } else {
        oldFeatures.push(feature);
      }
    }

    return {
      activeFC: {
        type: "FeatureCollection",
        features: activeFeatures,
      } as FeatureCollection<Polygon, ZoneFeatureProps>,
      oldFC: {
        type: "FeatureCollection",
        features: oldFeatures,
      } as FeatureCollection<Polygon, ZoneFeatureProps>,
      activeLabel: label,
    };
  }, [zones, activeZoneId, showOldZones]);

  const hasActive = activeFC.features.length > 0;
  const hasOld = oldFC.features.length > 0;
  if (!hasActive && !hasOld) return null;

  const handlePress = (event: NativeSyntheticEvent<{ features: Feature[] }>) => {
    if (mode !== "VISUALISATION" || !onSelectZone) return;
    // Empêche le handleMapPress de la carte de se déclencher aussi.
    event.stopPropagation?.();
    const feature = event.nativeEvent.features?.[0];
    const zoneId = (feature?.properties as ZoneFeatureProps | undefined)?.zoneId;
    if (zoneId != null) onSelectZone(zoneId);
  };

  return (
    <>
      {hasOld && (
        <GeoJSONSource id="zone-contours-old" data={oldFC} onPress={handlePress}>
          <Layer
            id="zone-fill-old"
            type="fill"
            paint={{ "fill-color": ZONE_ACCENT, "fill-opacity": 0.06 }}
          />
          <Layer
            id="zone-line-old"
            type="line"
            paint={{
              "line-color": ZONE_ACCENT,
              "line-width": 2,
              "line-opacity": 0.7,
              "line-dasharray": [2, 2],
            }}
          />
        </GeoJSONSource>
      )}

      {hasActive && (
        <GeoJSONSource
          id="zone-contours-active"
          data={activeFC}
          onPress={handlePress}
        >
          <Layer
            id="zone-fill-active"
            type="fill"
            paint={{ "fill-color": ZONE_ACTIVE_ACCENT, "fill-opacity": 0.18 }}
          />
          <Layer
            id="zone-line-active"
            type="line"
            paint={{
              "line-color": ZONE_ACTIVE_ACCENT,
              "line-width": 3,
              "line-opacity": 0.95,
            }}
          />
        </GeoJSONSource>
      )}

      {activeLabel && (
        <Marker id="zone-active-label" lngLat={activeLabel.position} anchor="center">
          <View style={styles.zoneLabelPill} pointerEvents="none">
            <Text style={styles.zoneLabelText} numberOfLines={1}>
              {activeLabel.nom}
            </Text>
          </View>
        </Marker>
      )}
    </>
  );
});
