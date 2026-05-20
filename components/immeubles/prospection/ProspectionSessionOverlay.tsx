import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import type {
  ProspectionSessionApi,
  SaveStatusInput,
} from "@/hooks/prospection/use-prospection-session";

type ProspectionSessionOverlayProps = {
  session: ProspectionSessionApi;
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

function NamingView({
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
  const isCreating = state.phase === "CREATING";

  const initialEtage =
    state.phase === "NAMING" || state.phase === "CREATING"
      ? String(state.etage || 1)
      : "1";
  const initialNumero =
    state.phase === "NAMING" || state.phase === "CREATING"
      ? state.numero
      : "";

  const [etage, setEtage] = useState(initialEtage);
  const [numero, setNumero] = useState(initialNumero);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const etageNum = Number(etage);
    if (!numero.trim()) {
      setError("Numéro requis");
      return;
    }
    if (!etage || Number.isNaN(etageNum) || etageNum < 1) {
      setError("Étage invalide");
      return;
    }
    setError(null);
    Haptics.light();
    const res = await session.submitPorte({ etage: etageNum, numero });
    if (!res.ok) {
      setError("Création impossible. Réessaie.");
    }
  }, [etage, numero, session]);

  const pad = isTablet ? TABLET_PAD : SCREEN_PAD;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
            gap: 22,
          }}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={session.cancel}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={10}
            >
              <Feather name="x" size={20} color="#0F172A" />
            </Pressable>
            <View style={styles.stepBadge}>
              <View style={styles.dotActive} />
              <View style={styles.dotInactive} />
              <View style={styles.dotInactive} />
            </View>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.heroBlock}>
            <Text style={styles.eyebrow}>Nouvelle prospection</Text>
            <Text style={styles.heroTitle}>Quelle porte ?</Text>
            <Text style={styles.heroLead}>
              Indique l'étage et le numéro. La porte sera créée et tu pourras
              démarrer dès que tu sonnes.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Étage</Text>
              <View style={styles.inputWrap}>
                <Feather name="layers" size={16} color="#64748B" />
                <TextInput
                  value={etage}
                  onChangeText={(v) => {
                    setEtage(v.replace(/[^0-9]/g, ""));
                    if (error) setError(null);
                  }}
                  placeholder="Ex: 3"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  style={styles.input}
                  editable={!isCreating}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Numéro de porte</Text>
              <View style={styles.inputWrap}>
                <Feather name="hash" size={16} color="#64748B" />
                {etage && /^\d+$/.test(numero) && !numero.startsWith(etage) ? (
                  <View style={styles.numPrefix}>
                    <Text style={styles.numPrefixText}>{etage}</Text>
                  </View>
                ) : null}
                <TextInput
                  value={numero}
                  onChangeText={(v) => {
                    setNumero(v);
                    if (error) setError(null);
                  }}
                  placeholder={etage ? `Ex: 2 → ${etage}02` : "Ex: 2"}
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  editable={!isCreating}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
              </View>
              <Text style={styles.fieldHint}>
                Tape juste le numéro de porte (ex: « 2 »). L'étage est ajouté automatiquement.
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={13} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.ctaPressed,
              isCreating && styles.ctaDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isCreating}
          >
            <Text style={styles.ctaText}>
              {isCreating ? "Création..." : "Continuer"}
            </Text>
            {!isCreating ? (
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            ) : null}
          </Pressable>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
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
              <Feather name="chevron-left" size={22} color="#0F172A" />
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
                <Feather name="bell" size={20} color="#0F172A" />
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
              <Feather name="play" size={18} color="#FFFFFF" />
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
        "Ce passage sera ignoré et aucun statut ne sera enregistré pour cette porte.",
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
      "Ce passage sera ignoré et aucun statut ne sera enregistré pour cette porte.",
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
              <View style={styles.conditionalHeader}>
                <View
                  style={[
                    styles.conditionalIcon,
                    { backgroundColor: "#E0F2FE" },
                  ]}
                >
                  <Feather name="calendar" size={14} color="#0284C7" />
                </View>
                <Text style={styles.conditionalTitle}>Date du rendez-vous</Text>
              </View>
              <View style={styles.dualInputRow}>
                <View style={[styles.dualInput, { flex: 1.4 }]}>
                  <Feather name="calendar" size={14} color="#64748B" />
                  <TextInput
                    value={rdvDate}
                    onChangeText={setRdvDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={[styles.dualInput, { flex: 1 }]}>
                  <Feather name="clock" size={14} color="#64748B" />
                  <TextInput
                    value={rdvTime}
                    onChangeText={setRdvTime}
                    placeholder="HH:mm"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
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
                    { backgroundColor: "#D1FAE5" },
                  ]}
                >
                  <Feather name="award" size={14} color="#059669" />
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
                  <Feather name="minus" size={16} color="#0F172A" />
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
                  <Feather name="plus" size={16} color="#FFFFFF" />
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
              <Feather name="user" size={14} color="#64748B" />
              <TextInput
                value={nomPersonnalise}
                onChangeText={setNomPersonnalise}
                placeholder="Nom (ex: Mme Martin)"
                placeholderTextColor="#94A3B8"
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
              <Feather name="check" size={18} color="#FFFFFF" />
            ) : null}
          </Pressable>

          <Pressable
            style={styles.abortBtn}
            onPress={handleAbort}
            disabled={isSaving}
            hitSlop={6}
          >
            <Feather name="x-circle" size={13} color="#94A3B8" />
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
    backgroundColor: "#FAFAF7",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    backgroundColor: "#0F172A",
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  dotDone: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0F172A",
  },
  heroBlock: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284C7",
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.6,
  },
  heroLead: {
    fontSize: 13.5,
    color: "#475569",
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#EAECEF",
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
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
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: "#0F172A",
    paddingVertical: 0,
  },
  numPrefix: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#0F172A",
  },
  numPrefixText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.2,
  },
  fieldHint: {
    fontSize: 11,
    color: "#94A3B8",
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
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    fontSize: 12.5,
    color: "#B91C1C",
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
    backgroundColor: "#0F172A",
  },
  ctaPressed: {
    backgroundColor: "#1E293B",
  },
  ctaDisabled: {
    backgroundColor: "#94A3B8",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  porteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: "#EAECEF",
    shadowColor: "#0F172A",
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
    backgroundColor: "#FAFAF7",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  porteEtageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#0F172A",
  },
  porteEtageText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  porteNumber: {
    fontSize: 64,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -2,
    lineHeight: 70,
    fontVariant: ["tabular-nums"],
  },
  porteSubtitle: {
    fontSize: 14,
    color: "#475569",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0284C7",
    marginTop: 6,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  tipBody: {
    marginTop: 4,
    fontSize: 12,
    color: "#475569",
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
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  startBtnPressed: {
    backgroundColor: "#B91C1C",
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
    color: "#FFFFFF",
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
    color: "#64748B",
    fontWeight: "600",
  },
  conditionalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#EAECEF",
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
    color: "#0F172A",
  },
  commentSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#94A3B8",
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
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  counterBtnPrimary: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  counterValueWrap: {
    alignItems: "center",
  },
  counterValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  counterLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  commentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#EAECEF",
  },
  textarea: {
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 14,
    color: "#0F172A",
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
    color: "#94A3B8",
    fontWeight: "600",
  },
});
