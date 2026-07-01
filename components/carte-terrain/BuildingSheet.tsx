import { Card, Chip, ProgressBar } from "@/components/ui";
import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import { getImmeubleProgress } from "@/components/immeubles/lieu-progress";
import StatusBadge from "@/components/immeubles/prospection/StatusBadge";
import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
  STATUS_OPTIONS,
  getDisplayStatusKey,
  type StatusOption,
} from "@/components/immeubles/prospection/status-display";
import { colors, fontSize, fontWeight, ownership, radius, shadows, spacing } from "@/constants/theme";
import { getHabitatLabel } from "@/hooks/carte-terrain/helpers";
import {
  effectiveTypeHabitat,
  getLieuTerms,
  type LieuTerms,
} from "@/components/immeubles/lieu-terms";
import type { Immeuble, Porte } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetSectionList,
} from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// A status filter chip: the status it targets, its display option, and how
// many portes currently match it (derived from the full set, not filtered).
type FilterOption = {
  key: string;
  status: StatusOption;
  count: number;
};

type PorteSection = {
  // Empty title → flat list (no visible section header). Non-empty → floor group.
  title: string;
  data: PorteRow[];
};

// Short RDV date hint ("12 mars") shown as meta on RDV rows when available.
function formatRdvHint(porte: Porte): string | null {
  if (porte.statut !== "RENDEZ_VOUS_PRIS") return null;
  if (!porte.rdvDate) return null;
  const d = new Date(porte.rdvDate);
  if (Number.isNaN(d.getTime())) {
    // rdvDate may already be a human string — surface it as-is.
    return porte.rdvTime ? `${porte.rdvDate} · ${porte.rdvTime}` : porte.rdvDate;
  }
  const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return porte.rdvTime ? `${label} · ${porte.rdvTime}` : label;
}

// One KPI tile descriptor: which status accent/bg colors it, its icon + label.
type KpiTile = {
  key: string;
  label: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  bg: string;
};

function getPorteLabel(porte: Porte, terms: LieuTerms): string {
  if (porte.nomPersonnalise?.trim()) return porte.nomPersonnalise.trim();
  // Maison : foyer unique, aucune notion d'étage.
  if (!terms.showFloors) return terms.unitLabel;
  // Immeuble → "Étage N", Pavillon → "Maison N" (l'étage représente la n-ième maison).
  const unitPart = `${terms.unitLabel} ${porte.etage}`;
  // Le pavillon n'a qu'une porte par maison : le numéro de porte est redondant.
  if (terms.isPavillon) return unitPart;
  const numeroPart = porte.numero ? `Porte ${porte.numero}` : null;
  return numeroPart ? `${unitPart} · ${numeroPart}` : unitPart;
}

// Status filter chip — same accent-tint palette as StatusBadge/PorteTile so a
// status filter chip reads as the muted twin of its badge. Inactive: accent at
// 10% bg / 20% border + accent icon/label/count. Active: accent-filled with
// white content (the neutral "Tous" falls back to the brand primary as accent).
// The count rides in a pill so chips stay scannable at a glance.
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
        <Feather
          name={icon}
          size={12}
          color={active ? colors.surface : tint}
        />
      ) : null}
      <Text
        style={[
          styles.filterChipLabel,
          { color: active ? colors.surface : tint },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.filterChipCount,
          {
            backgroundColor: active
              ? colors.whiteAlpha25
              : colors.surface,
          },
        ]}
      >
        <Text
          style={[
            styles.filterChipCountText,
            { color: active ? colors.surface : tint },
          ]}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

// --- Per-porte row — leading status icon chip + label + status tag + meta
//     + trailing chevron + muted "—" time. No accent bar / ringed dot. ---
// Extracted + memoized: BottomSheetSectionList items only need to re-render
// when their own row data or the shared onPress identity changes.
const PorteItem = memo(function PorteItem({
  item,
  onPress,
}: {
  item: PorteRow;
  onPress: (porteId: number) => void;
}) {
  const status = STATUS_DISPLAY[item.statusKey] ?? DEFAULT_STATUS_OPTION;
  const rdvHint = formatRdvHint(item.porte);
  const repassages = item.porte.nbRepassages ?? 0;
  const contrats = item.porte.statut === "CONTRAT_SIGNE" ? item.porte.nbContrats ?? 1 : 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.porteRow, pressed && styles.porteRowPressed]}
      onPress={() => onPress(item.porte.id)}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}, ${status.label}`}
    >
      <View
        style={[
          styles.porteIcon,
          {
            backgroundColor: `${status.accent}1A`,
            borderColor: `${status.accent}33`,
          },
        ]}
      >
        <Feather name={status.icon} size={16} color={status.accent} />
      </View>
      <View style={styles.porteTextBlock}>
        <Text style={styles.porteLabel} numberOfLines={1}>
          {item.label}
        </Text>
        <View style={styles.porteMetaRow}>
          <StatusBadge statusKey={item.statusKey} />
          {contrats > 0 ? (
            <View style={styles.metaItem}>
              <Feather name="award" size={11} color={colors.textSubtle} />
              <Text style={styles.metaText}>{contrats}</Text>
            </View>
          ) : null}
          {rdvHint ? (
            <View style={styles.metaItem}>
              <Feather name="calendar" size={11} color={colors.textSubtle} />
              <Text style={styles.metaText} numberOfLines={1}>
                {rdvHint}
              </Text>
            </View>
          ) : null}
          {repassages > 0 ? (
            <View style={styles.metaItem}>
              <Feather name="repeat" size={11} color={colors.textSubtle} />
              <Text style={styles.metaText}>{repassages}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={styles.porteTime}>—</Text>
      <Feather name="chevron-right" size={18} color={colors.borderStrong} />
    </Pressable>
  );
});

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

  // L'écran carte est-il au premier plan ? Quand on navigue vers /lieu/[id],
  // l'écran perd le focus : on masque la sheet (sinon elle flotterait par-dessus
  // la page de détail via le portail gorhom), SANS effacer la sélection, puis on
  // la ré-affiche au retour — l'état est ainsi préservé.
  const screenFocused = useIsFocused();
  // Distingue un dismiss "navigation" (à ignorer) d'un vrai close utilisateur.
  const keepSelectionRef = useRef(false);

  useEffect(() => {
    if (open && screenFocused) {
      sheetRef.current?.present();
    } else {
      if (open && !screenFocused) keepSelectionRef.current = true;
      sheetRef.current?.dismiss();
    }
  }, [open, screenFocused]);

  const handleSheetDismiss = useCallback(() => {
    // Dismiss déclenché par la perte de focus (navigation) → on garde la sélection.
    if (keepSelectionRef.current) {
      keepSelectionRef.current = false;
      return;
    }
    // Vrai close utilisateur (glissement / backdrop) → on efface la sélection.
    onClose();
  }, [onClose]);

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
  const own = isMine ? ownership.mine : ownership.team;
  const progress = immeuble ? getImmeubleProgress(immeuble) : null;
  const portes = useMemo(() => immeuble?.portes ?? [], [immeuble]);
  const terms = useMemo(
    () => getLieuTerms(immeuble ? effectiveTypeHabitat(immeuble) : undefined),
    [immeuble],
  );

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

  // KPI tiles colored from the shared STATUS_DISPLAY palette so the grid
  // matches the per-porte rows and the rest of the prospection UI.
  const kpiTiles = useMemo<KpiTile[]>(() => {
    const contrat = STATUS_DISPLAY.CONTRAT_SIGNE;
    const rdv = STATUS_DISPLAY.RENDEZ_VOUS_PRIS;
    const refus = STATUS_DISPLAY.REFUS;
    const absent = STATUS_DISPLAY.ABSENT_MATIN;
    return [
      {
        key: "contrats",
        label: "Contrats signés",
        value: counts.contrats,
        icon: contrat.icon,
        accent: contrat.accent,
        bg: colors.successSoft,
      },
      {
        key: "rdv",
        label: "RDV pris",
        value: counts.rdv,
        icon: rdv.icon,
        accent: rdv.accent,
        bg: colors.primarySoft,
      },
      {
        key: "refus",
        label: "Refus",
        value: counts.refus,
        icon: refus.icon,
        accent: refus.accent,
        bg: colors.dangerSoft,
      },
      {
        key: "absents",
        label: "Absents",
        value: counts.absent,
        icon: absent.icon,
        accent: absent.accent,
        bg: colors.warningSoft,
      },
    ];
  }, [counts]);

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
        label: getPorteLabel(porte, terms),
      }));
  }, [portes, terms]);

  // Presentation-only filter state. Defaults to "all"; reset whenever the
  // sheet target changes so a new building always opens unfiltered.
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  useEffect(() => {
    setSelectedFilter("all");
  }, [immeuble?.id]);

  // One chip per status that ACTUALLY occurs, ordered by STATUS_OPTIONS so the
  // palette reads consistently. Counts are totals — never affected by the filter.
  const filterOptions = useMemo<FilterOption[]>(() => {
    const tally = new Map<string, number>();
    porteRows.forEach((row) => {
      tally.set(row.statusKey, (tally.get(row.statusKey) ?? 0) + 1);
    });
    const ordered: FilterOption[] = [];
    STATUS_OPTIONS.forEach((status) => {
      const count = tally.get(status.value);
      if (count) ordered.push({ key: status.value, status, count });
    });
    // NON_VISITE isn't in STATUS_OPTIONS — append it last if present.
    const defaultCount = tally.get(DEFAULT_STATUS_OPTION.value);
    if (defaultCount) {
      ordered.push({
        key: DEFAULT_STATUS_OPTION.value,
        status: DEFAULT_STATUS_OPTION,
        count: defaultCount,
      });
    }
    return ordered;
  }, [porteRows]);

  const filteredRows = useMemo<PorteRow[]>(() => {
    if (selectedFilter === "all") return porteRows;
    return porteRows.filter((row) => row.statusKey === selectedFilter);
  }, [porteRows, selectedFilter]);

  // IMMEUBLE → group by floor (meaningful, sticky headers). PAVILLON/MAISON →
  // a single untitled section so the list reads flat. One render path either way.
  const sections = useMemo<PorteSection[]>(() => {
    if (filteredRows.length === 0) return [];
    if (!terms.showFloors || terms.isPavillon) {
      return [{ title: "", data: filteredRows }];
    }
    const byFloor = new Map<number, PorteRow[]>();
    filteredRows.forEach((row) => {
      const floor = row.porte.etage;
      const bucket = byFloor.get(floor);
      if (bucket) bucket.push(row);
      else byFloor.set(floor, [row]);
    });
    return [...byFloor.keys()]
      .sort((a, b) => a - b)
      .map((floor) => ({
        title: `${terms.unitLabel} ${floor}`,
        data: byFloor.get(floor) ?? [],
      }));
  }, [filteredRows, terms]);

  const handleNavigate = useCallback(
    (porteId: number) => {
      if (!immeuble) return;
      // On ne ferme pas la sheet ici : la perte de focus la masque et l'état est
      // restauré au retour (cf. screenFocused / keepSelectionRef).
      router.push(`/lieu/${immeuble.id}?porteId=${porteId}`);
    },
    [immeuble],
  );

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
      label={immeuble?.creatorName ? `Équipe · ${immeuble.creatorName}` : "Équipe"}
      style={[styles.ownChip, { backgroundColor: own.soft, borderColor: own.ring }]}
    />
  );

  const renderPorteItem = useCallback(
    ({ item }: { item: PorteRow }) => <PorteItem item={item} onPress={handleNavigate} />,
    [handleNavigate],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: PorteSection }) =>
      section.title ? (
        <View style={styles.floorHeader}>
          <Text style={styles.floorHeaderText}>{section.title}</Text>
          <Text style={styles.floorHeaderCount}>
            {section.data.length}
          </Text>
        </View>
      ) : null,
    [],
  );

  const keyExtractor = useCallback(
    (item: PorteRow) => String(item.porte.id),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      onDismiss={handleSheetDismiss}
      detached={isTablet}
      bottomInset={isTablet ? insets.bottom + 12 : 0}
      style={sheetContainerStyle}
      backgroundStyle={[styles.sheetBackground, isTablet && { borderRadius: 28 }]}
      handleIndicatorStyle={styles.handleIndicator}
    >
      {immeuble ? (
        <BottomSheetSectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderPorteItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={9}
          maxToRenderPerBatch={12}
          removeClippedSubviews
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* HEADER */}
              <View style={styles.header}>
                <View
                  style={[
                    styles.headerIcon,
                    { backgroundColor: own.soft, borderColor: own.ring },
                  ]}
                >
                  <HabitatIcon
                    type={immeuble.typeHabitat}
                    size={28}
                    color={own.accent}
                  />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.title} numberOfLines={1}>
                    {getHabitatLabel(immeuble.typeHabitat)}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {immeuble.adresse}
                  </Text>
                  <View style={styles.chipRow}>{ownershipChip}</View>
                </View>
              </View>

              {/* KPI SUMMARY */}
              {progress && portes.length > 0 ? (
                <Card variant="outlined" padding="md" style={styles.kpiCard}>
                  {/* Progress hero */}
                  <View style={styles.progressRow}>
                    <View style={styles.progressHead}>
                      <View style={styles.percentBlock}>
                        <Text
                          style={[styles.kpiPercent, { color: progress.color }]}
                        >
                          {progress.percent}
                        </Text>
                        <Text
                          style={[
                            styles.kpiPercentSign,
                            { color: progress.color },
                          ]}
                        >
                          %
                        </Text>
                      </View>
                      <View style={styles.progressMeta}>
                        <Text style={styles.progressLabel}>Prospecté</Text>
                        <Text style={styles.progressCount}>
                          {progress.prospectees}/{progress.total} prospectées
                        </Text>
                      </View>
                    </View>
                    <ProgressBar
                      value={progress.percent}
                      color={progress.color}
                      height={10}
                    />
                  </View>

                  {/* Status KPI grid */}
                  <View style={styles.kpiGrid}>
                    {kpiTiles.map((tile) => (
                      <View
                        key={tile.key}
                        style={[styles.kpiTile, { backgroundColor: tile.bg }]}
                      >
                        <View style={styles.kpiTileHead}>
                          <View
                            style={[
                              styles.kpiTileIcon,
                              { backgroundColor: tile.accent },
                            ]}
                          >
                            <Feather
                              name={tile.icon}
                              size={13}
                              color={colors.surface}
                            />
                          </View>
                          <Text
                            style={[styles.kpiTileValue, { color: tile.accent }]}
                          >
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

              {/* PORTES SECTION LABEL + STATUS FILTERS */}
              {porteRows.length > 0 ? (
                <View style={styles.listMeta}>
                  <View style={styles.listHeaderRow}>
                    <Text style={styles.sectionLabel}>
                      Portes · {porteRows.length}
                    </Text>
                    <Text style={styles.timeCaption}>
                      temps bientôt disponible
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                  >
                    <FilterChip
                      label="Tous"
                      count={porteRows.length}
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
            </View>
          }
          ListEmptyComponent={
            porteRows.length > 0 ? (
              <View style={styles.filterEmpty}>
                <Feather name="filter" size={18} color={colors.textSubtle} />
                <Text style={styles.filterEmptyText}>
                  Aucune porte pour ce filtre
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
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
          }
        />
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
  },
  // Wraps HEADER + KPI + filters inside ListHeaderComponent so they keep the
  // generous vertical rhythm the rest of the sheet was designed with, while
  // the porte rows below own their own tighter spacing.
  listHeader: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
  },
  ownChip: {
    alignSelf: "flex-start",
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

  // Porte list — section label + time caption row
  listMeta: {
    gap: spacing.sm,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extrabold,
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

  // Status filter chips
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

  // Floor section header (IMMEUBLE only) — sticky, subtle
  floorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  floorHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extrabold,
    color: colors.textStrong,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  floorHeaderCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extrabold,
    color: colors.textSubtle,
    fontVariant: ["tabular-nums"],
  },

  // Porte row — leading icon chip + label + status tag + meta + chevron
  porteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  porteRowPressed: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderStrong,
  },
  porteIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  porteTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  porteLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  porteMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs + 1,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: 140,
  },
  metaText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  porteTime: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
    fontVariant: ["tabular-nums"],
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
    marginTop: spacing.md,
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
