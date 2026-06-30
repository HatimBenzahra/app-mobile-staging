import { Card } from "@/components/ui";
import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import { colors } from "@/constants/theme";
import { habitatOptions } from "@/hooks/carte-terrain/constants";
import type { Immeuble, TypeHabitat } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { styles } from "../styles";

type EditLieuPanelProps = {
  insets: EdgeInsets;
  editingLieu: Immeuble;
  editingType: TypeHabitat;
  editingNbMaisons: number;
  updatingLieu: boolean;
  onClose: () => void;
  onSelectType: (type: TypeHabitat) => void;
  onChangeNbMaisons: (updater: (value: number) => number) => void;
  onSave: () => void;
};

export function EditLieuPanel({
  insets,
  editingLieu,
  editingType,
  editingNbMaisons,
  updatingLieu,
  onClose,
  onSelectType,
  onChangeNbMaisons,
  onSave,
}: EditLieuPanelProps) {
  return (
    <Card
      variant="elevated"
      padding="md"
      style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.panelHeader}>
        <View style={styles.panelTitleBlock}>
          <Text style={styles.panelTitle} numberOfLines={1}>
            Modifier le lieu
          </Text>
          <Text style={styles.panelHint} numberOfLines={2}>
            {editingLieu.adresse}
          </Text>
        </View>
        <Pressable style={styles.iconButton} onPress={onClose}>
          <Feather name="x" size={18} color={colors.textStrong} />
        </Pressable>
      </View>

      <View style={styles.typeRow}>
        {habitatOptions.map((option) => {
          const selected = editingType === option.type;
          return (
            <Pressable
              key={option.type}
              style={[styles.typeButton, selected && styles.typeButtonSelected]}
              onPress={() => onSelectType(option.type)}
            >
              <HabitatIcon
                type={option.type}
                size={16}
                color={selected ? colors.textOnPrimary : colors.primary}
              />
              <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {editingType === "PAVILLON" && (
        <View style={styles.stepperRow}>
          <Text style={styles.stepperLabel}>Maisons prevues</Text>
          <View style={styles.stepperControls}>
            <Pressable
              style={styles.stepperButton}
              onPress={() => onChangeNbMaisons((value) => Math.max(1, value - 1))}
            >
              <Feather name="minus" size={16} color={colors.primary} />
            </Pressable>
            <Text style={styles.stepperValue}>{editingNbMaisons}</Text>
            <Pressable
              style={styles.stepperButton}
              onPress={() => onChangeNbMaisons((value) => value + 1)}
            >
              <Feather name="plus" size={16} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      )}

      <Pressable
        style={[styles.createButton, updatingLieu && styles.createButtonDisabled]}
        onPress={onSave}
        disabled={updatingLieu}
      >
        {updatingLieu ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <>
            <Text style={styles.createText}>Enregistrer</Text>
            <Feather name="check" size={16} color={colors.textOnPrimary} />
          </>
        )}
      </Pressable>
    </Card>
  );
}
