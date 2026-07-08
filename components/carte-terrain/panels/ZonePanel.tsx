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
  useWindowDimensions,
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
  onCreateZone: (nom: string, selectedKeys: string[]) => void;
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
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const { width, height } = useWindowDimensions();

  // Paysage : la pleine largeur recouvrait la carte. On passe le panneau en
  // colonne compacte ancrée en bas à gauche (la carte reste visible à droite),
  // et on borne sa hauteur — le corps devient scrollable (cf. plus bas).
  const landscape = width > height;

  const totalSommets = zonePins.length;
  const cardStyle = [
    styles.panel,
    { paddingBottom: Math.max(insets.bottom, 12) },
    landscape && {
      right: undefined,
      width: 360,
      maxHeight: height - insets.top - insets.bottom - 28,
    },
  ];
  const canCreate = readyToCreateZone && nom.trim().length > 0;

  const toggleAssignable = (key: string) => {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((c) => c !== key) : [...current, key],
    );
  };

  const body = (
    <>
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
                key={assignable.key}
                label={assignable.label}
                icon={assignable.self ? "user-check" : "user"}
                tone={assignable.self ? "info" : "neutral"}
                selected={selectedKeys.includes(assignable.key)}
                onPress={() => toggleAssignable(assignable.key)}
              />
            ))}
          </View>
        </>
      )}

      <Pressable
        style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
        onPress={() => onCreateZone(nom, selectedKeys)}
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
    </>
  );

  return (
    <Card variant="elevated" padding="md" style={cardStyle}>
      {landscape ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </Card>
  );
}
