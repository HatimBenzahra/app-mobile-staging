import { Card } from "@/components/ui";
import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import { colors } from "@/constants/theme";
import { habitatOptions } from "@/hooks/carte-terrain/constants";
import { formatSuggestion } from "@/hooks/carte-terrain/helpers";
import type { AdresseFeature, DraftPin, TerrainMode } from "@/hooks/carte-terrain/types";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { styles } from "../styles";

type CreatePanelProps = {
  insets: EdgeInsets;
  mode: TerrainMode;
  quartierPins: DraftPin[];
  activeQuartierPinId: string | null;
  activePin: DraftPin | null;
  suggestions: AdresseFeature[];
  loadingSuggestions: boolean;
  creating: boolean;
  readyToCreateBatiment: boolean;
  readyToCreateQuartier: boolean;
  onRemoveActiveQuartierPin: () => void;
  onSelectQuartierPin: (pin: DraftPin) => void;
  onUpdateActivePin: (patch: Partial<DraftPin>) => void;
  onCreateBatiment: () => void;
  onCreateQuartier: () => void;
};

export function CreatePanel({
  insets,
  mode,
  quartierPins,
  activeQuartierPinId,
  activePin,
  suggestions,
  loadingSuggestions,
  creating,
  readyToCreateBatiment,
  readyToCreateQuartier,
  onRemoveActiveQuartierPin,
  onSelectQuartierPin,
  onUpdateActivePin,
  onCreateBatiment,
  onCreateQuartier,
}: CreatePanelProps) {
  return (
    <Card
      variant="elevated"
      padding="md"
      style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.panelHeader}>
        <View style={styles.panelTitleBlock}>
          <Text style={styles.panelTitle}>
            {mode === "BATIMENT" ? "Nouveau batiment" : `Quartier (${quartierPins.length})`}
          </Text>
          <Text style={styles.panelHint}>
            {activePin
              ? "Choisis l'adresse puis le type."
              : mode === "BATIMENT"
                ? "Touche la carte pour poser le repere."
                : "Touche la carte pour ajouter un pin."}
          </Text>
        </View>
        {mode === "QUARTIER" && activeQuartierPinId ? (
          <Pressable style={styles.pinBadge} onPress={onRemoveActiveQuartierPin}>
            <Feather name="trash-2" size={16} color={colors.danger} />
          </Pressable>
        ) : (
          <View style={styles.pinBadge}>
            <Feather name="map-pin" size={16} color={colors.danger} />
          </View>
        )}
      </View>

      {mode === "QUARTIER" && quartierPins.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pinList}
        >
          {quartierPins.map((pin, index) => {
            const selected = pin.id === activeQuartierPinId;
            return (
              <Pressable
                key={pin.id}
                style={[styles.pinChip, selected && styles.pinChipSelected]}
                onPress={() => onSelectQuartierPin(pin)}
              >
                <Text style={[styles.pinChipText, selected && styles.pinChipTextSelected]}>
                  {index + 1}
                </Text>
                <Feather
                  name={pin.selectedAddress ? "check" : "alert-circle"}
                  size={13}
                  color={selected ? colors.textOnPrimary : colors.textStrong}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {loadingSuggestions ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.helper}>Recherche des adresses proches...</Text>
        </View>
      ) : suggestions.length > 0 ? (
        <FlatList
          horizontal
          data={suggestions}
          keyExtractor={(item, index) => item.properties.id ?? `${item.properties.label}-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsList}
          renderItem={({ item }) => {
            const formatted = formatSuggestion(item);
            const selected = activePin?.selectedAddress?.properties.label === item.properties.label;
            return (
              <Pressable
                style={[styles.suggestionCard, selected && styles.suggestionCardSelected]}
                onPress={() => onUpdateActivePin({ selectedAddress: item })}
              >
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {formatted.title}
                </Text>
                <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                  {formatted.subtitle || item.properties.label}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : (
        <Text style={styles.helper}>
          {activePin ? "Aucune adresse proche trouvee. Replace le pin legerement." : "Aucun pin actif."}
        </Text>
      )}

      {activePin && (
        <>
          <View style={styles.typeRow}>
            {habitatOptions.map((option) => {
              const selected = activePin.typeHabitat === option.type;
              return (
                <Pressable
                  key={option.type}
                  style={[styles.typeButton, selected && styles.typeButtonSelected]}
                  onPress={() => onUpdateActivePin({ typeHabitat: option.type })}
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

          {activePin.typeHabitat === "PAVILLON" && (
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Maisons prevues</Text>
              <View style={styles.stepperControls}>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() =>
                    onUpdateActivePin({ nbMaisonsPrevu: Math.max(1, activePin.nbMaisonsPrevu - 1) })
                  }
                >
                  <Feather name="minus" size={16} color={colors.primary} />
                </Pressable>
                <Text style={styles.stepperValue}>{activePin.nbMaisonsPrevu}</Text>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => onUpdateActivePin({ nbMaisonsPrevu: activePin.nbMaisonsPrevu + 1 })}
                >
                  <Feather name="plus" size={16} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          )}
        </>
      )}

      <Pressable
        style={[
          styles.createButton,
          (mode === "BATIMENT" ? !readyToCreateBatiment : !readyToCreateQuartier) &&
            styles.createButtonDisabled,
        ]}
        onPress={mode === "BATIMENT" ? onCreateBatiment : onCreateQuartier}
        disabled={mode === "BATIMENT" ? !readyToCreateBatiment : !readyToCreateQuartier}
      >
        {creating ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <>
            <Text style={styles.createText}>
              {mode === "BATIMENT" ? "Creer le lieu" : "Creer le quartier"}
            </Text>
            <Feather name="arrow-right" size={16} color={colors.textOnPrimary} />
          </>
        )}
      </Pressable>
    </Card>
  );
}
