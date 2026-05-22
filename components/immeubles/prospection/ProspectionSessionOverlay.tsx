import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
  useWindowDimensions,
} from "react-native";

const Haptics = {
  light: () => Vibration.vibrate(10),
  medium: () => Vibration.vibrate(18),
  select: () => Vibration.vibrate(6),
  success: () => Vibration.vibrate([0, 14, 60, 14]),
  warning: () => Vibration.vibrate([0, 18, 80, 18]),
};
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StatusGrid, {
  STATUSES,
  type StatusKey,
} from "./StatusGrid";
import LiveSegmentHeader from "./LiveSegmentHeader";
import RdvQuickPicker from "./RdvQuickPicker";
import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
  getDisplayStatusKey,
} from "@/components/immeubles/prospection/status-display";
import type {
  ProspectionSessionApi,
  SaveStatusInput,
} from "@/hooks/prospection/use-prospection-session";
import type { Porte } from "@/types/api";
import { colors, fontSize, spacing } from "@/constants/theme";

type ProspectionSessionOverlayProps = {
  session: ProspectionSessionApi;
  nbEtages?: number;
  nbPortesParEtage?: number;
  portes?: Porte[];
};

const SCREEN_PAD = 18;
const TABLET_PAD = 28;

function getTodayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getNowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ProspectionSessionOverlay({
  session,
  nbEtages = 1,
  nbPortesParEtage,
  portes = [],
}: ProspectionSessionOverlayProps) {
  const { state } = session;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 700;

  const visible = state.phase !== "IDLE";

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={() => {
        // intercepted in ActiveView via BackHandler when applicable
      }}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.frame,
            isTablet && {
              maxWidth: 620,
              maxHeight: Math.min(height - 80, 820),
              alignSelf: "center",
              marginVertical: "auto",
              borderRadius: 32,
              overflow: "hidden",
            },
          ]}
        >
          {state.phase === "NAMING" || state.phase === "CREATING" ? (
            <NamingView
              key="naming"
              session={session}
              isTablet={isTablet}
              insetsTop={insets.top}
              insetsBottom={insets.bottom}
              nbEtages={nbEtages}
              nbPortesParEtage={nbPortesParEtage}
              portes={portes}
            />
          ) : null}

          {state.phase === "READY" ? (
            <ReadyView
              key="ready"
              session={session}
              isTablet={isTablet}
              insetsTop={insets.top}
              insetsBottom={insets.bottom}
            />
          ) : null}

          {state.phase === "STARTING" ? (
            <Animated.View
              key="starting"
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(140)}
              style={[
                styles.viewRoot,
                isTablet ? styles.viewRootTablet : { paddingTop: insets.top + 8 },
              ]}
            >
              <View style={styles.startingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.startingTitle}>Préparation du chrono…</Text>
                <Text style={styles.startingHint}>
                  Démarrage du micro pour ce passage. Ne sors pas de l'écran.
                </Text>
              </View>
            </Animated.View>
          ) : null}

          {state.phase === "ACTIVE" || state.phase === "SAVING" ? (
            <ActiveView
              key="active"
              session={session}
              isTablet={isTablet}
              insetsTop={insets.top}
              insetsBottom={insets.bottom}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  NAMING VIEW — étage + numéro de porte
// ────────────────────────────────────────────────────────────────────────────

function nextPorteNumero(etage: number, portes: Porte[]): number {
  const onFloor = portes.filter((p) => p.etage === etage);

  // Priorité : reprendre le plus petit slot NON_VISITE existant (cas où
  // l'immeuble a déjà des portes pré-créées par l'ancien backend).
  const nonVisiteNums = onFloor
    .filter((p) => p.statut === "NON_VISITE")
    .map((p) => Number.parseInt(String(p.numero ?? ""), 10))
    .filter((n) => !Number.isNaN(n));
  if (nonVisiteNums.length > 0) {
    return Math.min(...nonVisiteNums);
  }

  // Sinon : continuer la séquence ou démarrer la base de l'étage.
  const base = etage * 100;
  if (onFloor.length === 0) return base;
  const nums = onFloor
    .map((p) => Number.parseInt(String(p.numero ?? ""), 10))
    .filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return base;
  return Math.max(...nums) + 1;
}

function FloorCard({
  etage,
  done,
  total,
  selected,
  onPress,
  isTablet,
  locked,
}: {
  etage: number;
  done: number;
  total: number;
  selected: boolean;
  onPress: () => void;
  isTablet: boolean;
  locked?: boolean;
}) {
  const ratio = total === 0 ? 0 : done / total;
  const isComplete = total > 0 && ratio === 1;
  const subtitle = total > 0 ? `${done}/${total}` : "0";

  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      style={[
        styles.floorCard,
        isTablet && styles.floorCardTablet,
        selected && styles.floorCardSelected,
        locked && { opacity: 0.4, backgroundColor: colors.surfaceMuted },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Étage ${etage}`}
    >
      <View style={styles.floorCardTop}>
        <Text
          style={[
            styles.floorCardNumber,
            isTablet && styles.floorCardNumberTablet,
            selected && styles.floorCardNumberSelected,
          ]}
        >
          {etage}
        </Text>
        {locked ? (
          <Feather name="lock" size={14} color={colors.textSubtle} />
        ) : isComplete ? (
          <View style={styles.floorCardCheck}>
            <Feather name="check" size={9} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.floorCardRatio,
          selected && styles.floorCardRatioSelected,
        ]}
      >
        {subtitle}
      </Text>
      <View style={styles.floorCardBar}>
        <View
          style={[
            styles.floorCardBarFill,
            {
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor: selected
                ? "#FFFFFF"
                : isComplete
                  ? "#059669"
                  : "#0F172A",
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function PorteChip({
  porte,
  onPress,
}: {
  porte: Porte;
  onPress: () => void;
}) {
  const key = getDisplayStatusKey(porte);
  const status = key
    ? (STATUS_DISPLAY[key] ?? DEFAULT_STATUS_OPTION)
    : DEFAULT_STATUS_OPTION;
  return (
    <Pressable
      onPress={onPress}
      style={styles.porteChip}
      accessibilityRole="button"
      accessibilityLabel={`Repasser porte ${porte.numero}`}
    >
      <View style={styles.porteChipTop}>
        <Text style={styles.porteChipNum} numberOfLines={1}>
          {porte.numero}
        </Text>
        <View
          style={[
            styles.porteChipIcon,
            { backgroundColor: `${status.accent}1A` },
          ]}
        >
          <Feather name={status.icon} size={12} color={status.accent} />
        </View>
      </View>
      <Text
        style={[styles.porteChipLabel, { color: status.accent }]}
        numberOfLines={1}
      >
        {status.label}
      </Text>
      <View
        style={[
          styles.porteChipAccent,
          { backgroundColor: status.accent },
        ]}
      />
    </Pressable>
  );
}

function NamingView({
  session,
  isTablet,
  insetsTop,
  insetsBottom,
  nbEtages,
  nbPortesParEtage,
  portes,
}: {
  session: ProspectionSessionApi;
  isTablet: boolean;
  insetsTop: number;
  insetsBottom: number;
  nbEtages: number;
  nbPortesParEtage?: number;
  portes: Porte[];
}) {
  const state = session.state;
  const isCreating = state.phase === "CREATING";

  const initialEtage =
    state.phase === "NAMING" || state.phase === "CREATING"
      ? state.etage || null
      : null;

  const [step, setStep] = useState<"etage" | "porte">(
    initialEtage ? "porte" : "etage",
  );
  const [selectedEtage, setSelectedEtage] = useState<number | null>(
    initialEtage,
  );
  const [error, setError] = useState<string | null>(null);

  const totalEtages = Math.max(1, nbEtages || 1);
  const floors = useMemo(() => {
    const arr: { etage: number; done: number; total: number; locked: boolean }[] = [];
    let activeFound = false;
    for (let i = totalEtages; i >= 1; i -= 1) {
      const onFloor = portes.filter((p) => p.etage === i);
      const done = onFloor.filter((p) => p.statut !== "NON_VISITE").length;
      const nonVisiteCount = onFloor.length - done;
      const expectedTotal = nbPortesParEtage ?? onFloor.length;
      const hasRemainingWork =
        nonVisiteCount > 0 || onFloor.length < expectedTotal;
      let locked = false;
      if (!activeFound && hasRemainingWork) {
        activeFound = true;
      } else if (activeFound) {
        locked = true;
      }
      arr.push({ etage: i, done, total: onFloor.length, locked });
    }
    return arr;
  }, [portes, totalEtages, nbPortesParEtage]);

  // Only "non-final" portes can be re-prospected. Refus / Contrat signé /
  // Argumenté are considered closed and won't show in the picker — the
  // commercial would have to delete & re-create if they really need to redo.
  const prospectedOnFloor = useMemo(() => {
    if (selectedEtage === null) return [];
    const resumable = new Set([
      "ABSENT",
      "ABSENT_MATIN",
      "ABSENT_SOIR",
      "RENDEZ_VOUS_PRIS",
      "RDV_PRIS",
    ]);
    return portes
      .filter(
        (p) =>
          p.etage === selectedEtage &&
          p.statut !== "NON_VISITE" &&
          resumable.has(p.statut),
      )
      .sort((a, b) =>
        String(a.numero).localeCompare(String(b.numero), "fr", {
          numeric: true,
        }),
      );
  }, [portes, selectedEtage]);

  // Capacité = nb de portes RÉELLEMENT prospectées (statut ≠ NON_VISITE).
  // Les NON_VISITE sont des slots vides en attente — elles ne saturent pas.
  const prospectedOnSelectedFloorCount = useMemo(() => {
    if (selectedEtage === null) return 0;
    return portes.filter(
      (p) => p.etage === selectedEtage && p.statut !== "NON_VISITE",
    ).length;
  }, [portes, selectedEtage]);

  const isFloorAtCapacity = useMemo(() => {
    if (selectedEtage === null) return false;
    if (!nbPortesParEtage || nbPortesParEtage <= 0) return false;
    return prospectedOnSelectedFloorCount >= nbPortesParEtage;
  }, [nbPortesParEtage, prospectedOnSelectedFloorCount, selectedEtage]);

  const suggestedNum =
    selectedEtage !== null ? nextPorteNumero(selectedEtage, portes) : null;
  const [customNum, setCustomNum] = useState<number | null>(null);
  const effectiveNum =
    customNum !== null ? customNum : (suggestedNum ?? 0);

  const duplicatePorte = useMemo(() => {
    if (effectiveNum <= 0) return null;
    const target = String(effectiveNum);
    return portes.find((p) => String(p.numero) === target) ?? null;
  }, [portes, effectiveNum]);

  const handleSelectFloor = useCallback(
    (etage: number) => {
      const floor = floors.find((f) => f.etage === etage);
      if (floor?.locked) return;
      Haptics.select();
      setSelectedEtage(etage);
      setCustomNum(null);
      setStep("porte");
    },
    [floors],
  );

  const handleBackToFloor = useCallback(() => {
    Haptics.select();
    setStep("etage");
  }, []);

  const handleCreateNew = useCallback(async () => {
    if (selectedEtage === null || effectiveNum <= 0) return;
    if (isFloorAtCapacity) {
      setError(`Étage complet (${nbPortesParEtage} portes maximum).`);
      return;
    }
    if (duplicatePorte) {
      Haptics.light();
      session.beginFromExisting(duplicatePorte);
      return;
    }
    Haptics.light();
    const res = await session.submitPorte({
      etage: selectedEtage,
      numero: String(effectiveNum),
    });
    if (!res.ok) {
      setError(
        "message" in res && res.message
          ? res.message
          : "Création impossible. Réessaie.",
      );
    }
  }, [duplicatePorte, effectiveNum, isFloorAtCapacity, nbPortesParEtage, selectedEtage, session]);

  const handleExistingTap = useCallback(
    (porte: Porte) => {
      Haptics.select();
      session.beginFromExisting(porte);
    },
    [session],
  );

  const pad = isTablet ? TABLET_PAD : SCREEN_PAD;
  const cols = isTablet ? 5 : 4;

  return (
    <Animated.View
      entering={SlideInDown.duration(260)}
      exiting={FadeOut.duration(140)}
      style={[
        styles.viewRoot,
        isTablet ? styles.viewRootTablet : { paddingTop: insetsTop + 8 },
      ]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: pad,
          paddingBottom: insetsBottom + 24,
          gap: 20,
        }}
      >
        <View style={styles.headerRow}>
          {step === "porte" ? (
            <Pressable
              onPress={handleBackToFloor}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Retour aux étages"
              hitSlop={10}
            >
              <Feather name="chevron-left" size={22} color={colors.text} />
            </Pressable>
          ) : (
            <Pressable
              onPress={session.cancel}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={10}
            >
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          )}
          <View style={styles.stepBadge}>
            <View
              style={step === "porte" ? styles.dotDone : styles.dotActive}
            />
            <View
              style={step === "porte" ? styles.dotActive : styles.dotInactive}
            />
            <View style={styles.dotInactive} />
          </View>
          <View style={{ width: 36 }} />
        </View>

        {step === "etage" ? (
          <Animated.View entering={FadeIn.duration(140)} style={{ gap: 18 }}>
            <View style={styles.heroBlock}>
              <Text style={styles.eyebrow}>Étape 1</Text>
              <Text style={styles.heroTitle}>Quel étage ?</Text>
              <Text style={styles.heroLead}>
                Tape l'étage où tu vas prospecter. Aucune saisie au clavier.
              </Text>
            </View>
            <View
              style={[
                styles.floorGrid,
                { gap: isTablet ? 14 : 10 },
              ]}
            >
              {floors.map((floor) => (
                <View
                  key={floor.etage}
                  style={{
                    flexBasis: `${Math.floor(100 / cols) - 2}%`,
                    flexGrow: 1,
                  }}
                >
                  <FloorCard
                    etage={floor.etage}
                    done={floor.done}
                    total={floor.total}
                    selected={selectedEtage === floor.etage}
                    onPress={() => handleSelectFloor(floor.etage)}
                    isTablet={isTablet}
                    locked={floor.locked}
                  />
                </View>
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(140)} style={{ gap: 18 }}>
            <View style={styles.heroBlock}>
              <Text style={styles.eyebrow}>Étape 2 · Étage {selectedEtage}</Text>
              <Text style={styles.heroTitle}>Quelle porte ?</Text>
              <Text style={styles.heroLead}>
                Choisis une porte existante pour la repasser, ou démarre la
                suivante.
              </Text>
            </View>

            {prospectedOnFloor.length > 0 ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>
                  Déjà prospectées · {prospectedOnFloor.length}
                </Text>
                <View
                  style={[
                    styles.porteChipGrid,
                    { gap: isTablet ? 12 : 10 },
                  ]}
                >
                  {prospectedOnFloor.map((porte) => (
                    <View
                      key={porte.id}
                      style={{
                        flexBasis: isTablet ? "23%" : "31%",
                        flexGrow: 1,
                      }}
                    >
                      <PorteChip
                        porte={porte}
                        onPress={() => handleExistingTap(porte)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Nouvelle porte</Text>
              <View style={styles.newPorteCard}>
                <View style={styles.newPorteRow}>
                  <Pressable
                    style={styles.stepperBtn}
                    onPress={() =>
                      setCustomNum((prev) => {
                        const base = prev !== null ? prev : (suggestedNum ?? 0);
                        return Math.max(1, base - 1);
                      })
                    }
                    accessibilityLabel="Diminuer le numéro"
                    hitSlop={6}
                  >
                    <Feather name="minus" size={18} color={colors.text} />
                  </Pressable>
                  <View style={styles.newPorteNumWrap}>
                    <Text style={styles.newPorteEyebrow}>Numéro de porte</Text>
                    <TextInput
                      value={String(effectiveNum)}
                      onChangeText={(v) => {
                        const cleaned = v.replace(/[^0-9]/g, "");
                        if (cleaned === "") {
                          setCustomNum(0);
                          return;
                        }
                        const parsed = parseInt(cleaned, 10);
                        setCustomNum(Number.isNaN(parsed) ? 0 : parsed);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.newPorteNumInput}
                      selectTextOnFocus
                      accessibilityLabel="Numéro de porte"
                    />
                  </View>
                  <Pressable
                    style={[styles.stepperBtn, styles.stepperBtnPrimary]}
                    onPress={() =>
                      setCustomNum((prev) =>
                        (prev !== null ? prev : (suggestedNum ?? 0)) + 1,
                      )
                    }
                    accessibilityLabel="Augmenter le numéro"
                    hitSlop={6}
                  >
                    <Feather name="plus" size={18} color={colors.textOnPrimary} />
                  </Pressable>
                </View>
                {customNum !== null && customNum !== suggestedNum ? (
                  <Pressable
                    onPress={() => setCustomNum(null)}
                    style={styles.newPorteReset}
                    hitSlop={6}
                  >
                    <Feather name="rotate-ccw" size={11} color={colors.textSubtle} />
                    <Text style={styles.newPorteResetText}>
                      Revenir à {suggestedNum}
                    </Text>
                  </Pressable>
                ) : null}
                {duplicatePorte ? (
                  <View style={styles.dupBox}>
                    <Feather name="info" size={13} color={colors.warningText} />
                    <Text style={styles.dupText}>
                      Porte {duplicatePorte.numero} existe déjà
                      {duplicatePorte.etage !== selectedEtage
                        ? ` (étage ${duplicatePorte.etage})`
                        : ""}
                      . Tape sur le bouton pour la reprendre.
                    </Text>
                  </View>
                ) : null}
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={13} color={colors.dangerText} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  pressed && styles.ctaPressed,
                  (isCreating || isFloorAtCapacity) && styles.ctaDisabled,
                ]}
                onPress={handleCreateNew}
                disabled={isCreating || isFloorAtCapacity}
              >
                <Text style={styles.ctaText}>
                  {isCreating
                    ? "Création..."
                    : duplicatePorte
                      ? `Reprendre la porte ${effectiveNum}`
                      : `Démarrer la porte ${effectiveNum}`}
                </Text>
                {!isCreating ? (
                  <Feather name="arrow-right" size={18} color={colors.textOnPrimary} />
                ) : null}
              </Pressable>
              {isFloorAtCapacity ? (
                <Text style={styles.capacityNotice}>
                  L'étage est complet ({nbPortesParEtage} portes). Termine ou supprime des portes existantes.
                </Text>
              ) : null}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  READY VIEW — confirmation "Prêt à sonner" + bouton Commencer
// ────────────────────────────────────────────────────────────────────────────

function ReadyView({
  session,
  isTablet,
  insetsTop,
  insetsBottom,
}: {
  session: ProspectionSessionApi;
  isTablet: boolean;
  insetsTop: number;
  insetsBottom: number;
}) {
  const state = session.state;
  if (state.phase !== "READY") return null;
  const { porte } = state;

  const handleStart = useCallback(() => {
    Haptics.medium();
    session.startActive();
  }, [session]);

  const pad = isTablet ? TABLET_PAD : SCREEN_PAD;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={[
        styles.viewRoot,
        isTablet ? styles.viewRootTablet : { paddingTop: insetsTop + 8 },
      ]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: pad,
          paddingBottom: insetsBottom + 24,
          gap: 22,
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 22 }}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={session.cancel}
              style={styles.iconBtn}
              accessibilityRole="button"
              hitSlop={10}
            >
              <Feather name="chevron-left" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.stepBadge}>
              <View style={styles.dotDone} />
              <View style={styles.dotActive} />
              <View style={styles.dotInactive} />
            </View>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.heroBlock}>
            <Text style={styles.eyebrow}>Tu approches de la porte</Text>
            <Text style={styles.heroTitle}>Prêt à sonner ?</Text>
          </View>

          <View style={[styles.porteCard, isTablet && styles.porteCardTablet]}>
            <View style={styles.porteCardTopRow}>
              <View style={styles.porteIconWrap}>
                <Feather name="bell" size={20} color={colors.text} />
              </View>
              <View style={styles.porteEtageBadge}>
                <Text style={styles.porteEtageText}>
                  Étage {porte.etage}
                </Text>
              </View>
            </View>
            <Text style={styles.porteNumber}>{porte.numero}</Text>
            <Text style={styles.porteSubtitle}>
              {porte.nomPersonnalise || "Porte à prospecter"}
            </Text>
          </View>

          <View style={styles.tipCard}>
            <View style={styles.tipDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Démarre quand tu sonnes</Text>
              <Text style={styles.tipBody}>
                Sonne, échange avec le prospect, puis clôture le passage avec
                un statut.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Pressable
            style={({ pressed }) => [
              styles.startBtn,
              pressed && styles.startBtnPressed,
            ]}
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel="Démarrer la prospection de cette porte"
          >
            <View style={styles.startBtnIcon}>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.startBtnText}>Prospection</Text>
          </Pressable>
          <Pressable
            style={styles.ghostBtn}
            onPress={session.cancel}
            hitSlop={6}
          >
            <Text style={styles.ghostBtnText}>Annuler la création</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  ACTIVE VIEW — live header + status grid + commentaire + save
// ────────────────────────────────────────────────────────────────────────────

function ActiveView({
  session,
  isTablet,
  insetsTop,
  insetsBottom,
}: {
  session: ProspectionSessionApi;
  isTablet: boolean;
  insetsTop: number;
  insetsBottom: number;
}) {
  const state = session.state;
  if (state.phase !== "ACTIVE" && state.phase !== "SAVING") return null;

  const { porte, startedAt } = state;
  const isSaving = state.phase === "SAVING";

  const [selectedStatus, setSelectedStatus] = useState<StatusKey | null>(null);
  const [commentaire, setCommentaire] = useState(porte.commentaire || "");
  const [nomPersonnalise, setNomPersonnalise] = useState(
    porte.nomPersonnalise || "",
  );
  const [rdvDate, setRdvDate] = useState(porte.rdvDate || getTodayDate());
  const [rdvTime, setRdvTime] = useState(porte.rdvTime || getNowTime());
  const [nbContrats, setNbContrats] = useState(porte.nbContrats || 1);

  const submittingRef = useRef(false);

  // Intercept Android back: confirm abort
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isSaving) return true;
      Alert.alert(
        "Annuler ce passage ?",
        "Ce passage sera ignoré et aucun statut ne sera sauvegardé pour cette porte.",
        [
          { text: "Continuer la prospection", style: "cancel" },
          {
            text: "Annuler",
            style: "destructive",
            onPress: () => session.abortActive(),
          },
        ],
      );
      return true;
    });
    return () => sub.remove();
  }, [isSaving, session]);

  const handleSelect = useCallback((key: StatusKey) => {
    Haptics.select();
    setSelectedStatus(key);
  }, []);

  const handleAbsentShortcut = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    Haptics.medium();
    const input: SaveStatusInput = {
      statut: "ABSENT",
      commentaire: commentaire.trim() || undefined,
      nomPersonnalise: nomPersonnalise.trim() || undefined,
    };
    const res = await session.saveStatus(input);
    if (!res.ok) submittingRef.current = false;
    else Haptics.success();
  }, [commentaire, nomPersonnalise, session]);

  const handleSave = useCallback(async () => {
    if (!selectedStatus) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    Haptics.medium();

    const input: SaveStatusInput = {
      statut: selectedStatus,
      commentaire: commentaire.trim() || undefined,
      nomPersonnalise: nomPersonnalise.trim() || undefined,
    };

    if (selectedStatus === "RENDEZ_VOUS_PRIS") {
      input.rdvDate = rdvDate;
      input.rdvTime = rdvTime;
    }
    if (selectedStatus === "CONTRAT_SIGNE") {
      input.nbContrats = nbContrats;
    }

    const res = await session.saveStatus(input);
    if (!res.ok) submittingRef.current = false;
    else Haptics.success();
  }, [selectedStatus, commentaire, nomPersonnalise, rdvDate, rdvTime, nbContrats, session]);

  const handleAbort = useCallback(() => {
    Alert.alert(
      "Annuler ce passage ?",
      "Ce passage sera ignoré et aucun statut ne sera sauvegardé pour cette porte.",
      [
        { text: "Continuer la prospection", style: "cancel" },
        {
          text: "Annuler",
          style: "destructive",
          onPress: () => {
            Haptics.warning();
            session.abortActive();
          },
        },
      ],
    );
  }, [session]);

  const pad = isTablet ? TABLET_PAD : SCREEN_PAD;
  const isRdv = selectedStatus === "RENDEZ_VOUS_PRIS";
  const isContrat = selectedStatus === "CONTRAT_SIGNE";

  const ctaLabel = useMemo(() => {
    if (isSaving) return "Enregistrement...";
    if (!selectedStatus) return "Choisis un statut";
    const desc = selectedStatus === "ABSENT" ? null : STATUSES[selectedStatus];
    return desc
      ? `Enregistrer · ${desc.label}`
      : "Enregistrer";
  }, [selectedStatus, isSaving]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View
        entering={SlideInDown.duration(280)}
        exiting={SlideOutDown.duration(200)}
        style={[
          styles.viewRoot,
          isTablet ? styles.viewRootTablet : { paddingTop: insetsTop + 8 },
        ]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: pad,
            paddingBottom: insetsBottom + 24,
            gap: 18,
          }}
        >
          <LiveSegmentHeader
            porteNumero={porte.numero}
            porteEtage={porte.etage}
            porteName={porte.nomPersonnalise}
            startedAt={startedAt}
          />

          <StatusGrid
            selected={selectedStatus}
            onSelect={handleSelect}
            onAbsentShortcut={handleAbsentShortcut}
            isTablet={isTablet}
          />

          {isRdv ? (
            <Animated.View
              entering={FadeIn.duration(180)}
              style={styles.conditionalCard}
            >
              <RdvQuickPicker
                rdvDate={rdvDate}
                rdvTime={rdvTime}
                onChangeDate={setRdvDate}
                onChangeTime={setRdvTime}
              />
            </Animated.View>
          ) : null}

          {isContrat ? (
            <Animated.View
              entering={FadeIn.duration(180)}
              style={styles.conditionalCard}
            >
              <View style={styles.conditionalHeader}>
                <View
                  style={[
                    styles.conditionalIcon,
                    { backgroundColor: colors.successSoft },
                  ]}
                >
                  <Feather name="award" size={14} color={colors.success} />
                </View>
                <Text style={styles.conditionalTitle}>Contrats signés</Text>
              </View>
              <View style={styles.counterRow}>
                <Pressable
                  style={styles.counterBtn}
                  onPress={() =>
                    setNbContrats((v) => Math.max(1, v - 1))
                  }
                  hitSlop={6}
                >
                  <Feather name="minus" size={16} color={colors.text} />
                </Pressable>
                <View style={styles.counterValueWrap}>
                  <Text style={styles.counterValue}>{nbContrats}</Text>
                  <Text style={styles.counterLabel}>contrat{nbContrats > 1 ? "s" : ""}</Text>
                </View>
                <Pressable
                  style={[styles.counterBtn, styles.counterBtnPrimary]}
                  onPress={() => setNbContrats((v) => v + 1)}
                  hitSlop={6}
                >
                  <Feather name="plus" size={16} color={colors.textOnPrimary} />
                </Pressable>
              </View>
            </Animated.View>
          ) : null}

          <View style={styles.commentCard}>
            <View style={styles.conditionalHeader}>
              <View
                style={[
                  styles.conditionalIcon,
                  { backgroundColor: "#F1F5F9" },
                ]}
              >
                <Feather name="edit-3" size={14} color="#475569" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.conditionalTitle}>Notes</Text>
                <Text style={styles.commentSubtitle}>
                  Nom, commentaire, contexte (optionnel)
                </Text>
              </View>
            </View>
            <View style={styles.inputWrap}>
              <Feather name="user" size={14} color={colors.textMuted} />
              <TextInput
                value={nomPersonnalise}
                onChangeText={setNomPersonnalise}
                placeholder="Nom (ex: Mme Martin)"
                placeholderTextColor={colors.textSubtle}
                style={styles.input}
              />
            </View>
            <TextInput
              value={commentaire}
              onChangeText={setCommentaire}
              placeholder="Notes sur l'échange..."
              placeholderTextColor="#94A3B8"
              style={styles.textarea}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cta,
              (!selectedStatus || isSaving) && styles.ctaDisabled,
              pressed && styles.ctaPressed,
            ]}
            onPress={handleSave}
            disabled={!selectedStatus || isSaving}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
            {!isSaving && selectedStatus ? (
              <Feather name="check" size={18} color={colors.textOnPrimary} />
            ) : null}
          </Pressable>

          <Pressable
            style={styles.abortBtn}
            onPress={handleAbort}
            disabled={isSaving}
            hitSlop={6}
          >
            <Feather name="x-circle" size={13} color={colors.textSubtle} />
            <Text style={styles.abortBtnText}>Annuler ce passage</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Styles
// ────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.42)",
    justifyContent: "center",
  },
  frame: {
    flex: 1,
    width: "100%",
  },
  viewRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  viewRootTablet: {
    borderRadius: 32,
    paddingTop: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  dotDone: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  heroBlock: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.info,
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.6,
  },
  heroLead: {
    fontSize: 13.5,
    color: colors.textStrong,
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: colors.text,
    paddingVertical: 0,
  },
  numPrefix: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.text,
  },
  numPrefixText: {
    color: colors.textOnPrimary,
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.2,
  },
  fieldHint: {
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: 2,
    lineHeight: 15,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    fontSize: 12.5,
    color: colors.dangerText,
    fontWeight: "600",
  },
  dupBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  dupText: {
    flex: 1,
    fontSize: 12.5,
    color: "#92400E",
    fontWeight: "600",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: colors.text,
  },
  ctaPressed: {
    backgroundColor: "#1E293B",
  },
  ctaDisabled: {
    backgroundColor: colors.textSubtle,
  },
  ctaText: {
    color: colors.textOnPrimary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  porteCard: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  porteCardTablet: {
    padding: 28,
  },
  porteCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  porteIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  porteEtageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  porteEtageText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textOnPrimary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  porteNumber: {
    fontSize: 64,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -2,
    lineHeight: 70,
    fontVariant: ["tabular-nums"],
  },
  porteSubtitle: {
    fontSize: 14,
    color: colors.textStrong,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.info,
    marginTop: 6,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  tipBody: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textStrong,
    lineHeight: 17,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 22,
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  startBtnPressed: {
    backgroundColor: colors.dangerText,
  },
  startBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  startBtnText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  ghostBtn: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  ghostBtnText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  conditionalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  conditionalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  conditionalIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  conditionalTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  commentSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSubtle,
  },
  dualInputRow: {
    flexDirection: "row",
    gap: 10,
  },
  dualInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterBtnPrimary: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  counterValueWrap: {
    alignItems: "center",
  },
  counterValue: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  counterLabel: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  commentCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textarea: {
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    color: colors.text,
  },
  abortBtn: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  abortBtnText: {
    fontSize: 12,
    color: colors.textSubtle,
    fontWeight: "600",
  },
  // ── Floor picker ────────────────────────────────────────────────
  floorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  floorCard: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    gap: 8,
    minHeight: 96,
  },
  floorCardTablet: {
    paddingVertical: 18,
    paddingHorizontal: 14,
    minHeight: 110,
  },
  floorCardSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  floorCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  floorCardNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
    lineHeight: 32,
  },
  floorCardNumberTablet: {
    fontSize: 32,
    lineHeight: 36,
  },
  floorCardNumberSelected: {
    color: colors.textOnPrimary,
  },
  floorCardCheck: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  floorCardRatio: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.2,
  },
  floorCardRatioSelected: {
    color: "rgba(255,255,255,0.7)",
  },
  floorCardBar: {
    width: "100%",
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    marginTop: 2,
  },
  floorCardBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  // ── Porte picker ────────────────────────────────────────────────
  sectionBlock: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textStrong,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 2,
  },
  porteChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  porteChip: {
    position: "relative",
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    gap: 8,
    minHeight: 80,
  },
  porteChipTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  porteChipNum: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
  },
  porteChipIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  porteChipLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  porteChipAccent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  // ── Starting (loading) ──────────────────────────────────────────
  startingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },
  startingTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    textAlign: "center",
  },
  startingHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
  // ── New porte (stepper) ─────────────────────────────────────────
  newPorteCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  newPorteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  newPorteNumWrap: {
    alignItems: "center",
    flex: 1,
  },
  newPorteEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textSubtle,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  newPorteNum: {
    marginTop: 4,
    fontSize: 36,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1.2,
    lineHeight: 40,
  },
  newPorteNumInput: {
    marginTop: 4,
    fontSize: 36,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1.2,
    textAlign: "center",
    minWidth: 120,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperBtnPrimary: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  newPorteReset: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  newPorteResetText: {
    fontSize: 11,
    color: colors.textSubtle,
    fontWeight: "600",
  },
  capacityNotice: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});
