import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import { colors } from "@/constants/theme";
import type { TerrainMode } from "@/hooks/carte-terrain/types";
import type { Immeuble } from "@/types/api";
import { Marker } from "@maplibre/maplibre-react-native";
import { View } from "react-native";
import { styles } from "./styles";

/**
 * Marqueurs terrain rendus en overlay React (`<Marker>`), choix connu-fonctionnel
 * sur device. Deux axes visuels indépendants :
 *  - COULEUR du badge = propriétaire → teal (#0D9488) MINE / amber (#D97706) TEAM.
 *  - ICÔNE d'habitat (HabitatIcon) → office-building / home / home-group, etc.
 * Les immeubles créés via un quartier apparaissent comme des marqueurs bâtiment
 * standards (ils portent commercialId/managerId), il n'y a plus de badge dédié.
 */

const OWNERSHIP_MINE = "#0D9488";
const OWNERSHIP_TEAM = "#D97706";

type TerrainMarkersProps = {
  immeubles: Immeuble[];
  mode: TerrainMode;
  onSelectLieu: (immeuble: Immeuble) => void;
};

export function TerrainMarkers({
  immeubles,
  mode,
  onSelectLieu,
}: TerrainMarkersProps) {
  return (
    <>
      {immeubles
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
              <View style={[styles.mapMarker, { backgroundColor: fill }]}>
                <HabitatIcon
                  type={immeuble.typeHabitat}
                  size={18}
                  color={colors.textOnPrimary}
                />
              </View>
            </Marker>
          );
        })}
    </>
  );
}
