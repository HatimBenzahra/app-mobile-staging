import { Card, Chip, ProgressBar } from "@/components/ui";
import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import { getImmeubleProgress } from "@/components/immeubles/lieu-progress";
import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
  getDisplayStatusKey,
} from "@/components/immeubles/prospection/status-display";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { getHabitatLabel } from "@/hooks/carte-terrain/helpers";
import type { Immeuble, Porte } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BuildingSheetProps = {
  immeuble: Immeuble | null;
  open: boolean;
  onClose: () => void;
  onProspect: (immeuble: Immeuble) => void;
  onEdit?: (immeuble: Immeuble) => void;
  onMove?: (immeuble: Immeuble) => void;
  onDelete?: (immeuble: Immeuble) => void;
  updatingLieu?: boolean;
  currentUserName?: string;
};

type PorteRow = {
  porte: Porte;
  statusKey: string;
  label: string;
};

function getPorteLabel(porte: Porte): string {
  if (porte.nomPersonnalise?.trim()) return porte.nomPersonnalise.trim();
  const etagePart = `Étage ${porte.etage}`;
  const numeroPart = porte.numero ? `Porte ${porte.numero}` : null;
  return numeroPart ? `${etagePart} · ${numeroPart}` : etagePart;
}

export default function BuildingSheet({
  immeuble,
  open,
  onClose,
  onProspect,
  onEdit,
  onMove,
  onDelete,
  updatingLieu = false,
  currentUserName,
}: BuildingSheetProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const sheetRef = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(
    () => (isTablet ? ["40%", "75%"] : ["45%", "85%"]),
    [isTablet],
  );

  const sheetContainerStyle = isTablet
    ? { alignSelf: "center" as const, width: Math.min(width * 0.9, 720) }
    : undefined;

  useEffect(() => {
    if (open) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [open]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.45}
      />
    ),
    [],
  );

  const isMine = immeuble?.ownership === "MINE";
  const progress = immeuble ? getImmeubleProgress(immeuble) : null;
  const portes = useMemo(() => immeuble?.portes ?? [], [immeuble]);

  const counts = useMemo(() => {
    let contrats = 0;
    let contratsSignes = 0;
    let rdv = 0;
    let refus = 0;
    let absent = 0;
    portes.forEach((porte) => {
      if (porte.statut === "CONTRAT_SIGNE") {
        contratsSignes += 1;
        contrats += porte.nbContrats ?? 1;
      }
      if (porte.statut === "RENDEZ_VOUS_PRIS") rdv += 1;
      if (porte.statut === "REFUS") refus += 1;
      if (porte.statut === "ABSENT") absent += 1;
    });
    return { contrats, contratsSignes, rdv, refus, absent };
  }, [portes]);

  const porteRows = useMemo<PorteRow[]>(() => {
    return [...portes]
      .sort((a, b) => {
        if (a.etage !== b.etage) return a.etage - b.etage;
        return String(a.numero).localeCompare(String(b.numero), "fr", {
          numeric: true,
        });
      })
      .map((porte) => ({
        porte,
        statusKey: getDisplayStatusKey(porte) ?? DEFAULT_STATUS_OPTION.value,
        label: getPorteLabel(porte),
      }));
  }, [portes]);

  const handleNavigate = useCallback(
    (porteId: number) => {
      if (!immeuble) return;
      onClose();
      router.push(`/lieu/${immeuble.id}?porteId=${porteId}`);
    },
    [immeuble, onClose],
  );

  const ownershipChip = isMine ? (
    <Chip
      tone="primary"
      icon="user"
      label={currentUserName ? `Moi · ${currentUserName}` : "Mon bâtiment"}
    />
  ) : (
    <Chip
      tone="neutral"
      icon="users"
      label={immeuble?.creatorName ? `Équipe · ${immeuble.creatorName}` : "Équipe"}
    />
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      onDismiss={onClose}
      detached={isTablet}
      bottomInset={isTablet ? insets.bottom + 12 : 0}
      style={sheetContainerStyle}
      backgroundStyle={[styles.sheetBackground, isTablet && { borderRadius: 28 }]}
      handleIndicatorStyle={styles.handleIndicator}
    >
      {immeuble ? (
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <HabitatIcon
                type={immeuble.typeHabitat}
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                {getHabitatLabel(immeuble.typeHabitat)}
              </Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {immeuble.adresse}
              </Text>
            </View>
          </View>
          <View style={styles.chipRow}>{ownershipChip}</View>

          {/* KPI SUMMARY */}
          {progress && portes.length > 0 ? (
            <Card variant="outlined" padding="md" style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiPercent}>{progress.percent}%</Text>
                <Text style={styles.kpiPercentLabel}>prospecté</Text>
              </View>
              <ProgressBar
                value={progress.percent}
                color={progress.color}
                height={8}
              />
              <View style={styles.factsGrid}>
                <View style={styles.factCard}>
                  <Text style={styles.factLabel}>Prospectées</Text>
                  <Text style={styles.factValue}>
                    {progress.prospectees}/{progress.total}
                  </Text>
                </View>
                <View style={styles.factCard}>
                  <Text style={styles.factLabel}>Contrats</Text>
                  <Text style={styles.factValue}>{counts.contrats}</Text>
                </View>
              </View>
              <View style={styles.factsGrid}>
                <View style={styles.factCard}>
                  <Text style={styles.factLabel}>RDV</Text>
                  <Text style={styles.factValue}>{counts.rdv}</Text>
                </View>
                <View style={styles.factCard}>
                  <Text style={styles.factLabel}>Refus</Text>
                  <Text style={styles.factValue}>{counts.refus}</Text>
                </View>
                <View style={styles.factCard}>
                  <Text style={styles.factLabel}>Absents</Text>
                  <Text style={styles.factValue}>{counts.absent}</Text>
                </View>
              </View>
            </Card>
          ) : (
            <Card variant="outlined" padding="md" style={styles.emptyCard}>
              <Feather name="inbox" size={20} color={colors.textSubtle} />
              <Text style={styles.emptyText}>Aucune donnée de portes</Text>
            </Card>
          )}

          {/* PER-PORTE LIST */}
          {porteRows.length > 0 ? (
            <View style={styles.listBlock}>
              <View style={styles.listHeaderRow}>
                <Text style={styles.sectionLabel}>Portes</Text>
                <Text style={styles.timeCaption}>temps bientôt disponible</Text>
              </View>
              {porteRows.map(({ porte, statusKey, label }) => {
                const status =
                  STATUS_DISPLAY[statusKey] ?? DEFAULT_STATUS_OPTION;
                return (
                  <Pressable
                    key={porte.id}
                    style={styles.porteRow}
                    onPress={() => handleNavigate(porte.id)}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: status.accent }]}
                    />
                    <View style={styles.porteTextBlock}>
                      <Text style={styles.porteLabel} numberOfLines={1}>
                        {label}
                      </Text>
                      <View style={styles.porteStatusRow}>
                        <Feather
                          name={status.icon}
                          size={11}
                          color={status.accent}
                        />
                        <Text style={styles.porteStatusText}>{status.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.porteTime}>—</Text>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={colors.textSubtle}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* ACTION ROW */}
          <View style={styles.actions}>
            {isMine ? (
              <>
                <Pressable
                  style={styles.action}
                  onPress={() => onProspect(immeuble)}
                >
                  <Feather
                    name="arrow-right-circle"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.actionText}>Prospecter</Text>
                </Pressable>
                <Pressable
                  style={styles.action}
                  onPress={() => onEdit?.(immeuble)}
                  disabled={updatingLieu}
                >
                  <Feather name="edit-3" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Modifier</Text>
                </Pressable>
                <Pressable
                  style={styles.action}
                  onPress={() => onMove?.(immeuble)}
                  disabled={updatingLieu}
                >
                  <Feather name="move" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Déplacer</Text>
                </Pressable>
                <Pressable
                  style={[styles.action, styles.actionDanger]}
                  onPress={() => onDelete?.(immeuble)}
                  disabled={updatingLieu}
                >
                  {updatingLieu ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Feather name="trash-2" size={18} color={colors.danger} />
                  )}
                  <Text style={[styles.actionText, styles.actionDangerText]}>
                    Supprimer
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={[styles.action, styles.actionFull]}
                onPress={() => onProspect(immeuble)}
              >
                <Feather name="eye" size={18} color={colors.primary} />
                <Text style={styles.actionText}>Voir le détail</Text>
              </Pressable>
            )}
          </View>
        </BottomSheetScrollView>
      ) : null}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
  },
  handleIndicator: {
    width: 44,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  kpiCard: {
    gap: spacing.md,
  },
  kpiHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  kpiPercent: {
    fontSize: fontSize["3xl"],
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  kpiPercentLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  factsGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  factCard: {
    flex: 1,
    gap: 4,
  },
  factLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: colors.textSubtle,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  factValue: {
    fontSize: fontSize.lg,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  listBlock: {
    gap: spacing.xs,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: "800",
    color: colors.textSubtle,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  timeCaption: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    color: colors.textSubtle,
    fontStyle: "italic",
  },
  porteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  porteTextBlock: {
    flex: 1,
    gap: 2,
  },
  porteLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  porteStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  porteStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  porteTime: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionFull: {
    minWidth: "100%",
  },
  actionDanger: {
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  actionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  actionDangerText: {
    color: colors.danger,
  },
});
