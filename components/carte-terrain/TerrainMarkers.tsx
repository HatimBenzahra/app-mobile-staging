import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import { colors } from "@/constants/theme";
import type { TerrainMode } from "@/hooks/carte-terrain/types";
import type { Immeuble, TypeHabitat } from "@/types/api";
import { Marker } from "@maplibre/maplibre-react-native";
import { memo, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { styles } from "./styles";

/**
 * Marqueurs terrain rendus en overlay React (`<Marker>`), choix connu-fonctionnel
 * sur device. Deux axes visuels indépendants :
 *  - COULEUR du badge = propriétaire → teal (#0D9488) MINE / amber (#D97706) TEAM.
 *  - ICÔNE d'habitat (HabitatIcon) → office-building / home / home-group, etc.
 * Les immeubles créés via un quartier apparaissent comme des marqueurs bâtiment
 * standards (ils portent commercialId/managerId), il n'y a plus de badge dédié.
 *
 * Quand `highlightedId` correspond à un bâtiment (suite à "Voir sur la carte"),
 * son badge s'agrandit et pulse (halo + scale) tant qu'il reste mis en avant.
 */

const OWNERSHIP_MINE = "#0D9488";
const OWNERSHIP_TEAM = "#D97706";

type TerrainMarkersProps = {
  immeubles: Immeuble[];
  mode: TerrainMode;
  highlightedId?: number | null;
  onSelectLieu: (immeuble: Immeuble) => void;
};

/**
 * Badge toujours monté pour chaque marqueur (hooks reanimated jamais conditionnels).
 * N'anime — scale + halo qui pulse — que lorsque `highlighted` est vrai ; sinon
 * rendu strictement identique au badge d'origine.
 */
const PulsingMarkerBadge = memo(function PulsingMarkerBadge({
  fill,
  typeHabitat,
  highlighted,
}: {
  fill: string;
  typeHabitat?: TypeHabitat;
  highlighted: boolean;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (highlighted) {
      pulse.value = 0;
      pulse.value = withRepeat(
        withTiming(1, { duration: 800 }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
    return () => {
      cancelAnimation(pulse);
    };
  }, [highlighted, pulse]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.25 }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.45 - pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 1.1 }],
  }));

  if (!highlighted) {
    return (
      <View style={[styles.mapMarker, { backgroundColor: fill }]}>
        <HabitatIcon type={typeHabitat} size={18} color={colors.textOnPrimary} />
      </View>
    );
  }

  return (
    <View style={localStyles.highlightWrap}>
      <Animated.View
        pointerEvents="none"
        style={[localStyles.halo, { backgroundColor: fill }, haloStyle]}
      />
      <Animated.View style={[styles.mapMarker, { backgroundColor: fill }, badgeStyle]}>
        <HabitatIcon type={typeHabitat} size={18} color={colors.textOnPrimary} />
      </Animated.View>
    </View>
  );
});

export const TerrainMarkers = memo(function TerrainMarkers({
  immeubles,
  mode,
  highlightedId,
  onSelectLieu,
}: TerrainMarkersProps) {
  const markers = useMemo(
    () =>
      immeubles
        .filter((immeuble) => immeuble.latitude != null && immeuble.longitude != null)
        .map((immeuble) => {
          const fill =
            immeuble.ownership === "TEAM" ? OWNERSHIP_TEAM : OWNERSHIP_MINE;
          return (
            <Marker
              key={`immeuble-${immeuble.id}`}
              id={`immeuble-${immeuble.id}`}
              lngLat={[immeuble.longitude!, immeuble.latitude!]}
              anchor="bottom"
              onPress={(event) => {
                event.stopPropagation();
                if (mode !== "VISUALISATION") return;
                onSelectLieu(immeuble);
              }}
            >
              <PulsingMarkerBadge
                fill={fill}
                typeHabitat={immeuble.typeHabitat}
                highlighted={highlightedId === immeuble.id}
              />
            </Marker>
          );
        }),
    [immeubles, mode, highlightedId, onSelectLieu],
  );

  return <>{markers}</>;
});

const localStyles = StyleSheet.create({
  highlightWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
  },
});
