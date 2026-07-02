import { Card, Chip, ProgressBar } from "@/components/ui";
import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import { getImmeubleProgress } from "@/components/immeubles/lieu-progress";
import FloorSection from "@/components/immeubles/prospection/FloorSection";
import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
  STATUS_OPTIONS,
  getDisplayStatusKey,
  type StatusOption,
} from "@/components/immeubles/prospection/status-display";
import { colors, fontSize, fontWeight, ownership, radius, shadows, spacing } from "@/constants/theme";
import {
  effectiveTypeHabitat,
  getLieuTerms,
} from "@/components/immeubles/lieu-terms";
import type { Immeuble, Porte } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BuildingSheetProps = {
  immeuble: Immeuble | null;
  open: boolean;
  // Porte à mettre en avant (anneau + pulse) après une redirection depuis l'agenda.
  highlightedPorteId?: number | null;
  onClose: () => void;
  onProspect: (immeuble: Immeuble) => void;
  onEdit?: (immeuble: Immeuble) => void;
  onMove?: (immeuble: Immeuble) => void;
  onDelete?: (immeuble: Immeuble) => void;
  updatingLieu?: boolean;
  currentUserName?: string;
};

type FilterOption = {
  key: string;
  status: StatusOption;
  count: number;
};

type KpiTile = {
  key: string;
  label: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  bg: string;
};

const statusKeyOf = (porte: Porte): string =>
  getDisplayStatusKey(porte) ?? DEFAULT_STATUS_OPTION.value;

function groupByEtage(portes: Porte[]): { etage: number; portes: Porte[] }[] {
  const map = new Map<number, Porte[]>();
  for (const porte of portes) {
    const list = map.get(porte.etage);
    if (list) list.push(porte);
    else map.set(porte.etage, [porte]);
  }
  return Array.from(map.entries())
    .map(([etage, items]) => ({ etage, portes: items }))
    .sort((a, b) => b.etage - a.etage);
}

// Status filter chip — même palette accent-tint que StatusBadge/PorteTile.
function FilterChip({
  label,
  count,
  icon,
  accent,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  accent?: string;
}) {
  const tint = accent ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.filterChip,
        active
          ? { backgroundColor: tint, borderColor: tint }
          : { backgroundColor: `${tint}1A`, borderColor: `${tint}33` },
        pressed && !active && styles.filterChipPressed,
      ]}
    >
      {icon ? (
        <Feather name={icon} size={12} color={active ? colors.surface : tint} />
      ) : null}
      <Text style={[styles.filterChipLabel, { color: active ? colors.surface : tint }]}>
        {label}
      </Text>
      <View
        style={[
          styles.filterChipCount,
          { backgroundColor: active ? colors.whiteAlpha25 : colors.surface },
        ]}
      >
        <Text style={[styles.filterChipCountText, { color: active ? colors.surface : tint }]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

export default function BuildingSheet({
  immeuble,
  open,
  highlightedPorteId,
  onClose,
  onProspect,
  onEdit,
  onMove,
  onDelete,
  updatingLieu = false,
  currentUserName,
}: BuildingSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const highlightedFloorRef = useRef<View>(null);

  const isMine = immeuble?.ownership === "MINE";
  const own = isMine ? ownership.mine : ownership.team;
  const progress = immeuble ? getImmeubleProgress(immeuble) : null;
  const portes = useMemo(() => immeuble?.portes ?? [], [immeuble]);
  const habitatType = immeuble ? effectiveTypeHabitat(immeuble) : undefined;
  const terms = useMemo(() => getLieuTerms(habitatType), [habitatType]);
  const headerSubtitle = useMemo(
    () =>
      immeuble
        ? terms.headerSubtitle(
            immeuble.nbEtages,
            immeuble.nbPortesParEtage,
            immeuble.nbMaisonsPrevu,
          )
        : "",
    [immeuble, terms],
  );

  const counts = useMemo(() => {
    let contrats = 0;
    let rdv = 0;
    let refus = 0;
    let absent = 0;
    portes.forEach((porte) => {
      if (porte.statut === "CONTRAT_SIGNE") contrats += porte.nbContrats ?? 1;
      if (porte.statut === "RENDEZ_VOUS_PRIS") rdv += 1;
      if (porte.statut === "REFUS") refus += 1;
      if (porte.statut === "ABSENT") absent += 1;
    });
    return { contrats, rdv, refus, absent };
  }, [portes]);

  const kpiTiles = useMemo<KpiTile[]>(() => {
    return [
      {
        key: "contrats",
        label: "Contrats signés",
        value: counts.contrats,
        icon: STATUS_DISPLAY.CONTRAT_SIGNE.icon,
        accent: STATUS_DISPLAY.CONTRAT_SIGNE.accent,
        bg: colors.successSoft,
      },
      {
        key: "rdv",
        label: "RDV pris",
        value: counts.rdv,
        icon: STATUS_DISPLAY.RENDEZ_VOUS_PRIS.icon,
        accent: STATUS_DISPLAY.RENDEZ_VOUS_PRIS.accent,
        bg: colors.primarySoft,
      },
      {
        key: "refus",
        label: "Refus",
        value: counts.refus,
        icon: STATUS_DISPLAY.REFUS.icon,
        accent: STATUS_DISPLAY.REFUS.accent,
        bg: colors.dangerSoft,
      },
      {
        key: "absents",
        label: "Absents",
        value: counts.absent,
        icon: STATUS_DISPLAY.ABSENT_MATIN.icon,
        accent: STATUS_DISPLAY.ABSENT_MATIN.accent,
        bg: colors.warningSoft,
      },
    ];
  }, [counts]);

  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  useEffect(() => {
    setSelectedFilter("all");
  }, [immeuble?.id]);

  // Une porte mise en avant (redirection agenda) doit toujours être rendue : on
  // force le filtre "Tous" pour qu'un filtre résiduel (même bâtiment rouvert avec
  // un statut sélectionné) ne masque pas la porte ciblée → sinon ni pulse ni scroll.
  useEffect(() => {
    if (highlightedPorteId != null) setSelectedFilter("all");
  }, [highlightedPorteId]);

  const filterOptions = useMemo<FilterOption[]>(() => {
    const tally = new Map<string, number>();
    portes.forEach((porte) => {
      const key = statusKeyOf(porte);
      tally.set(key, (tally.get(key) ?? 0) + 1);
    });
    const ordered: FilterOption[] = [];
    STATUS_OPTIONS.forEach((status) => {
      const count = tally.get(status.value);
      if (count) ordered.push({ key: status.value, status, count });
    });
    const defaultCount = tally.get(DEFAULT_STATUS_OPTION.value);
    if (defaultCount) {
      ordered.push({
        key: DEFAULT_STATUS_OPTION.value,
        status: DEFAULT_STATUS_OPTION,
        count: defaultCount,
      });
    }
    return ordered;
  }, [portes]);

  const filteredPortes = useMemo<Porte[]>(() => {
    const base =
      selectedFilter === "all"
        ? portes
        : portes.filter((porte) => statusKeyOf(porte) === selectedFilter);
    return [...base].sort((a, b) => {
      if (a.etage !== b.etage) return a.etage - b.etage;
      return String(a.numero).localeCompare(String(b.numero), "fr", {
        numeric: true,
      });
    });
  }, [portes, selectedFilter]);

  const floorGroups = useMemo(() => groupByEtage(filteredPortes), [filteredPortes]);

  // Étage contenant la porte mise en avant → on scrolle le sheet jusqu'à lui pour
  // que le pulse soit visible sans que l'utilisateur ait à chercher.
  const highlightedEtage = useMemo(() => {
    if (highlightedPorteId == null) return null;
    const porte = portes.find((p) => p.id === highlightedPorteId);
    return porte ? porte.etage : null;
  }, [highlightedPorteId, portes]);

  useEffect(() => {
    if (highlightedEtage == null) return;
    // Laisse le sheet + la liste se monter avant de mesurer la position.
    const timer = setTimeout(() => {
      const node = highlightedFloorRef.current;
      const inner = scrollRef.current?.getInnerViewNode?.();
      if (!node || !inner) return;
      try {
        node.measureLayout(
          inner,
          (_x: number, y: number) => {
            scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
          },
          () => {},
        );
      } catch {
        // measureLayout best-effort : en cas d'échec, le pulse reste visible.
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [highlightedEtage, floorGroups]);

  const totalsPerFloor = useMemo(() => {
    const m = new Map<number, number>();
    for (const porte of portes) m.set(porte.etage, (m.get(porte.etage) ?? 0) + 1);
    // Seul l'IMMEUBLE affiche un % par étage (FloorSection ignore le total pour
    // MAISON/PAVILLON) : on ne complète la grille théorique que dans ce cas.
    if (habitatType === "IMMEUBLE") {
      const nbE = immeuble?.nbEtages;
      const nbP = immeuble?.nbPortesParEtage;
      if (nbP && nbP > 0 && nbE && nbE > 0) {
        for (let i = 1; i <= nbE; i += 1) m.set(i, nbP);
      }
    }
    return m;
  }, [portes, immeuble, habitatType]);

  const handlePorteTap = useCallback(
    (porte: Porte) => {
      if (!immeuble) return;
      router.push(`/lieu/${immeuble.id}?porteId=${porte.id}`);
    },
    [immeuble],
  );

  if (!open || !immeuble) return null;

  const ownershipChip = isMine ? (
    <Chip
      tone="neutral"
      icon="user"
      accent={own.accent}
      label={currentUserName ? `Moi · ${currentUserName}` : "Mon bâtiment"}
      style={[styles.ownChip, { backgroundColor: own.soft, borderColor: own.ring }]}
    />
  ) : (
    <Chip
      tone="neutral"
      icon="users"
      accent={own.accent}
      label={immeuble.creatorName ? `Équipe · ${immeuble.creatorName}` : "Équipe"}
      style={[styles.ownChip, { backgroundColor: own.soft, borderColor: own.ring }]}
    />
  );

  // Card flottante bornée (même form-factor que les panneaux de création) :
  // ancrée en bas de la zone carte, jamais par-dessus le rail.
  const maxHeight = Math.round(height * 0.72);

  return (
    <Card
      variant="elevated"
      padding="md"
      style={[styles.panel, { maxHeight, paddingBottom: Math.max(insets.bottom, spacing.md) }]}
    >
      {/* HEADER — adresse en titre + sous-titre à puce + fermer */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: own.soft, borderColor: own.ring }]}>
          <HabitatIcon type={immeuble.typeHabitat} size={22} color={own.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {immeuble.adresse}
          </Text>
          {headerSubtitle ? (
            <View style={styles.subtitleRow}>
              <View style={styles.subtitleDot} />
              <Text style={styles.subtitle} numberOfLines={1}>
                {headerSubtitle}
              </Text>
            </View>
          ) : null}
        </View>
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Feather name="x" size={18} color={colors.textStrong} />
        </Pressable>
      </View>

      <View style={styles.chipRow}>{ownershipChip}</View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI SUMMARY */}
        {progress && portes.length > 0 ? (
          <Card variant="outlined" padding="md" style={styles.kpiCard}>
            <View style={styles.progressRow}>
              <View style={styles.progressHead}>
                <View style={styles.percentBlock}>
                  <Text style={[styles.kpiPercent, { color: progress.color }]}>
                    {progress.percent}
                  </Text>
                  <Text style={[styles.kpiPercentSign, { color: progress.color }]}>%</Text>
                </View>
                <View style={styles.progressMeta}>
                  <Text style={styles.progressLabel}>Prospecté</Text>
                  <Text style={styles.progressCount}>
                    {progress.prospectees}/{progress.total} prospectées
                  </Text>
                </View>
              </View>
              <ProgressBar value={progress.percent} color={progress.color} height={10} />
            </View>

            <View style={styles.kpiGrid}>
              {kpiTiles.map((tile) => (
                <View key={tile.key} style={[styles.kpiTile, { backgroundColor: tile.bg }]}>
                  <View style={styles.kpiTileHead}>
                    <View style={[styles.kpiTileIcon, { backgroundColor: tile.accent }]}>
                      <Feather name={tile.icon} size={13} color={colors.surface} />
                    </View>
                    <Text style={[styles.kpiTileValue, { color: tile.accent }]}>
                      {tile.value}
                    </Text>
                  </View>
                  <Text style={styles.kpiTileLabel} numberOfLines={1}>
                    {tile.label}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : (
          <Card variant="outlined" padding="lg" style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="inbox" size={22} color={colors.textSubtle} />
            </View>
            <Text style={styles.emptyText}>Aucune donnée de portes</Text>
            <Text style={styles.emptySubtext}>
              La prospection n&apos;a pas encore commencé ici.
            </Text>
          </Card>
        )}

        {/* PORTES — libellé + filtres par statut */}
        {portes.length > 0 ? (
          <View style={styles.listMeta}>
            <Text style={styles.sectionLabel}>Portes · {portes.length}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <FilterChip
                label="Tous"
                count={portes.length}
                active={selectedFilter === "all"}
                onPress={() => setSelectedFilter("all")}
              />
              {filterOptions.map((opt) => (
                <FilterChip
                  key={opt.key}
                  label={opt.status.label}
                  count={opt.count}
                  icon={opt.status.icon}
                  accent={opt.status.accent}
                  active={selectedFilter === opt.key}
                  onPress={() => setSelectedFilter(opt.key)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* PORTES — grille par étage (FloorSection partagé) */}
        {portes.length > 0 ? (
          floorGroups.length > 0 ? (
            <View style={styles.floorList}>
              {floorGroups.map((group) => {
                const isHighlightedFloor = group.etage === highlightedEtage;
                return (
                  <View
                    key={group.etage}
                    ref={isHighlightedFloor ? highlightedFloorRef : undefined}
                    collapsable={false}
                  >
                    <FloorSection
                      etage={group.etage}
                      portes={group.portes}
                      totalOnFloor={totalsPerFloor.get(group.etage)}
                      onPorteTap={handlePorteTap}
                      typeHabitat={habitatType}
                      highlightedPorteId={highlightedPorteId}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.filterEmpty}>
              <Feather name="filter" size={18} color={colors.textSubtle} />
              <Text style={styles.filterEmptyText}>Aucune porte pour ce filtre</Text>
            </View>
          )
        ) : null}
      </ScrollView>

      {/* ACTIONS */}
      <View style={styles.actions}>
        {isMine ? (
          <>
            <Pressable style={styles.action} onPress={() => onProspect(immeuble)}>
              <Feather name="arrow-right-circle" size={18} color={colors.primary} />
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
              <Text style={[styles.actionText, styles.actionDangerText]}>Supprimer</Text>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  // Card flottante — aligne son form-factor sur CreatePanel/EditLieuPanel.
  panel: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    gap: spacing.sm,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  subtitleDot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.textSubtle,
  },
  subtitle: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ownChip: {
    alignSelf: "flex-start",
  },

  // Scrollable body (borne la hauteur de la Card)
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xs,
  },

  // KPI
  kpiCard: {
    gap: spacing.lg,
  },
  progressRow: {
    gap: spacing.sm,
  },
  progressHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  percentBlock: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  kpiPercent: {
    fontSize: 34,
    fontWeight: fontWeight.extrabold,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
    lineHeight: 38,
  },
  kpiPercentSign: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    marginLeft: 2,
  },
  progressMeta: {
    alignItems: "flex-end",
  },
  progressLabel: {
    fontSize: 10.5,
    fontWeight: fontWeight.extrabold,
    color: colors.textSubtle,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  progressCount: {
    marginTop: 2,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textStrong,
    fontVariant: ["tabular-nums"],
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  kpiTile: {
    flexGrow: 1,
    flexBasis: "47%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    gap: spacing.xs,
  },
  kpiTileHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiTileIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiTileValue: {
    fontSize: fontSize["3xl"],
    fontWeight: fontWeight.extrabold,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  kpiTileLabel: {
    fontSize: 10.5,
    fontWeight: fontWeight.extrabold,
    color: colors.textStrong,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  // Empty state
  emptyCard: {
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Porte list — section label + filters
  listMeta: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extrabold,
    color: colors.textSubtle,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    paddingRight: spacing.lg,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  filterChipPressed: {
    opacity: 0.7,
  },
  filterChipLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  filterChipCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipCountText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extrabold,
    fontVariant: ["tabular-nums"],
  },

  // Grille des portes par étage
  floorList: {
    gap: spacing.xl,
  },

  // Filtered-empty inline state
  filterEmpty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  filterEmptyText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },

  // Actions
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
