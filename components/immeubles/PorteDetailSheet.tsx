import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
  getDisplayStatusKey,
} from "@/components/immeubles/prospection/status-display";
import type { Porte } from "@/types/api";

type PorteDetailSheetProps = {
  porte: Porte | null;
  open: boolean;
  durationMs?: number | null;
  onClose: () => void;
  onResume: (porte: Porte) => void;
  onEdit: (porte: Porte) => void;
};

// Only ABSENT (matin/soir) and RDV_PRIS are eligible for re-prospection.
// Refus, Contrat signé and Argumenté are considered closed final states.
const RESUMABLE_STATUSES = new Set([
  "ABSENT",
  "ABSENT_MATIN",
  "ABSENT_SOIR",
  "RENDEZ_VOUS_PRIS",
  "RDV_PRIS",
]);

function formatDuration(ms?: number | null): string | null {
  if (!ms || ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s} s`;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

function formatRelativeDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days} j`;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAbsoluteDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PorteDetailSheet({
  porte,
  open,
  durationMs,
  onClose,
  onResume,
  onEdit,
}: PorteDetailSheetProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(36)).current;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;

  useEffect(() => {
    if (!open) return;
    opacity.setValue(0);
    translateY.setValue(36);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, opacity, translateY]);

  if (!porte) return null;

  const statusKey = getDisplayStatusKey(porte);
  const status = statusKey
    ? (STATUS_DISPLAY[statusKey] ?? DEFAULT_STATUS_OPTION)
    : DEFAULT_STATUS_OPTION;
  const canResume = porte.statut ? RESUMABLE_STATUSES.has(porte.statut) : false;
  const duration = formatDuration(durationMs);
  const lastVisitRelative = formatRelativeDate(porte.derniereVisite);
  const lastVisitAbsolute = formatAbsoluteDate(porte.derniereVisite);
  const hasRdv =
    porte.statut === "RENDEZ_VOUS_PRIS" && (porte.rdvDate || porte.rdvTime);

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { paddingBottom: insets.bottom + 14 }]}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={isTablet ? styles.sheetTabletWrap : styles.sheetWrap}
        >
          <Animated.View
            style={[
              styles.sheet,
              isTablet && styles.sheetTablet,
              { opacity, transform: [{ translateY }] },
            ]}
          >
            <View style={styles.handle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: status.accent },
                    ]}
                  />
                  <Text
                    style={[styles.statusLabel, { color: status.accent }]}
                  >
                    {status.label}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={10}
                  accessibilityLabel="Fermer"
                >
                  <Feather name="x" size={18} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.identity}>
                <Text style={styles.eyebrow}>
                  Étage {porte.etage} · Porte
                </Text>
                <Text style={styles.porteNumber}>{porte.numero}</Text>
                {porte.nomPersonnalise ? (
                  <Text style={styles.porteName} numberOfLines={1}>
                    {porte.nomPersonnalise}
                  </Text>
                ) : null}
              </View>

              <View style={styles.factsGrid}>
                <View style={styles.factCard}>
                  <View
                    style={[
                      styles.factIcon,
                      { backgroundColor: "#0F172A" },
                    ]}
                  >
                    <Feather name="clock" size={13} color="#FFFFFF" />
                  </View>
                  <Text style={styles.factLabel}>Durée du passage</Text>
                  <Text style={styles.factValue}>
                    {duration ?? "—"}
                  </Text>
                </View>
                <View style={styles.factCard}>
                  <View
                    style={[
                      styles.factIcon,
                      { backgroundColor: status.accent },
                    ]}
                  >
                    <Feather
                      name={status.icon}
                      size={13}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.factLabel}>Dernière visite</Text>
                  <Text style={styles.factValue}>{lastVisitRelative}</Text>
                  {lastVisitAbsolute ? (
                    <Text style={styles.factSubvalue}>
                      {lastVisitAbsolute}
                    </Text>
                  ) : null}
                </View>
              </View>

              {hasRdv ? (
                <View
                  style={[
                    styles.detailRow,
                    { backgroundColor: "#E0F2FE", borderColor: "#BAE6FD" },
                  ]}
                >
                  <Feather name="calendar" size={15} color="#0C4A6E" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailRowLabel}>Rendez-vous</Text>
                    <Text
                      style={[styles.detailRowValue, { color: "#0C4A6E" }]}
                    >
                      {porte.rdvDate ?? "?"}
                      {porte.rdvTime ? ` à ${porte.rdvTime}` : ""}
                    </Text>
                  </View>
                </View>
              ) : null}

              {porte.nbRepassages && porte.nbRepassages > 0 ? (
                <View style={styles.detailRow}>
                  <Feather name="repeat" size={15} color="#475569" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailRowLabel}>Repassages</Text>
                    <Text style={styles.detailRowValue}>
                      {porte.nbRepassages} fois
                    </Text>
                  </View>
                </View>
              ) : null}

              {porte.commentaire?.trim() ? (
                <View style={styles.commentBlock}>
                  <View style={styles.commentHeader}>
                    <Feather name="edit-3" size={13} color="#64748B" />
                    <Text style={styles.commentHeaderText}>Commentaire</Text>
                  </View>
                  <Text style={styles.commentBody}>{porte.commentaire}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.footer}>
              {canResume ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.primaryBtnPressed,
                  ]}
                  onPress={() => onResume(porte)}
                >
                  <Feather name="arrow-right" size={15} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>
                    Reprendre la prospection
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [
                  canResume ? styles.ghostBtn : styles.primaryBtn,
                  pressed &&
                    (canResume
                      ? styles.ghostBtnPressed
                      : styles.primaryBtnPressed),
                ]}
                onPress={() => onEdit(porte)}
              >
                <Feather
                  name="edit-3"
                  size={15}
                  color={canResume ? "#0F172A" : "#FFFFFF"}
                />
                <Text
                  style={
                    canResume ? styles.ghostBtnText : styles.primaryBtnText
                  }
                >
                  Modifier la fiche
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "flex-end",
    paddingHorizontal: 14,
  },
  sheetWrap: {
    width: "100%",
  },
  sheetTabletWrap: {
    alignSelf: "center",
    width: 560,
    marginBottom: 28,
  },
  sheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingTop: 14,
    paddingBottom: 0,
    shadowColor: "#0F172A",
    shadowOpacity: 0.22,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
    overflow: "hidden",
  },
  sheetTablet: {
    borderRadius: 32,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    marginBottom: 6,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  identity: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  porteNumber: {
    fontSize: 44,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -1.4,
    fontVariant: ["tabular-nums"],
    lineHeight: 48,
  },
  porteName: {
    marginTop: 2,
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  factsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  factCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FAFAF7",
    borderWidth: 1,
    borderColor: "#EAECEF",
    gap: 6,
  },
  factIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  factLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
  factValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  factSubvalue: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailRowLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  detailRowValue: {
    marginTop: 2,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
  },
  commentBlock: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FAFAF7",
    borderWidth: 1,
    borderColor: "#EAECEF",
    gap: 8,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  commentBody: {
    fontSize: 13.5,
    color: "#0F172A",
    lineHeight: 19,
  },
  footer: {
    flexDirection: "column",
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EAECEF",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  ghostBtnPressed: {
    backgroundColor: "#F8FAFC",
  },
  ghostBtnText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
