import { Card } from "@/components/ui";
import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import { colors } from "@/constants/theme";
import { habitatOptions } from "@/hooks/carte-terrain/constants";
import { formatSuggestion } from "@/hooks/carte-terrain/helpers";
import type { AdresseFeature, CreateStep, DraftPin, TerrainMode } from "@/hooks/carte-terrain/types";
import type { TypeHabitat } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { styles } from "../styles";

const TYPE_DESC: Record<TypeHabitat, string> = {
  MAISON: "Un foyer, une porte",
  PAVILLON: "Un lotissement de maisons",
  IMMEUBLE: "Plusieurs étages, plusieurs portes",
};

function totalPortes(pin: DraftPin): number {
  if (pin.typeHabitat === "MAISON") return 1;
  if (pin.typeHabitat === "PAVILLON") return Math.max(1, pin.nbMaisonsPrevu);
  return Math.max(1, pin.nbEtages) * Math.max(1, pin.nbPortesParEtage);
}

function structureLabel(pin: DraftPin): string {
  if (pin.typeHabitat === "MAISON") return "1 foyer";
  if (pin.typeHabitat === "PAVILLON") return `${pin.nbMaisonsPrevu} maisons`;
  return `${pin.nbEtages} étages × ${pin.nbPortesParEtage} portes/étage`;
}

function typeRank(pin: DraftPin): string {
  if (pin.typeHabitat === "MAISON") return "1 porte";
  if (pin.typeHabitat === "PAVILLON") return "1 porte/maison";
  return `${totalPortes(pin)} portes`;
}

type StepperProps = {
  label: string;
  value: number;
  min?: number;
  onChange: (next: number) => void;
};

function Stepper({ label, value, min = 1, onChange }: StepperProps) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable style={styles.stepperButton} onPress={() => onChange(Math.max(min, value - 1))}>
          <Feather name="minus" size={16} color={colors.primary} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable style={styles.stepperButton} onPress={() => onChange(value + 1)}>
          <Feather name="plus" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

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
  onSearchAddress: (query: string) => void;
  onPickAddress: (feature: AdresseFeature) => void;
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
  onSearchAddress,
  onPickAddress,
  onCreateBatiment,
  onCreateQuartier,
}: CreatePanelProps) {
  const [step, setStep] = useState<CreateStep>("type");
  const [query, setQuery] = useState("");
  const activePinId = activePin?.id ?? null;
  const activeLat = activePin?.latitude ?? null;
  const activeLng = activePin?.longitude ?? null;
  const hasAddress = !!activePin?.selectedAddress;

  // Nouveau repère (id différent) → l'assistant repart de l'étape "type".
  useEffect(() => {
    setStep("type");
  }, [activePinId]);

  // Repositionnement OU application d'une adresse → la recherche saisie n'a plus
  // de sens (elle ciblait l'ancienne position), on la vide.
  useEffect(() => {
    setQuery("");
  }, [activePinId, activeLat, activeLng]);

  // Le repositionnement préserve volontairement l'id du pin (le type reste choisi),
  // donc l'effet ci-dessus ne se déclenche pas : si l'adresse a été perdue on ne peut
  // plus rester sur "apercu" (crash) ni afficher une adresse fantôme → on clampe.
  const effectiveStep: CreateStep = step !== "type" && !hasAddress ? "adresse" : step;

  const cardStyle = [styles.panel, { paddingBottom: Math.max(insets.bottom, 12) }];

  // ─────────────────────────── Mode QUARTIER (inchangé) ───────────────────────────
  if (mode === "QUARTIER") {
    return (
      <Card variant="elevated" padding="md" style={cardStyle}>
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleBlock}>
            <Text style={styles.panelTitle}>{`Quartier (${quartierPins.length})`}</Text>
            <Text style={styles.panelHint}>
              {activePin ? "Choisis l'adresse puis le type." : "Touche la carte pour ajouter un pin."}
            </Text>
          </View>
          {activeQuartierPinId ? (
            <Pressable style={styles.pinBadge} onPress={onRemoveActiveQuartierPin}>
              <Feather name="trash-2" size={16} color={colors.danger} />
            </Pressable>
          ) : (
            <View style={styles.pinBadge}>
              <Feather name="map-pin" size={16} color={colors.danger} />
            </View>
          )}
        </View>

        {quartierPins.length > 0 && (
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
              const selected =
                activePin?.selectedAddress?.properties.label === item.properties.label;
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
            {activePin
              ? "Aucune adresse proche trouvee. Replace le pin legerement."
              : "Aucun pin actif."}
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
              <Stepper
                label="Maisons prevues"
                value={activePin.nbMaisonsPrevu}
                onChange={(next) => onUpdateActivePin({ nbMaisonsPrevu: next })}
              />
            )}
          </>
        )}

        <Pressable
          style={[styles.createButton, !readyToCreateQuartier && styles.createButtonDisabled]}
          onPress={onCreateQuartier}
          disabled={!readyToCreateQuartier}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <>
              <Text style={styles.createText}>Creer le quartier</Text>
              <Feather name="arrow-right" size={16} color={colors.textOnPrimary} />
            </>
          )}
        </Pressable>
      </Card>
    );
  }

  // ─────────────────────────── Mode BATIMENT (assistant) ───────────────────────────
  if (!activePin) {
    return (
      <Card variant="elevated" padding="md" style={cardStyle}>
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleBlock}>
            <Text style={styles.panelTitle}>Nouveau lieu</Text>
            <Text style={styles.panelHint}>Touche la carte pour poser le repère.</Text>
          </View>
          <View style={styles.pinBadge}>
            <Feather name="map-pin" size={16} color={colors.danger} />
          </View>
        </View>
      </Card>
    );
  }

  const progressLabel =
    effectiveStep === "type" ? "1 · Quoi" : effectiveStep === "adresse" ? "2 · Où" : "Aperçu";
  const secondDotOn = effectiveStep !== "type";

  return (
    <Card variant="elevated" padding="md" style={cardStyle}>
      <View style={styles.wizardProgress}>
        <Text style={styles.wizardProgressLabel}>{progressLabel}</Text>
        <View style={[styles.wizardDot, styles.wizardDotOn]} />
        <View style={[styles.wizardDot, secondDotOn && styles.wizardDotOn]} />
      </View>

      {effectiveStep === "type" && (
        <>
          <Text style={styles.panelTitle}>Que crées-tu ?</Text>
          <View style={styles.typeCardList}>
            {habitatOptions.map((option) => {
              const selected = activePin.typeHabitat === option.type;
              return (
                <Pressable
                  key={option.type}
                  style={[styles.typeCard, selected && styles.typeCardSelected]}
                  onPress={() => onUpdateActivePin({ typeHabitat: option.type })}
                >
                  <View style={[styles.typeCardIcon, selected && styles.typeCardIconSelected]}>
                    <HabitatIcon type={option.type} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.typeCardName}>{option.label}</Text>
                    <Text style={styles.typeCardDesc}>{TYPE_DESC[option.type]}</Text>
                  </View>
                  {selected && <Text style={styles.typeCardRank}>{typeRank(activePin)}</Text>}
                </Pressable>
              );
            })}
          </View>

          {activePin.typeHabitat === "PAVILLON" && (
            <Stepper
              label="Nombre de maisons"
              value={activePin.nbMaisonsPrevu}
              onChange={(next) => onUpdateActivePin({ nbMaisonsPrevu: next })}
            />
          )}

          {activePin.typeHabitat === "IMMEUBLE" && (
            <>
              <Stepper
                label="Étages"
                value={activePin.nbEtages}
                onChange={(next) => onUpdateActivePin({ nbEtages: next })}
              />
              <Stepper
                label="Portes / étage"
                value={activePin.nbPortesParEtage}
                onChange={(next) => onUpdateActivePin({ nbPortesParEtage: next })}
              />
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Ascenseur</Text>
                <Switch
                  value={activePin.ascenseur}
                  onValueChange={(next) => onUpdateActivePin({ ascenseur: next })}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>
              <TextInput
                style={styles.codeInput}
                value={activePin.digitalCode ?? ""}
                onChangeText={(text) => onUpdateActivePin({ digitalCode: text })}
                placeholder="Code d'accès (optionnel)"
                placeholderTextColor={colors.textSubtle}
              />
            </>
          )}

          {activePin.typeHabitat === "MAISON" && (
            <Text style={styles.wizardHint}>{"Rien à régler — direction l'adresse."}</Text>
          )}

          <Pressable style={styles.createButton} onPress={() => setStep("adresse")}>
            <Text style={styles.createText}>Continuer</Text>
            <Feather name="arrow-right" size={16} color={colors.textOnPrimary} />
          </Pressable>
        </>
      )}

      {effectiveStep === "adresse" && (
        <>
          <Text style={styles.panelTitle}>Adresse du lieu</Text>
          <Text style={styles.panelHint}>{"Déplace le repère ou cherche l'adresse."}</Text>

          <View style={styles.searchField}>
            <Feather name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => onSearchAddress(query)}
              returnKeyType="search"
              placeholder="Rechercher une adresse…"
              placeholderTextColor={colors.textSubtle}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")}>
                <Feather name="x" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {loadingSuggestions ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.helper}>Recherche des adresses...</Text>
            </View>
          ) : suggestions.length > 0 ? (
            <ScrollView style={styles.addressList} keyboardShouldPersistTaps="handled">
              {suggestions.map((item, index) => {
                const formatted = formatSuggestion(item);
                const selected =
                  activePin.selectedAddress?.properties.label === item.properties.label;
                return (
                  <Pressable
                    key={item.properties.id ?? `${item.properties.label}-${index}`}
                    style={[styles.addressRow, selected && styles.addressRowSelected]}
                    onPress={() => onPickAddress(item)}
                  >
                    {selected && (
                      <View style={styles.addressCheck}>
                        <Feather name="check" size={12} color={colors.textOnPrimary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addressTitle} numberOfLines={1}>
                        {formatted.title}
                      </Text>
                      <Text style={styles.addressSubtitle} numberOfLines={1}>
                        {formatted.subtitle || item.properties.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.helper}>
              Aucune adresse proche. Cherche ci-dessus ou replace le repère.
            </Text>
          )}

          <View style={styles.wizardActions}>
            <Pressable style={styles.wizardBackButton} onPress={() => setStep("type")}>
              <Feather name="arrow-left" size={16} color={colors.primary} />
              <Text style={styles.wizardBackText}>Retour</Text>
            </Pressable>
            <Pressable
              style={[styles.createButton, styles.wizardPrimary, !activePin.selectedAddress && styles.createButtonDisabled]}
              onPress={() => setStep("apercu")}
              disabled={!activePin.selectedAddress}
            >
              <Text style={styles.createText}>Continuer</Text>
              <Feather name="arrow-right" size={16} color={colors.textOnPrimary} />
            </Pressable>
          </View>
        </>
      )}

      {effectiveStep === "apercu" && (
        <>
          <Text style={styles.panelTitle}>Prêt à créer</Text>
          <View style={styles.recapCard}>
            <View style={styles.recapRow}>
              <Text style={styles.recapKey}>Type</Text>
              <Text style={styles.recapValue}>
                {habitatOptions.find((o) => o.type === activePin.typeHabitat)?.label}
              </Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapKey}>Adresse</Text>
              <Text style={styles.recapValue} numberOfLines={1}>
                {formatSuggestion(activePin.selectedAddress!).title}
              </Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapKey}>Structure</Text>
              <Text style={styles.recapValue}>{structureLabel(activePin)}</Text>
            </View>
            <View style={[styles.recapRow, styles.recapTotalRow]}>
              <Text style={styles.recapKey}>À prospecter</Text>
              <Text style={[styles.recapValue, styles.recapTotalValue]}>
                {totalPortes(activePin)} portes
              </Text>
            </View>
          </View>

          <View style={styles.wizardActions}>
            <Pressable style={styles.wizardBackButton} onPress={() => setStep("adresse")}>
              <Feather name="arrow-left" size={16} color={colors.primary} />
              <Text style={styles.wizardBackText}>Modifier</Text>
            </Pressable>
            <Pressable
              style={[styles.createButton, styles.wizardPrimary, !readyToCreateBatiment && styles.createButtonDisabled]}
              onPress={onCreateBatiment}
              disabled={!readyToCreateBatiment}
            >
              {creating ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <>
                  <Text style={styles.createText}>Créer &amp; commencer</Text>
                  <Feather name="arrow-right" size={16} color={colors.textOnPrimary} />
                </>
              )}
            </Pressable>
          </View>
        </>
      )}
    </Card>
  );
}
