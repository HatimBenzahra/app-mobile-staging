import { Card } from "@/components/ui";
import { colors } from "@/constants/theme";
import type { CreateImmeubleInput } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AdresseFeature = {
  properties: {
    id?: string;
    label: string;
    name?: string;
    postcode?: string;
    city?: string;
    context?: string;
    housenumber?: string;
    street?: string;
    type?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

type AddImmeubleSheetProps = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CreateImmeubleInput) => Promise<void> | void;
  loading?: boolean;
  ownerId?: number | null;
  ownerRole?: string | null;
};

const STEPS = [
  { id: "address" },
  { id: "details" },
  { id: "access" },
];

export default function AddImmeubleSheet({
  open,
  onClose,
  onSave,
  loading = false,
  ownerId,
  ownerRole,
}: AddImmeubleSheetProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const sheetRef = useRef<BottomSheetModal>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const adresseInputRef = useRef<TextInput>(null);
  const [formData, setFormData] = useState({
    adresse: "",
    complementAdresse: "",
    nbEtages: "",
    nbPortesParEtage: "",
    ascenseurPresent: false,
    digitalCode: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [addressSuggestions, setAddressSuggestions] = useState<AdresseFeature[]>(
    [],
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isAddressSelected, setIsAddressSelected] = useState(false);

  useEffect(() => {
    if (currentStep !== 0) {
      setAddressSuggestions([]);
    }
  }, [currentStep]);

  useEffect(() => {
    if (isAddressSelected) return;
    const query = formData.adresse.trim();
    const timeoutId = setTimeout(() => {
      if (query.length < 3) {
        setAddressSuggestions([]);
        return;
      }
      void searchAddresses(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [formData.adresse, isAddressSelected]);

  const totalPortes = useMemo(() => {
    const etages = Number(formData.nbEtages);
    const portes = Number(formData.nbPortesParEtage);
    if (!etages || !portes) return 0;
    return etages * portes;
  }, [formData.nbEtages, formData.nbPortesParEtage]);

  const snapPoints = useMemo(() => {
    if (isTablet) return ["65%", "90%"];
    return ["70%", "92%"];
  }, [isTablet]);

  const sheetContainerStyle = isTablet
    ? { alignSelf: "center" as const, width: Math.min(width * 0.9, 980) }
    : undefined;

  useEffect(() => {
    if (open) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [open]);

  const reset = () => {
    setCurrentStep(0);
    setErrors({});
    setFormData({
      adresse: "",
      complementAdresse: "",
      nbEtages: "",
      nbPortesParEtage: "",
      ascenseurPresent: false,
      digitalCode: "",
      latitude: null,
      longitude: null,
    });
    setAddressSuggestions([]);
    setIsAddressSelected(false);
  };

  const close = () => {
    sheetRef.current?.dismiss();
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
    if (field === "adresse") {
      setIsAddressSelected(false);
      setFormData((prev) => ({ ...prev, latitude: null, longitude: null }));
    }
  };

  const searchAddresses = async (query: string) => {
    setLoadingSuggestions(true);
    try {
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
        query,
      )}&limit=6&autocomplete=1`;
      const response = await fetch(url);
      if (!response.ok) {
        setAddressSuggestions([]);
        return;
      }
      const data = await response.json();
      setAddressSuggestions((data?.features as AdresseFeature[]) || []);
    } catch {
      setAddressSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectAddress = (address: AdresseFeature) => {
    setIsAddressSelected(true);
    setAddressSuggestions([]);
    const coordinates = address.geometry?.coordinates;
    const longitude = coordinates?.[0] ?? null;
    const latitude = coordinates?.[1] ?? null;

    setFormData((prev) => ({
      ...prev,
      adresse: address.properties.label,
      latitude,
      longitude,
    }));

    if (errors.adresse) {
      setErrors((prev) => ({ ...prev, adresse: null }));
    }
  };

  const validateStep = (step: number) => {
    const nextErrors: Record<string, string> = {};
    if (step === 0 && !formData.adresse.trim()) {
      nextErrors.adresse = "Adresse requise";
    }
    if (
      step === 0 &&
      formData.adresse.trim() &&
      !isAddressSelected
    ) {
      nextErrors.adresse = "Sélectionne une adresse dans la liste";
    }
    if (step === 1) {
      if (!formData.nbEtages || Number(formData.nbEtages) < 1) {
        nextErrors.nbEtages = "Etages invalides";
      }
      if (!formData.nbPortesParEtage || Number(formData.nbPortesParEtage) < 1) {
        nextErrors.nbPortesParEtage = "Portes invalides";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }; 

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const submit = async () => {
    if (!validateStep(currentStep)) return;

    const adresseComplete = formData.complementAdresse.trim()
      ? `${formData.adresse}, ${formData.complementAdresse.trim()}`
      : formData.adresse;

    const payload: CreateImmeubleInput = {
      adresse: adresseComplete,
      nbEtages: Number(formData.nbEtages),
      nbPortesParEtage: Number(formData.nbPortesParEtage),
      ascenseurPresent: formData.ascenseurPresent,
      digitalCode: formData.digitalCode.trim() || null,
      latitude: formData.latitude,
      longitude: formData.longitude,
      commercialId:
        ownerRole === "commercial" ? (ownerId ?? undefined) : undefined,
      managerId: ownerRole === "manager" ? (ownerId ?? undefined) : undefined,
    };

    await onSave(payload);
    close();
  };

  const handleDismiss = () => {
    reset();
    onClose();
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.5}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      onDismiss={handleDismiss}
      keyboardBehavior={Platform.OS === "ios" ? "extend" : "interactive"}
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      detached={isTablet}
      bottomInset={insets.bottom + 12}
      style={sheetContainerStyle}
      backgroundStyle={[
        styles.sheetBackground,
        isTablet && { borderRadius: 28 },
      ]}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={[styles.sheet, isTablet && styles.sheetTablet]}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            Étape {currentStep + 1} sur {STEPS.length}
          </Text>
          <Text style={styles.title}>
            {currentStep === 0
              ? "Adresse"
              : currentStep === 1
                ? "Détails de l'immeuble"
                : "Accès"}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          {STEPS.map((step, index) => (
            <View
              key={step.id}
              style={[
                styles.progressSeg,
                index <= currentStep && styles.progressSegActive,
              ]}
            />
          ))}
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 0 && (
            <>
              <Text style={styles.label}>Adresse de l&apos;immeuble</Text>
              <Pressable
                style={[
                  styles.inputRow,
                  isAddressSelected && styles.inputRowSelected,
                  errors.adresse && styles.inputRowError,
                ]}
                onPress={() => adresseInputRef.current?.focus()}
              >
                <Feather
                  name={isAddressSelected ? "check-circle" : "map-pin"}
                  size={16}
                  color={isAddressSelected ? colors.success : colors.textSubtle}
                />
                <TextInput
                  ref={adresseInputRef}
                  placeholder="N° rue, code postal, ville…"
                  placeholderTextColor={colors.textSubtle}
                  style={[styles.input, styles.inputInline]}
                  value={formData.adresse}
                  onChangeText={(value) => handleChange("adresse", value)}
                />
                {loadingSuggestions ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : formData.adresse.length > 0 ? (
                  <Pressable
                    onPress={() => {
                      handleChange("adresse", "");
                      setAddressSuggestions([]);
                    }}
                    hitSlop={8}
                  >
                    <Feather name="x" size={16} color={colors.textSubtle} />
                  </Pressable>
                ) : null}
              </Pressable>
              {errors.adresse ? (
                <Text style={styles.error}>{errors.adresse}</Text>
              ) : (
                <Text style={styles.hintText}>
                  Suggestions fournies par l&apos;API officielle des adresses
                  françaises (BAN).
                </Text>
              )}

              {addressSuggestions.length > 0 && (
                <Card variant="outlined" padding="none" style={styles.suggestionsCard}>
                  {addressSuggestions.map((suggestion, idx) => {
                    const p = suggestion.properties;
                    const title =
                      [p.housenumber, p.street].filter(Boolean).join(" ") ||
                      p.name ||
                      p.label;
                    const subtitle = [p.postcode, p.city]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <Pressable
                        key={p.id ?? `${p.label}-${idx}`}
                        style={({ pressed }) => [
                          styles.suggestionItem,
                          pressed && styles.suggestionItemPressed,
                        ]}
                        onPress={() => selectAddress(suggestion)}
                      >
                        <View style={styles.suggestionIcon}>
                          <Feather name="map-pin" size={14} color={colors.primary} />
                        </View>
                        <View style={styles.suggestionText}>
                          <Text
                            style={styles.suggestionTitle}
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                          {subtitle ? (
                            <Text
                              style={styles.suggestionSubtitle}
                              numberOfLines={1}
                            >
                              {subtitle}
                            </Text>
                          ) : null}
                        </View>
                        <Feather
                          name="corner-down-left"
                          size={14}
                          color={colors.borderStrong}
                        />
                      </Pressable>
                    );
                  })}
                </Card>
              )}

              <Text style={[styles.label, styles.labelSpacing]}>
                Complement (optionnel)
              </Text>
              <TextInput
                placeholder="Appartement, batiment..."
                style={styles.input}
                value={formData.complementAdresse}
                onChangeText={(value) =>
                  handleChange("complementAdresse", value)
                }
              />
            </>
          )}

          {currentStep === 1 && (
            <>
              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Nombre d'étages</Text>
                  <TextInput
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={colors.textSubtle}
                    style={[styles.input, errors.nbEtages && styles.inputError]}
                    value={formData.nbEtages}
                    onChangeText={(value) => handleChange("nbEtages", value)}
                  />
                  {errors.nbEtages ? (
                    <Text style={styles.error}>{errors.nbEtages}</Text>
                  ) : null}
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Portes par étage</Text>
                  <TextInput
                    keyboardType="number-pad"
                    placeholder="4"
                    placeholderTextColor={colors.textSubtle}
                    style={[
                      styles.input,
                      errors.nbPortesParEtage && styles.inputError,
                    ]}
                    value={formData.nbPortesParEtage}
                    onChangeText={(value) =>
                      handleChange("nbPortesParEtage", value)
                    }
                  />
                  {errors.nbPortesParEtage ? (
                    <Text style={styles.error}>{errors.nbPortesParEtage}</Text>
                  ) : null}
                </View>
              </View>

              <Card variant="filled" padding="md" style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Feather name="layers" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>Capacité estimée</Text>
                  <Text style={styles.summaryHint}>
                    Total de portes que tu pourras prospecter dans cet immeuble.
                  </Text>
                </View>
                <Text style={styles.summaryValue}>{totalPortes}</Text>
              </Card>
            </>
          )}

          {currentStep === 2 && (
            <>
              <Card variant="outlined" padding="md" style={styles.switchRow}>
                <View style={styles.switchIcon}>
                  <Feather name="chevrons-up" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Ascenseur</Text>
                  <Text style={styles.helper}>
                    L'immeuble dispose d'un ascenseur ?
                  </Text>
                </View>
                <Switch
                  value={formData.ascenseurPresent}
                  onValueChange={(value) =>
                    handleChange("ascenseurPresent", value)
                  }
                  trackColor={{ false: colors.border, true: colors.primaryRing }}
                  thumbColor={formData.ascenseurPresent ? colors.primary : colors.surface}
                />
              </Card>

              <View style={styles.field}>
                <Text style={styles.label}>Code d'accès</Text>
                <View style={styles.inputRow}>
                  <Feather name="key" size={16} color={colors.textSubtle} />
                  <TextInput
                    placeholder="Ex: 1234A"
                    placeholderTextColor={colors.textSubtle}
                    style={[styles.input, styles.inputInline]}
                    value={formData.digitalCode}
                    onChangeText={(value) => handleChange("digitalCode", value)}
                  />
                </View>
                <Text style={styles.hintText}>
                  Optionnel — pour gagner du temps en arrivant sur place.
                </Text>
              </View>
            </>
          )}
        </BottomSheetScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.ghostButton,
              pressed && { opacity: 0.85 },
            ]}
            onPress={currentStep === 0 ? close : prevStep}
          >
            <Feather
              name={currentStep === 0 ? "x" : "chevron-left"}
              size={16}
              color={colors.textStrong}
            />
            <Text style={styles.ghostText}>
              {currentStep === 0 ? "Annuler" : "Retour"}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !loading && { opacity: 0.92 },
              loading && styles.primaryDisabled,
            ]}
            onPress={currentStep === STEPS.length - 1 ? submit : nextStep}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <>
                <Text style={styles.primaryText}>
                  {currentStep === STEPS.length - 1 ? "Créer l'immeuble" : "Suivant"}
                </Text>
                <Feather
                  name={
                    currentStep === STEPS.length - 1
                      ? "check"
                      : "arrow-right"
                  }
                  size={16}
                  color={colors.textInverse}
                />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5F5",
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sheetTablet: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 20,
  },
  header: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  progressTrack: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  progressSegActive: {
    backgroundColor: colors.text,
  },
  content: {
    paddingTop: 18,
    paddingBottom: 8,
    gap: 16,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.textStrong,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  labelSpacing: {
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    fontWeight: "500",
  },
  inputInline: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  inputRowSelected: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },
  inputRowError: {
    borderColor: "#FCA5A5",
    backgroundColor: colors.dangerSoft,
  },
  inputError: {
    borderColor: "#FCA5A5",
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  hintText: {
    marginTop: 6,
    fontSize: 11.5,
    color: colors.textSubtle,
    fontWeight: "500",
  },
  suggestionsCard: {
    marginTop: 10,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  suggestionItemPressed: {
    backgroundColor: colors.background,
  },
  suggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    flex: 1,
    minWidth: 0,
  },
  suggestionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.text,
  },
  suggestionSubtitle: {
    marginTop: 2,
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: 1,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  summaryHint: {
    marginTop: 2,
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    minWidth: 36,
    textAlign: "right",
  },
  helper: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  switchIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  ghostButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  ghostText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textStrong,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.text,
  },
  primaryDisabled: {
    backgroundColor: colors.textSubtle,
  },
  primaryText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.textInverse,
    letterSpacing: 0.2,
  },
});
