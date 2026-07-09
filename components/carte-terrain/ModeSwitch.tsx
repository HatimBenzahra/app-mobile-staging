import { colors } from "@/constants/theme";
import { Icon, type IconName } from "@/components/ui";
import type { TerrainMode } from "@/hooks/carte-terrain/types";
import { Pressable, Text, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { styles } from "./styles";

type ModeMeta = { icon: IconName; label: string };

const MODE_META: Record<TerrainMode, ModeMeta> = {
  VISUALISATION: { icon: "eye", label: "Vue" },
  BATIMENT: { icon: "map-pin", label: "Bâtiment" },
  QUARTIER: { icon: "map", label: "Quartier" },
};

// Bouton retour (MapFabs) : left 16 + largeur 42 + marge. On décale le
// ModeSwitch quand il est présent (route empilée) pour éviter le chevauchement.
const BACK_FAB_CLEARANCE = 68;

type ModeSwitchProps = {
  insets: EdgeInsets;
  mode: TerrainMode;
  onSelectMode: (nextMode: TerrainMode) => void;
  /** Carte embarquée (onglet) : pas de bouton retour → le ModeSwitch peut
   *  prendre toute la largeur. En route empilée, on laisse la place au retour. */
  embedded: boolean;
};

export function ModeSwitch({
  insets,
  mode,
  onSelectMode,
  embedded,
}: ModeSwitchProps) {
  const modes: TerrainMode[] = ["VISUALISATION", "BATIMENT", "QUARTIER"];

  return (
    <View
      style={[
        styles.modeSwitch,
        { top: insets.top + 10 },
        !embedded && { left: BACK_FAB_CLEARANCE },
      ]}
    >
      {modes.map((nextMode) => {
        const selected = mode === nextMode;
        const meta = MODE_META[nextMode];
        return (
          <Pressable
            key={nextMode}
            style={[styles.modeButton, selected && styles.modeButtonSelected]}
            onPress={() => onSelectMode(nextMode)}
          >
            <Icon
              name={meta.icon}
              size={15}
              color={selected ? colors.textOnPrimary : colors.primary}
            />
            <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
