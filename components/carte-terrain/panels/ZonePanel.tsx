import { Card, Chip } from "@/components/ui";
import { colors } from "@/constants/theme";
import type { DraftPin } from "@/hooks/carte-terrain/types";
import type { ZoneAssignable } from "@/hooks/zone/use-zone-draft";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { styles } from "../styles";

type ZonePanelProps = {
  insets: EdgeInsets;
  zonePins: DraftPin[];
  activeZonePinId: string | null;
  assignables: ZoneAssignable[];
  creating: boolean;
  readyToCreateZone: boolean;
  onSelectZonePin: (pin: DraftPin) => void;
  onRemoveActiveZonePin: () => void;
  onCreateZone: (nom: string, selectedIds: number[]) => void;
};

export function ZonePanel({
  insets,
  zonePins,
  activeZonePinId,
  assignables,
  creating,
  readyToCreateZone,
  onSelectZonePin,
  onRemoveActiveZonePin,
  onCreateZone,
}: ZonePanelProps) {
  const [nom, setNom] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const totalSommets = zonePins.length;
  const cardStyle = [styles.panel, { paddingBottom: Math.max(insets.bottom, 12) }];
  const canCreate = readyToCreateZone && nom.trim().length > 0;

  const toggleAssignable = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );
  };

  return (
    <Card variant="elevated" padding="md" style={cardStyle}>
      <View style={styles.panelHeader}>
        <View style={styles.panelTitleBlock}>
          <Text style={styles.panelTitle}>{`Zone · ${totalSommets} sommets`}</Text>
          <Text style={styles.panelHint}>
            {totalSommets < 3
              ? "Touche la carte pour poser les sommets (3 minimum)."
              : "Nomme la zone, assigne des commerciaux, puis crée-la."}
          </Text>
        </View>
        {activeZonePinId ? (
          <Pressable style={styles.pinBadge} onPress={onRemoveActiveZonePin}>
            <Feather name="trash-2" size={16} color={colors.danger} />
          </Pressable>
        ) : (
          <View style={styles.pinBadge}>
            <Feather name="grid" size={16} color={colors.danger} />
          </View>
        )}
      </View>

      {totalSommets > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pinList}
        >
          {zonePins.map((pin, index) => {
            const selected = pin.id === activeZonePinId;
            return (
              <Pressable
                key={pin.id}
                style={[styles.pinChip, selected && styles.pinChipSelected]}
                onPress={() => onSelectZonePin(pin)}
              >
                <Text style={[styles.pinChipText, selected && styles.pinChipTextSelected]}>
                  {index + 1}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <TextInput
        style={styles.codeInput}
        value={nom}
        onChangeText={setNom}
        placeholder="Nom de la zone"
        placeholderTextColor={colors.textSubtle}
      />

      {assignables.length > 0 && (
        <>
          <Text style={styles.zoneSectionLabel}>Assigner à</Text>
          <View style={styles.zoneChipsRow}>
            {assignables.map((assignable) => (
              <Chip
                key={assignable.id}
                label={assignable.label}
                icon={assignable.self ? "user-check" : "user"}
                tone={assignable.self ? "info" : "neutral"}
                selected={selectedIds.includes(assignable.id)}
                onPress={() => toggleAssignable(assignable.id)}
              />
            ))}
          </View>
        </>
      )}

      <Pressable
        style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
        onPress={() => onCreateZone(nom, selectedIds)}
        disabled={!canCreate}
      >
        {creating ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <>
            <Text style={styles.createText}>Créer la zone</Text>
            <Feather name="arrow-right" size={16} color={colors.textOnPrimary} />
          </>
        )}
      </Pressable>
    </Card>
  );
}
