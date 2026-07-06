import { colors } from "@/constants/theme";
import type { TerrainMode } from "@/hooks/carte-terrain/types";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { styles } from "./styles";

type ModeMeta = { icon: keyof typeof Feather.glyphMap; label: string };

const MODE_META: Record<TerrainMode, ModeMeta> = {
  VISUALISATION: { icon: "eye", label: "Voir" },
  BATIMENT: { icon: "map-pin", label: "Batiment" },
  QUARTIER: { icon: "map", label: "Quartier" },
  ZONE: { icon: "grid", label: "Zone" },
};

type ModeSwitchProps = {
  insets: EdgeInsets;
  mode: TerrainMode;
  /** Le mode ZONE (tracé de zone) est réservé au manager. */
  showZone?: boolean;
  onSelectMode: (nextMode: TerrainMode) => void;
};

export function ModeSwitch({ insets, mode, showZone = false, onSelectMode }: ModeSwitchProps) {
  const modes: TerrainMode[] = ["VISUALISATION", "BATIMENT", "QUARTIER"];
  if (showZone) modes.push("ZONE");

  return (
    <View style={[styles.modeSwitch, { top: insets.top + 10 }]}>
      {modes.map((nextMode) => {
        const selected = mode === nextMode;
        const meta = MODE_META[nextMode];
        return (
          <Pressable
            key={nextMode}
            style={[styles.modeButton, selected && styles.modeButtonSelected]}
            onPress={() => onSelectMode(nextMode)}
          >
            <Feather
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
