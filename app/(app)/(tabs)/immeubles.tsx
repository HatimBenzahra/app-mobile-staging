import AddImmeubleSheet from "@/components/immeubles/AddImmeubleSheet";
import { Card, Chip, ErrorState, PressableCard, StatTile } from "@/components/ui";
import { useCreateImmeuble } from "@/hooks/api/use-create-immeuble";
import { useMapFocus } from "@/hooks/use-map-focus";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { useQuartiers } from "@/hooks/api/use-quartiers";
import { colors, progressColors } from "@/constants/theme";
import { authService } from "@/services/auth";
import { effectiveTypeHabitat, getLieuTerms } from "@/components/immeubles/lieu-terms";
import { getImmeubleProgress } from "@/components/immeubles/lieu-progress";
import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import type { HabitatIconName } from "@/components/immeubles/habitat-icon";
import type { Immeuble, Quartier, TypeHabitat } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ImmeublesScreenProps = {
  isActive?: boolean;
  onSwipeLockChange?: (locked: boolean) => void;
  onHamburgerVisibilityChange?: (visible: boolean) => void;
  onHeaderVisibilityChange?: (visible: boolean) => void;
};

type LieuxItem =
  | { kind: "quartier"; quartier: Quartier }
  | { kind: "lieu"; immeuble: Immeuble };
type ListRow = { _type: "controls" } | Immeuble[] | Quartier[] | LieuxItem[];
type TypeFilterKey = "all" | TypeHabitat | "quartiers";

/**
 * Recency score (ms) for sorting "most recent first". Uses the max of
 * createdAt/updatedAt so a recently-modified old item still ranks high.
 * Falls back to the autoincrement id when neither timestamp is parseable.
 */
function recencyMs(item: {
  createdAt?: string | null;
  updatedAt?: string | null;
  id: number;
}): number {
  const c = item.createdAt ? Date.parse(item.createdAt) : NaN;
  const u = item.updatedAt ? Date.parse(item.updatedAt) : NaN;
  const t = Math.max(Number.isNaN(c) ? -Infinity : c, Number.isNaN(u) ? -Infinity : u);
  return Number.isFinite(t) ? t : item.id;
}

const CONTROLS_ROW_HEIGHT = 214;
const DATA_ROW_HEIGHT = 208;

const TYPE_CHIPS: {
  key: TypeFilterKey;
  label: string;
  /** Feather icon for the "Tous" chip; undefined for habitat-type chips (uses MCI via mciIcon). */
  icon?: keyof typeof Feather.glyphMap;
  mciIcon?: HabitatIconName;
  color: string;
}[] = [
  { key: "all", label: "Tous", icon: "map-pin", color: colors.primary },
  { key: "MAISON", label: "Maisons", mciIcon: "home", color: colors.success },
  { key: "PAVILLON", label: "Pavillons", mciIcon: "home-group", color: "#F97316" },
  { key: "IMMEUBLE", label: "Immeubles", mciIcon: "office-building", color: colors.primary },
  { key: "quartiers", label: "Quartiers", mciIcon: "map-marker-radius", color: "#7C3AED" },
];

const FILTER_CHIPS: {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}[] = [
  { key: "all", label: "Tous", icon: "layers", color: colors.primary },
  { key: "incomplete", label: "En cours", icon: "activity", color: colors.primary },
  { key: "low", label: "0-35%", icon: "trending-down", color: progressColors.low },
  { key: "mid", label: "35-70%", icon: "bar-chart-2", color: progressColors.mid },
  { key: "high", label: "70-99%", icon: "trending-up", color: progressColors.high },
  { key: "complete", label: "100%", icon: "check", color: progressColors.complete },
];

function getLieuMeta(immeuble: Immeuble): {
  label: string;
  mciIcon: HabitatIconName;
  color: string;
  detail: string;
} {
  const effType = effectiveTypeHabitat(immeuble);
  const terms = getLieuTerms(effType);

  if (effType === "MAISON") {
    const foyers = immeuble.nbMaisonsPrevu ?? 1;
    return {
      label: "Maison",
      mciIcon: "home",
      color: colors.success,
      detail: `${foyers} ${foyers > 1 ? terms.unitLabelPlural : terms.unitLabel.toLowerCase()}`,
    };
  }

  if (effType === "PAVILLON") {
    const maisons = immeuble.nbMaisonsPrevu ?? immeuble.nbEtages ?? 1;
    return {
      label: "Pavillon",
      mciIcon: "home-group",
      color: "#F97316",
      detail: `${maisons} ${terms.unitLabelPlural}`,
    };
  }

  return {
    label: "Immeuble",
    mciIcon: "office-building",
    color: colors.primary,
    detail: `${immeuble.nbEtages} ${terms.unitLabelPlural} · ${immeuble.nbPortesParEtage ?? 1} portes`,
  };
}

export default function ImmeublesScreen({
  isActive = true,
}: ImmeublesScreenProps) {
  const router = useRouter();
  const { focusOnMap } = useMapFocus();
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const isLandscape = width > screenHeight;
  const isTablet = width >= 768;
  const columnsPerRow = isLandscape ? 3 : 2;
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const searchInputRef = useRef<TextInput | null>(null);
  const filterChipAnimsRef = useRef(new Map<string, Animated.Value>()).current;
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [progressFilter, setProgressFilter] = useState("incomplete");
  const [typeFilter, setTypeFilter] = useState<TypeFilterKey>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const cardAnimationsRef = useRef<Map<number, Animated.Value>>(new Map());
  const hasAnimatedOnce = useRef(false);
  const ANIMATED_CARD_LIMIT = 12;
  const listOpacity = useRef(new Animated.Value(1)).current;
  const listTranslate = useRef(new Animated.Value(0)).current;

  const getFilterChipAnim = (key: string) => {
    const existing = filterChipAnimsRef.get(key);
    if (existing) return existing;
    const next = new Animated.Value(0);
    filterChipAnimsRef.set(key, next);
    return next;
  };

  useEffect(() => {
    if (!showFilters) return;
    FILTER_CHIPS.forEach((chip) => getFilterChipAnim(chip.key).setValue(1));
  }, [showFilters]);

  const handleFilterToggle = () => {
    if (showFilters) {
      const animations = FILTER_CHIPS.map((chip, index) =>
        Animated.timing(getFilterChipAnim(chip.key), {
          toValue: 0,
          duration: 160,
          delay: index * 20,
          useNativeDriver: true,
        }),
      );
      Animated.stagger(20, animations).start(() => {
        setShowFilters(false);
        setFiltersVisible(false);
      });
      return;
    }

    setShowFilters(true);
    setFiltersVisible(true);
    FILTER_CHIPS.forEach((chip) => getFilterChipAnim(chip.key).setValue(0));
    const animations = FILTER_CHIPS.map((chip, index) =>
      Animated.spring(getFilterChipAnim(chip.key), {
        toValue: 1,
        friction: 6,
        tension: 90,
        delay: index * 30,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(30, animations).start();
  };

  const {
    data: profile,
    loading,
    error,
    refetch,
  } = useWorkspaceProfile(userId, role);
  const { data: quartiersData } = useQuartiers();
  const {
    create,
    cancel: cancelCreate,
    loading: creating,
  } = useCreateImmeuble();
  const isProfileReady = userId !== null && role !== null;
  const isInitialLoading = !isProfileReady || (loading && !profile);

  useEffect(() => {
    let isMounted = true;
    const loadProfileMeta = async () => {
      const [nextUserId, nextRole] = await Promise.all([
        authService.getUserId(),
        authService.getUserRole(),
      ]);
      if (!isMounted) return;
      setUserId(nextUserId);
      setRole(nextRole);
    };
    void loadProfileMeta();
    return () => {
      isMounted = false;
    };
  }, []);

  const immeubles = useMemo(
    () => (profile?.immeubles || []) as Immeuble[],
    [profile],
  );

  // Les immeubles enfants d'un quartier sont aussi présents dans
  // `profile.immeubles`. On les dédoublonne pour qu'ils n'apparaissent que sous
  // leur quartier (catégorie "Quartiers") et jamais comme cartes autonomes.
  const quartierMemberIds = useMemo(() => {
    const s = new Set<number>();
    for (const q of quartiersData ?? [])
      for (const imm of q.immeubles ?? []) s.add(imm.id);
    return s;
  }, [quartiersData]);

  const filteredImmeubles = useMemo(() => {
    if (typeFilter === "quartiers") return [];
    const standalone = immeubles.filter((imm) => !quartierMemberIds.has(imm.id));
    const byType =
      typeFilter === "all"
        ? standalone
        : standalone.filter((imm) => imm.typeHabitat === typeFilter);
    if (!query.trim()) return byType;
    const lower = query.toLowerCase();
    return byType.filter((imm) => imm.adresse.toLowerCase().includes(lower));
  }, [immeubles, query, typeFilter, quartierMemberIds]);

  const filteredQuartiers = useMemo((): Quartier[] => {
    if (typeFilter !== "quartiers") return [];
    const all = quartiersData ?? [];
    const matched = !query.trim()
      ? all
      : all.filter((q) =>
          (q.nom ?? "").toLowerCase().includes(query.toLowerCase()),
        );
    return [...matched].sort((a, b) => recencyMs(b) - recencyMs(a));
  }, [quartiersData, query, typeFilter]);

  const immeublesEnCours = useMemo(() => {
    const filtered = filteredImmeubles.filter((imm) => {
      const { percent } = getImmeubleProgress(imm);
      if (progressFilter === "all") return true;
      if (progressFilter === "incomplete") return percent < 100;
      if (progressFilter === "low") return percent < 35;
      if (progressFilter === "mid") return percent >= 35 && percent < 70;
      if (progressFilter === "high") return percent >= 70 && percent < 100;
      if (progressFilter === "complete") return percent === 100;
      return true;
    });
    return [...filtered].sort((a, b) => recencyMs(b) - recencyMs(a));
  }, [filteredImmeubles, progressFilter]);

  const getCardAnimation = (id: number) => {
    const existing = cardAnimationsRef.current.get(id);
    if (existing) return existing;
    const next = new Animated.Value(0);
    cardAnimationsRef.current.set(id, next);
    return next;
  };

  useEffect(() => {
    if (!isActive) return;
    if (immeublesEnCours.length === 0) return;
    if (hasAnimatedOnce.current) {
      immeublesEnCours.forEach((imm) => {
        getCardAnimation(imm.id).setValue(1);
      });
      return;
    }
    hasAnimatedOnce.current = true;
    const animatedItems = immeublesEnCours.slice(0, ANIMATED_CARD_LIMIT);
    const staticItems = immeublesEnCours.slice(ANIMATED_CARD_LIMIT);
    animatedItems.forEach((imm) => {
      getCardAnimation(imm.id).setValue(0);
    });
    staticItems.forEach((imm) => {
      getCardAnimation(imm.id).setValue(1);
    });
    const animations = animatedItems.map((imm, index) =>
      Animated.spring(getCardAnimation(imm.id), {
        toValue: 1,
        friction: 6,
        tension: 90,
        delay: index * 30,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(30, animations).start();
  }, [ANIMATED_CARD_LIMIT, immeublesEnCours, isActive]);

  const immeubleRows = useMemo(() => {
    const rows: Immeuble[][] = [];
    for (let i = 0; i < immeublesEnCours.length; i += columnsPerRow) {
      rows.push(immeublesEnCours.slice(i, i + columnsPerRow));
    }
    return rows;
  }, [immeublesEnCours, columnsPerRow]);

  const quartierRows = useMemo((): Quartier[][] => {
    const rows: Quartier[][] = [];
    for (let i = 0; i < filteredQuartiers.length; i += columnsPerRow) {
      rows.push(filteredQuartiers.slice(i, i + columnsPerRow));
    }
    return rows;
  }, [filteredQuartiers, columnsPerRow]);

  // "Tous" — quartiers (search-filtered) + standalone buildings, mixed and
  // sorted together by recency (most recent first). Buildings come from
  // immeublesEnCours so they stay progress-filtered and dedup-excluded.
  const mixedRows = useMemo((): LieuxItem[][] => {
    if (typeFilter !== "all") return [];
    const matchedQuartiers = !query.trim()
      ? (quartiersData ?? [])
      : (quartiersData ?? []).filter((q) =>
          (q.nom ?? "").toLowerCase().includes(query.toLowerCase()),
        );
    const items: LieuxItem[] = [
      ...matchedQuartiers.map((quartier): LieuxItem => ({ kind: "quartier", quartier })),
      ...immeublesEnCours.map((immeuble): LieuxItem => ({ kind: "lieu", immeuble })),
    ];
    items.sort((a, b) => {
      const ra = a.kind === "quartier" ? recencyMs(a.quartier) : recencyMs(a.immeuble);
      const rb = b.kind === "quartier" ? recencyMs(b.quartier) : recencyMs(b.immeuble);
      return rb - ra;
    });
    const rows: LieuxItem[][] = [];
    for (let i = 0; i < items.length; i += columnsPerRow) {
      rows.push(items.slice(i, i + columnsPerRow));
    }
    return rows;
  }, [typeFilter, query, quartiersData, immeublesEnCours, columnsPerRow]);

  const listData = useMemo<ListRow[]>(() => {
    if (typeFilter === "quartiers") {
      return [{ _type: "controls" }, ...quartierRows];
    }
    if (typeFilter === "all") {
      return [{ _type: "controls" }, ...mixedRows];
    }
    return [{ _type: "controls" }, ...immeubleRows];
  }, [typeFilter, immeubleRows, quartierRows, mixedRows]);

  const getRowKey = useCallback((row: ListRow, index: number) => {
    if (!Array.isArray(row)) {
      return `controls-${index}`;
    }
    return row
      .map((item) =>
        "kind" in item
          ? item.kind === "quartier"
            ? `q${item.quartier.id}`
            : `l${item.immeuble.id}`
          : String(item.id),
      )
      .join("-");
  }, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<ListRow> | null | undefined, index: number) => {
      if (index === 0) {
        return { length: CONTROLS_ROW_HEIGHT, offset: 0, index };
      }
      return {
        length: DATA_ROW_HEIGHT,
        offset: CONTROLS_ROW_HEIGHT + (index - 1) * DATA_ROW_HEIGHT,
        index,
      };
    },
    [],
  );

  const progressByImmeubleId = useMemo(() => {
    const entries: Record<
      number,
      {
        total: number;
        prospectees: number;
        progressPercent: number;
        progressColor: string;
      }
    > = {};

    for (const immeuble of immeublesEnCours) {
      const { total, prospectees, percent, color } = getImmeubleProgress(immeuble);
      entries[immeuble.id] = {
        total,
        prospectees,
        progressPercent: percent,
        progressColor: color,
      };
    }

    return entries;
  }, [immeublesEnCours]);

  const quartierProgressById = useMemo(() => {
    const entries: Record<number, { total: number; prospectees: number; percent: number; color: string }> = {};
    for (const q of (quartiersData ?? [])) {
      let total = 0;
      let prospectees = 0;
      for (const imm of (q.immeubles ?? [])) {
        const p = getImmeubleProgress(imm);
        total += p.total;
        prospectees += p.prospectees;
      }
      const percent = total === 0 ? 0 : Math.round((prospectees / total) * 100);
      const color =
        percent < 35
          ? progressColors.low
          : percent < 70
            ? progressColors.mid
            : percent < 100
              ? progressColors.high
              : progressColors.complete;
      entries[q.id] = { total, prospectees, percent, color };
    }
    return entries;
  }, [quartiersData]);

  const handleOpenImmeuble = useCallback(
    (immeubleId: number) => {
      router.push(`/lieu/${immeubleId}`);
    },
    [router],
  );

  const renderQuartierCard = useCallback(
    (quartier: Quartier) => {
      const qp = quartierProgressById[quartier.id] ?? {
        total: 0,
        prospectees: 0,
        percent: 0,
        color: progressColors.low,
      };
      const nbLieux = (quartier.immeubles ?? []).length;
      return (
        <View key={`q${quartier.id}`} style={styles.cardWrap}>
          <PressableCard
            variant="outlined"
            padding="md"
            style={{ flex: 1 }}
            onPress={() => router.push(`/quartier/${quartier.id}`)}
          >
            {/* Header: icône + chip type — identique aux cartes bâtiment */}
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: "#7C3AED1A" }]}>
                <HabitatIcon type="quartiers" size={18} color="#7C3AED" />
              </View>
              <Text style={[styles.cardChip, { color: "#7C3AED" }]}>
                Quartier
              </Text>
            </View>
            <View style={styles.cardContent}>
              <Text
                style={[
                  styles.cardTitle,
                  !isTablet && styles.cardTitleCompact,
                ]}
                numberOfLines={2}
              >
                {quartier.nom || `Quartier #${quartier.id}`}
              </Text>
              <View style={styles.cardMetaRow}>
                <Feather name="map-pin" size={11} color={colors.textStrong} />
                <Text style={styles.cardMeta}>
                  {nbLieux} lieu{nbLieux !== 1 ? "x" : ""}
                </Text>
                <Text style={styles.cardMeta}>•</Text>
                <Text style={styles.cardMeta}>
                  {qp.prospectees}/{qp.total} visités
                </Text>
              </View>
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${qp.percent}%`, backgroundColor: qp.color },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: qp.color }]}>
                  {qp.percent}%
                </Text>
              </View>
            </View>
          </PressableCard>
        </View>
      );
    },
    [quartierProgressById, isTablet, router],
  );

  const renderLieuCard = useCallback(
    (immeuble: Immeuble) => {
      const progress = progressByImmeubleId[immeuble.id] ?? {
        total: 0,
        prospectees: 0,
        progressPercent: 0,
        progressColor: progressColors.high,
      };
      const meta = getLieuMeta(immeuble);
      const anim = getCardAnimation(immeuble.id);
      return (
        <Animated.View
          key={`l${immeuble.id}`}
          style={[
            styles.cardWrap,
            {
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
                {
                  translateX: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <PressableCard
            variant="outlined"
            padding="md"
            style={{ flex: 1 }}
            onPress={() => handleOpenImmeuble(immeuble.id)}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: `${meta.color}1A` }]}>
                <HabitatIcon type={effectiveTypeHabitat(immeuble)} size={18} color={meta.color} />
              </View>
              <View style={styles.cardHeaderRight}>
                <Text style={[styles.cardChip, { color: meta.color }]}>
                  {meta.label}
                </Text>
                {immeuble.latitude != null && immeuble.longitude != null ? (
                  <Pressable
                    style={styles.mapButton}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Voir sur la carte"
                    onPress={(event) => {
                      // Empêche l'ouverture du détail (tap principal de la carte).
                      event.stopPropagation();
                      focusOnMap(immeuble);
                    }}
                  >
                    <Feather name="map-pin" size={15} color={colors.primary} />
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View style={styles.cardContent}>
              <Text
                style={[
                  styles.cardTitle,
                  !isTablet && styles.cardTitleCompact,
                ]}
                numberOfLines={2}
              >
                {immeuble.adresse}
              </Text>
              <View style={styles.cardMetaRow}>
                <Feather name="grid" size={11} color={colors.textStrong} />
                <Text style={styles.cardMeta}>{meta.detail}</Text>
                <Text style={styles.cardMeta}>•</Text>
                <Text style={styles.cardMeta}>
                  {progress.prospectees}/{progress.total} visités
                </Text>
              </View>
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress.progressPercent}%`,
                        backgroundColor: progress.progressColor,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.progressText,
                    { color: progress.progressColor },
                  ]}
                >
                  {progress.progressPercent}%
                </Text>
              </View>
            </View>
          </PressableCard>
        </Animated.View>
      );
    },
    [progressByImmeubleId, isTablet, handleOpenImmeuble, focusOnMap],
  );

  const totalMaisonsLike = useMemo(() => {
    return immeubles.filter(
      (imm) =>
        !quartierMemberIds.has(imm.id) &&
        (imm.typeHabitat === "MAISON" || imm.typeHabitat === "PAVILLON"),
    ).length;
  }, [immeubles, quartierMemberIds]);

  const totalQuartiers = useMemo(() => (quartiersData ?? []).length, [quartiersData]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonContent}>
          <View style={styles.skeletonSummaryRow}>
            <View style={styles.skeletonSummaryCard} />
            <View style={styles.skeletonSummaryCard} />
          </View>
          <View style={styles.skeletonControls}>
            <View style={styles.skeletonFiltersRow}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <View key={idx} style={styles.skeletonChip} />
              ))}
            </View>
            <View style={styles.skeletonSearch} />
          </View>
          {Array.from({ length: 3 }).map((_, rowIdx) => (
            <View key={rowIdx} style={styles.skeletonCardRow}>
              <View style={styles.skeletonCard} />
              <View style={styles.skeletonCard} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          flex: 1,
          opacity: listOpacity,
          transform: [{ translateY: listTranslate }],
        }}
      >
        <FlatList<ListRow>
          data={listData}
          windowSize={7}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={24}
          removeClippedSubviews
          keyExtractor={getRowKey}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.content}
          stickyHeaderIndices={[1]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <View style={styles.summaryRow}>
                {typeFilter === "quartiers" ? (
                  <StatTile
                    icon="users"
                    label="Quartiers"
                    value={totalQuartiers}
                    emphasis="primary"
                  />
                ) : typeFilter === "all" ? (
                  <>
                    <StatTile
                      icon="layers"
                      label="Lieux a finir"
                      value={immeublesEnCours.length}
                      emphasis="primary"
                    />
                    <StatTile
                      icon="users"
                      label="Quartiers"
                      value={totalQuartiers}
                    />
                  </>
                ) : (
                  <>
                    <StatTile
                      icon="layers"
                      label="Lieux a finir"
                      value={immeublesEnCours.length}
                      emphasis="primary"
                    />
                    <StatTile
                      icon="home"
                      label="Maisons/Pavillons"
                      value={totalMaisonsLike}
                    />
                  </>
                )}
              </View>

              {loading && !profile && (
                <Text style={styles.helper}>Chargement...</Text>
              )}
              {error && !profile && (
                <View style={{ paddingVertical: 40 }}>
                  <ErrorState
                    title="Impossible de charger les données"
                    message={error}
                    onRetry={() => { void refetch(); }}
                  />
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !loading && !error ? (
              <Card variant="elevated" padding="md" style={{ alignItems: "center", gap: 8 }}>
                <Feather name="map-pin" size={32} color={colors.textSubtle} />
                <Text style={styles.emptyText}>Aucun lieu trouve</Text>
              </Card>
            ) : null
          }
          renderItem={({ item: row }) =>
            !Array.isArray(row) ? (
              <View style={styles.controlsSticky}>
                {!isSearchFocused && filtersVisible && (
                  <View style={styles.filterStack}>
                    {/* Type chips — habitat chips use MCI icon rendered inline before the Chip label */}
                    <View style={styles.filterRow}>
                      {TYPE_CHIPS.map((chip) => (
                        <Chip
                          key={chip.key}
                          label={chip.label}
                          icon={chip.icon}
                          selected={typeFilter === chip.key}
                          accent={chip.color}
                          onPress={() => setTypeFilter(chip.key)}
                        />
                      ))}
                    </View>
                    {/* Progress chips — hidden when viewing quartiers */}
                    {typeFilter !== "quartiers" && (
                      <View style={styles.filterRow}>
                        {FILTER_CHIPS.map((chip) => {
                          const selected = progressFilter === chip.key;
                          const anim = getFilterChipAnim(chip.key);
                          return (
                            <Animated.View
                              key={chip.key}
                              style={{
                                opacity: anim,
                                transform: [
                                  {
                                    translateY: anim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [16, 0],
                                    }),
                                  },
                                  {
                                    translateX: anim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [12, 0],
                                    }),
                                  },
                                  {
                                    scale: anim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [0.9, 1],
                                    }),
                                  },
                                ],
                              }}
                            >
                              <Chip
                                label={chip.label}
                                icon={chip.icon}
                                selected={selected}
                                accent={chip.color}
                                onPress={() => setProgressFilter(chip.key)}
                              />
                            </Animated.View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
                <View style={styles.searchWrapRow}>
                  <View
                    style={[
                      styles.searchBar,
                      styles.searchBarShadow,
                      isSearchFocused && styles.searchBarFocused,
                    ]}
                  >
                    <View style={styles.searchIconWrap}>
                      <Feather name="search" size={18} color={colors.primary} />
                    </View>
                    <TextInput
                      ref={searchInputRef}
                      placeholder="Rechercher un lieu, adresse, ville?"
                      placeholderTextColor={colors.textSubtle}
                      style={styles.searchInput}
                      value={query}
                      onChangeText={setQuery}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                    />
                    {query.length > 0 && (
                      <Pressable
                        style={styles.clearButton}
                        onPress={() => {
                          setQuery("");
                          searchInputRef.current?.focus();
                        }}
                      >
                        <Feather name="x" size={14} color={colors.textStrong} />
                      </Pressable>
                    )}
                    <Pressable
                      style={[
                        styles.filterButton,
                        showFilters && styles.filterButtonActive,
                      ]}
                      onPress={handleFilterToggle}
                    >
                      <Feather
                        name="sliders"
                        size={16}
                        color={showFilters ? colors.textOnPrimary : colors.primary}
                      />
                    </Pressable>
                  </View>
                  {isSearchFocused && (
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => {
                        setQuery("");
                        setIsSearchFocused(false);
                        searchInputRef.current?.blur();
                      }}
                    >
                      <Text style={styles.cancelText}>Annuler</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : typeFilter === "quartiers" ? (
              /* ── Quartier cards — même template que les cartes bâtiment ── */
              <View style={styles.row}>
                {(row as Quartier[]).map((quartier) => renderQuartierCard(quartier))}
                {row.length < columnsPerRow && Array.from({ length: columnsPerRow - row.length }).map((_, i) => (
                  <View key={`placeholder-${i}`} style={styles.cardPlaceholder} />
                ))}
              </View>
            ) : typeFilter === "all" ? (
              /* ── "Tous" — quartiers + bâtiments mélangés, triés par récence ── */
              <View style={styles.row}>
                {(row as LieuxItem[]).map((item) =>
                  item.kind === "quartier"
                    ? renderQuartierCard(item.quartier)
                    : renderLieuCard(item.immeuble),
                )}
                {row.length < columnsPerRow && Array.from({ length: columnsPerRow - row.length }).map((_, i) => (
                  <View key={`placeholder-${i}`} style={styles.cardPlaceholder} />
                ))}
              </View>
            ) : (
              /* ── Lieu (bâtiment) cards ── */
              <View style={styles.row}>
                {(row as Immeuble[]).map((immeuble) => renderLieuCard(immeuble))}
                {row.length < columnsPerRow && Array.from({ length: columnsPerRow - row.length }).map((_, i) => (
                  <View key={`placeholder-${i}`} style={styles.cardPlaceholder} />
                ))}
              </View>
            )
          }
        />

        <View style={[styles.fabStack, { bottom: insets.bottom + 72 }]}>
          <Pressable
            style={styles.fab}
            onPress={() => setIsAddOpen(true)}
          >
            <Feather name="plus" size={20} color={colors.textOnPrimary} />
          </Pressable>
        </View>

        <AddImmeubleSheet
          open={isAddOpen}
          onClose={() => {
            cancelCreate();
            setIsAddOpen(false);
          }}
          loading={creating}
          ownerId={userId}
          ownerRole={role}
          onSave={async (payload) => {
            const result = await create(payload);
            if (result) {
              console.log("[Immeuble] added", result.id);
              await refetch();
              setQuery("");
            } else {
              console.log("[Immeuble] add failed");
            }
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingBottom: 24,
  },
  headerBlock: {
    gap: 14,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  helper: {
    fontSize: 13,
    color: colors.textStrong,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  skeletonContent: {
    padding: 18,
    paddingBottom: 24,
    gap: 14,
  },
  skeletonSummaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  skeletonSummaryCard: {
    flex: 1,
    height: 84,
    borderRadius: 18,
    backgroundColor: colors.border,
  },
  skeletonControls: {
    gap: 12,
    marginBottom: 4,
  },
  skeletonFiltersRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  skeletonChip: {
    height: 34,
    flexBasis: "23%",
    flexGrow: 1,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  skeletonSearch: {
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.border,
  },
  skeletonCardRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  skeletonCard: {
    flex: 1,
    height: 160,
    borderRadius: 22,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    justifyContent: "space-between",
  },
  cardWrap: {
    flex: 1,
  },
  cardPlaceholder: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    fontSize: 11,
    color: colors.textStrong,
    fontWeight: "600",
  },
  mapButton: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  cardContent: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  cardTitleCompact: {
    fontSize: 15,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  cardMeta: {
    fontSize: 14,
    color: colors.textStrong,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  fabStack: {
    position: "absolute",
    right: 20,
    gap: 12,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.text,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  controlsSticky: {
    backgroundColor: colors.background,
    paddingBottom: 12,
    gap: 12,
  },
  filterStack: {
    gap: 8,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  searchWrapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchBarShadow: {
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  searchBarFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 2,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },
});
