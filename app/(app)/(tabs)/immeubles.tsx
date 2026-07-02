import AddImmeubleSheet from "@/components/immeubles/AddImmeubleSheet";
import { Card, Chip, ErrorState, PressableCard } from "@/components/ui";
import { useCreateImmeuble } from "@/hooks/api/use-create-immeuble";
import { useMapFocus } from "@/hooks/use-map-focus";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { useQuartiers } from "@/hooks/api/use-quartiers";
import { colors, habitat, progressColors } from "@/constants/theme";
import { authService } from "@/services/auth";
import { effectiveTypeHabitat, getLieuTerms } from "@/components/immeubles/lieu-terms";
import { getImmeubleProgress } from "@/components/immeubles/lieu-progress";
import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import type { HabitatIconName } from "@/components/immeubles/habitat-icon";
import type { Immeuble, Quartier, TypeHabitat } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
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

const TYPE_CHIPS: {
  key: TypeFilterKey;
  label: string;
  /** Feather icon for the "Tous" chip; undefined for habitat-type chips (uses MCI via mciIcon). */
  icon?: keyof typeof Feather.glyphMap;
  mciIcon?: HabitatIconName;
  color: string;
}[] = [
  { key: "all", label: "Tous", icon: "map-pin", color: colors.primary },
  { key: "MAISON", label: "Maisons", mciIcon: "home", color: habitat.maison },
  { key: "PAVILLON", label: "Pavillons", mciIcon: "home-group", color: habitat.pavillon },
  { key: "IMMEUBLE", label: "Immeubles", mciIcon: "office-building", color: habitat.immeuble },
  { key: "quartiers", label: "Quartiers", mciIcon: "map-marker-radius", color: habitat.quartier },
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
      color: habitat.maison,
      detail: `${foyers} ${foyers > 1 ? terms.unitLabelPlural : terms.unitLabel.toLowerCase()}`,
    };
  }

  if (effType === "PAVILLON") {
    const maisons = immeuble.nbMaisonsPrevu ?? immeuble.nbEtages ?? 1;
    return {
      label: "Pavillon",
      mciIcon: "home-group",
      color: habitat.pavillon,
      detail: `${maisons} ${terms.unitLabelPlural}`,
    };
  }

  const portes = (immeuble.nbEtages ?? 1) * (immeuble.nbPortesParEtage ?? 1);
  return {
    label: "Immeuble",
    mciIcon: "office-building",
    color: habitat.immeuble,
    detail: `${portes} portes`,
  };
}

// Signal actionnable d'une ligne : la SEULE raison d'y retourner (sinon rien).
// Priorité : terminé > RDV à honorer > absents à repasser.
type LieuSignal = { label: string; bg: string; fg: string };

const DONE_SIGNAL: LieuSignal = {
  label: "terminé",
  bg: colors.successSoft,
  fg: colors.successText,
};

function getLieuSignal(p: { progressPercent: number; rdv: number; absent: number }): LieuSignal | null {
  if (p.progressPercent >= 100) return DONE_SIGNAL;
  if (p.rdv > 0) return { label: p.rdv > 1 ? `${p.rdv} RDV` : "1 RDV", bg: colors.primarySoft, fg: colors.primary };
  if (p.absent > 0) return { label: "à repasser", bg: colors.warningSoft, fg: colors.warningText };
  return null;
}

const SignalPill = memo(function SignalPill({ signal }: { signal: LieuSignal }) {
  return (
    <View style={[styles.signalPill, { backgroundColor: signal.bg }]}>
      <Text style={[styles.signalText, { color: signal.fg }]}>{signal.label}</Text>
    </View>
  );
});

type QuartierProgress = {
  total: number;
  prospectees: number;
  percent: number;
  color: string;
};

type LieuProgress = {
  total: number;
  prospectees: number;
  progressPercent: number;
  progressColor: string;
  reste: number;
  rdv: number;
  absent: number;
};

type QuartierCardProps = {
  quartier: Quartier;
  qp: QuartierProgress;
  onOpenQuartier: (quartierId: number) => void;
};

const QuartierCard = memo(function QuartierCard({
  quartier,
  qp,
  onOpenQuartier,
}: QuartierCardProps) {
  const nbLieux = (quartier.immeubles ?? []).length;
  const done = qp.percent >= 100;
  return (
    <PressableCard
      variant="outlined"
      padding="md"
      style={styles.rowCard}
      onPress={() => onOpenQuartier(quartier.id)}
    >
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: `${habitat.quartier}1A` }]}>
          <HabitatIcon type="quartiers" size={19} color={habitat.quartier} />
        </View>
        <Text style={styles.rowAddr} numberOfLines={1}>
          {quartier.nom || `Quartier #${quartier.id}`}
        </Text>
        <Text style={[styles.rowPct, { color: qp.color }]}>{qp.percent}%</Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowMetaText} numberOfLines={1}>
          Quartier · {nbLieux} lieu{nbLieux !== 1 ? "x" : ""} · {qp.prospectees}/{qp.total} visités
        </Text>
        {done ? <SignalPill signal={DONE_SIGNAL} /> : null}
      </View>
      <View style={styles.rowBar}>
        <View style={[styles.rowBarFill, { width: `${qp.percent}%`, backgroundColor: qp.color }]} />
      </View>
    </PressableCard>
  );
});

type LieuCardProps = {
  immeuble: Immeuble;
  progress: LieuProgress;
  onOpen: (immeubleId: number) => void;
  onFocusMap: (immeuble: Immeuble) => void;
};

const LieuCard = memo(function LieuCard({
  immeuble,
  progress,
  onOpen,
  onFocusMap,
}: LieuCardProps) {
  const meta = getLieuMeta(immeuble);
  const hasGeo = immeuble.latitude != null && immeuble.longitude != null;
  const signal = getLieuSignal(progress);
  return (
    <PressableCard
      variant="outlined"
      padding="md"
      style={styles.rowCard}
      onPress={() => onOpen(immeuble.id)}
    >
      <View style={styles.rowTop}>
        <View style={[styles.rowIcon, { backgroundColor: `${meta.color}1A` }]}>
          <HabitatIcon type={effectiveTypeHabitat(immeuble)} size={19} color={meta.color} />
        </View>
        <Text style={styles.rowAddr} numberOfLines={1}>
          {immeuble.adresse}
        </Text>
        <Text style={[styles.rowPct, { color: progress.progressColor }]}>
          {progress.progressPercent}%
        </Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowMetaText} numberOfLines={1}>
          {meta.label} · {meta.detail}
          {progress.reste > 0 ? ` · ${progress.reste} à faire` : ""}
        </Text>
        {signal ? <SignalPill signal={signal} /> : null}
        {hasGeo ? (
          <Pressable
            style={styles.rowMapButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voir sur la carte"
            onPress={(event) => {
              // Empêche l'ouverture du détail (tap principal de la ligne).
              event.stopPropagation();
              onFocusMap(immeuble);
            }}
          >
            <Feather name="map-pin" size={13} color={colors.primary} />
            <Text style={styles.rowMapText}>carte</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.rowBar}>
        <View
          style={[
            styles.rowBarFill,
            { width: `${progress.progressPercent}%`, backgroundColor: progress.progressColor },
          ]}
        />
      </View>
    </PressableCard>
  );
});

export default function ImmeublesScreen(_props: ImmeublesScreenProps) {
  const router = useRouter();
  const { focusOnMap } = useMapFocus();
  const insets = useSafeAreaInsets();
  // Liste épurée : une ligne pleine largeur par lieu (plus de grille).
  const columnsPerRow = 1;
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Le champ (TextInput/clear) reste piloté par `query` pour rester réactif ;
  // seul le filtrage lourd est différé via `deferredQuery` (React 19).
  const deferredQuery = useDeferredValue(query);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const searchInputRef = useRef<TextInput | null>(null);
  const filterChipAnimsRef = useRef(new Map<string, Animated.Value>()).current;
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [progressFilter, setProgressFilter] = useState("incomplete");
  const [typeFilter, setTypeFilter] = useState<TypeFilterKey>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);

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
    if (!deferredQuery.trim()) return byType;
    const lower = deferredQuery.toLowerCase();
    return byType.filter((imm) => imm.adresse.toLowerCase().includes(lower));
  }, [immeubles, deferredQuery, typeFilter, quartierMemberIds]);

  const filteredQuartiers = useMemo((): Quartier[] => {
    if (typeFilter !== "quartiers") return [];
    const all = quartiersData ?? [];
    const matched = !deferredQuery.trim()
      ? all
      : all.filter((q) =>
          (q.nom ?? "").toLowerCase().includes(deferredQuery.toLowerCase()),
        );
    return [...matched].sort((a, b) => recencyMs(b) - recencyMs(a));
  }, [quartiersData, deferredQuery, typeFilter]);

  // Pré-calcul unique du progress par immeuble (à partir des immeubles filtrés
  // par type/recherche). Sert à la fois au filtrage par progression
  // (immeublesEnCours) et au rendu des cartes (renderLieuCard) — un seul appel
  // à getImmeubleProgress par immeuble et par cycle.
  const progressByImmeubleId = useMemo(() => {
    const entries: Record<
      number,
      {
        total: number;
        prospectees: number;
        percent: number;
        progressPercent: number;
        progressColor: string;
        reste: number;
        rdv: number;
        absent: number;
      }
    > = {};

    for (const immeuble of filteredImmeubles) {
      const { total, prospectees, percent, color } = getImmeubleProgress(immeuble);
      // Signaux actionnables : RDV à honorer, absents à repasser.
      let rdv = 0;
      let absent = 0;
      for (const porte of immeuble.portes ?? []) {
        if (porte.statut === "RENDEZ_VOUS_PRIS") rdv += 1;
        else if (porte.statut === "ABSENT") absent += 1;
      }
      entries[immeuble.id] = {
        total,
        prospectees,
        percent,
        progressPercent: percent,
        progressColor: color,
        reste: Math.max(0, total - prospectees),
        rdv,
        absent,
      };
    }

    return entries;
  }, [filteredImmeubles]);

  const immeublesEnCours = useMemo(() => {
    const filtered = filteredImmeubles.filter((imm) => {
      const percent = progressByImmeubleId[imm.id]?.percent ?? 0;
      if (progressFilter === "all") return true;
      if (progressFilter === "incomplete") return percent < 100;
      if (progressFilter === "low") return percent < 35;
      if (progressFilter === "mid") return percent >= 35 && percent < 70;
      if (progressFilter === "high") return percent >= 70 && percent < 100;
      if (progressFilter === "complete") return percent === 100;
      return true;
    });
    return [...filtered].sort((a, b) => recencyMs(b) - recencyMs(a));
  }, [filteredImmeubles, progressByImmeubleId, progressFilter]);

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
    const matchedQuartiers = !deferredQuery.trim()
      ? (quartiersData ?? [])
      : (quartiersData ?? []).filter((q) =>
          (q.nom ?? "").toLowerCase().includes(deferredQuery.toLowerCase()),
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
  }, [typeFilter, deferredQuery, quartiersData, immeublesEnCours, columnsPerRow]);

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

  const handleOpenQuartier = useCallback(
    (quartierId: number) => {
      router.push(`/quartier/${quartierId}`);
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
      return (
        <QuartierCard
          key={`q${quartier.id}`}
          quartier={quartier}
          qp={qp}
          onOpenQuartier={handleOpenQuartier}
        />
      );
    },
    [quartierProgressById, handleOpenQuartier],
  );

  const renderLieuCard = useCallback(
    (immeuble: Immeuble) => {
      const progress: LieuProgress = progressByImmeubleId[immeuble.id] ?? {
        total: 0,
        prospectees: 0,
        progressPercent: 0,
        progressColor: progressColors.high,
        reste: 0,
        rdv: 0,
        absent: 0,
      };
      return (
        <LieuCard
          key={`l${immeuble.id}`}
          immeuble={immeuble}
          progress={progress}
          onOpen={handleOpenImmeuble}
          onFocusMap={focusOnMap}
        />
      );
    },
    [progressByImmeubleId, handleOpenImmeuble, focusOnMap],
  );

  // Couverture globale du terrain (portes prospectées / total, tous lieux) —
  // l'info reine de la page, affichée en tête. Indépendante des filtres.
  const coverage = useMemo(() => {
    let total = 0;
    let prospectees = 0;
    for (const imm of immeubles) {
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
    return { percent, color };
  }, [immeubles]);

  const lieuxCount = useMemo(
    () =>
      immeubles.filter((imm) => !quartierMemberIds.has(imm.id)).length +
      (quartiersData?.length ?? 0),
    [immeubles, quartierMemberIds, quartiersData],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderItem = useCallback(
    ({ item: row }: { item: ListRow }) =>
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
      ),
    // getFilterChipAnim/handleFilterToggle/searchInputRef lisent des refs ou
    // sont des fonctions locales stables ; setters d'état stables par React.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isSearchFocused,
      filtersVisible,
      typeFilter,
      progressFilter,
      query,
      showFilters,
      columnsPerRow,
      renderQuartierCard,
      renderLieuCard,
    ],
  );

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
      <View style={{ flex: 1 }}>
        <FlatList<ListRow>
          data={listData}
          windowSize={7}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={24}
          removeClippedSubviews
          keyExtractor={getRowKey}
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
              {/* Couverture globale du terrain — l'info reine, dès l'ouverture. */}
              <View style={styles.coverBlock}>
                <View style={styles.coverTop}>
                  <Text style={styles.coverCount}>
                    {lieuxCount} lieu{lieuxCount !== 1 ? "x" : ""}
                  </Text>
                  <Text style={[styles.coverPct, { color: coverage.color }]}>
                    {coverage.percent}% couverts
                  </Text>
                </View>
                <View style={styles.coverBar}>
                  <View
                    style={[
                      styles.coverBarFill,
                      { width: `${coverage.percent}%`, backgroundColor: coverage.color },
                    ]}
                  />
                </View>
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
          renderItem={renderItem}
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
      </View>
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
    marginBottom: 8,
  },

  // ── Rangée épurée (un lieu par ligne) ──
  rowCard: {
    flex: 1,
    gap: 8,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAddr: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  rowPct: {
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 47,
  },
  rowMetaText: {
    flexShrink: 1,
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: "600",
  },
  rowMapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: "auto",
  },
  rowMapText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  rowBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    marginLeft: 47,
  },
  rowBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  signalPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  signalText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  // ── En-tête couverture globale ──
  coverBlock: {
    gap: 8,
    paddingVertical: 2,
  },
  coverTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  coverCount: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
  },
  coverPct: {
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  coverBar: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  coverBarFill: {
    height: "100%",
    borderRadius: 999,
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
