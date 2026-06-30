import { colors } from "@/constants/theme";
import type { TerrainMode } from "@/hooks/carte-terrain/types";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { styles } from "./styles";

type ModeSwitchProps = {
  insets: EdgeInsets;
  mode: TerrainMode;
  onSelectMode: (nextMode: TerrainMode) => void;
};

export function ModeSwitch({ insets, mode, onSelectMode }: ModeSwitchProps) {
  return (
    <View style={[styles.modeSwitch, { top: insets.top + 10 }]}>
      {(["VISUALISATION", "BATIMENT", "QUARTIER"] as TerrainMode[]).map((nextMode) => {
        const selected = mode === nextMode;
        return (
          <Pressable
            key={nextMode}
            style={[styles.modeButton, selected && styles.modeButtonSelected]}
            onPress={() => onSelectMode(nextMode)}
          >
            <Feather
              name={
                nextMode === "VISUALISATION"
                  ? "eye"
                  : nextMode === "BATIMENT"
                    ? "map-pin"
                    : "map"
              }
              size={15}
              color={selected ? colors.textOnPrimary : colors.primary}
            />
            <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
              {nextMode === "VISUALISATION"
                ? "Voir"
                : nextMode === "BATIMENT"
                  ? "Batiment"
                  : "Quartier"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
