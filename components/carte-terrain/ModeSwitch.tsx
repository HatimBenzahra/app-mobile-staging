import { colors } from "@/constants/theme";
import { Icon, type IconName } from "@/components/ui";
import type { TerrainMode } from "@/hooks/carte-terrain/types";
import { Pressable, Text, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { styles } from "./styles";

type ModeMeta = { icon: IconName; label: string };

const MODE_META: Record<TerrainMode, ModeMeta> = {
  VISUALISATION: { icon: "eye", label: "Voir" },
  BATIMENT: { icon: "map-pin", label: "Batiment" },
  QUARTIER: { icon: "map", label: "Quartier" },
};

type ModeSwitchProps = {
  insets: EdgeInsets;
  mode: TerrainMode;
  onSelectMode: (nextMode: TerrainMode) => void;
};

export function ModeSwitch({ insets, mode, onSelectMode }: ModeSwitchProps) {
  const modes: TerrainMode[] = ["VISUALISATION", "BATIMENT", "QUARTIER"];

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
