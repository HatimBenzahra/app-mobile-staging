import type { TerrainMode } from "@/hooks/carte-terrain/types";
import type { Immeuble, Quartier } from "@/types/api";
import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { memo, useMemo } from "react";
import type { NativeSyntheticEvent } from "react-native";
import { router } from "expo-router";
import { buildQuartierFeature } from "./geo-hull";

/**
 * Contours translucides des quartiers : un polygone (enveloppe des bâtiments du
 * quartier) par quartier, regroupés dans une seule source GeoJSON. Tap sur le
 * remplissage en VISUALISATION → navigation vers la liste des bâtiments du
 * quartier. Les marqueurs bâtiment restent inchangés et au-dessus.
 */

const QUARTIER_VIOLET = "#7C3AED";

type QuartierFeatureProps = { quartierId: number; nom: string };

type QuartierContoursProps = {
  quartiers: Quartier[];
  /** Bâtiments actuellement visibles sur la carte (déjà filtrés par le toggle équipe). */
  immeubles: Immeuble[];
  mode: TerrainMode;
};

export const QuartierContours = memo(function QuartierContours({
  quartiers,
  immeubles,
  mode,
}: QuartierContoursProps) {
  // Ids des bâtiments visibles : un quartier n'est contouré que sur ces bâtiments.
  // Quand le toggle équipe est OFF, les bâtiments d'équipe disparaissent de cette
  // liste → le contour du quartier d'équipe disparaît implicitement.
  const visibleIds = useMemo(() => new Set(immeubles.map((im) => im.id)), [immeubles]);

  const featureCollection = useMemo<FeatureCollection<Polygon, QuartierFeatureProps>>(() => {
    const features = quartiers
      .map((quartier) =>
        buildQuartierFeature({
          ...quartier,
          immeubles: (quartier.immeubles ?? []).filter((im) => visibleIds.has(im.id)),
        }),
      )
      .filter((feature): feature is Feature<Polygon, QuartierFeatureProps> => feature !== null);
    return { type: "FeatureCollection", features };
  }, [quartiers, visibleIds]);

  if (featureCollection.features.length === 0) return null;

  return (
    <GeoJSONSource
      id="quartier-contours"
      data={featureCollection}
      onPress={(event: NativeSyntheticEvent<{ features: Feature[] }>) => {
        if (mode !== "VISUALISATION") return;
        // Empêche le handleMapPress de la carte de se déclencher aussi.
        event.stopPropagation?.();
        const feature = event.nativeEvent.features?.[0];
        const quartierId = (feature?.properties as QuartierFeatureProps | undefined)?.quartierId;
        if (quartierId != null) router.push(`/quartier/${quartierId}`);
      }}
    >
      <Layer
        id="quartier-fill"
        type="fill"
        paint={{ "fill-color": QUARTIER_VIOLET, "fill-opacity": 0.12 }}
      />
      <Layer
        id="quartier-line"
        type="line"
        paint={{ "line-color": QUARTIER_VIOLET, "line-width": 2, "line-opacity": 0.9 }}
      />
    </GeoJSONSource>
  );
});
