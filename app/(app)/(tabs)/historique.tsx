import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import {
  Animated,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { authService } from "@/services/auth";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import type { Immeuble, StatusHistorique } from "@/types/api";
import { api } from "@/services/api";
import { dataSyncService } from "@/services/sync/data-sync.service";
import { Card, ErrorState, PressableCard, Chip, type ChipTone } from "@/components/ui";
import { colors, spacing, radius, fontSize, fontWeight } from "@/constants/theme";

const FILTERS = [
  { key: "all", label: "Tous", icon: "layers" },
  { key: "24h", label: "24h", icon: "clock" },
  { key: "7d", label: "7j", icon: "calendar" },
  { key: "30d", label: "30j", icon: "calendar" },
];

const STATUS_STYLE: Record<
  string,
  { label: string; tone: ChipTone; dot: string }
> = {
  NON_VISITE: { label: "Non visite", tone: "neutral", dot: colors.textSubtle },
  ABSENT: { label: "Absent", tone: "warning", dot: colors.warning },
  RENDEZ_VOUS_PRIS: { label: "RDV pris", tone: "primary", dot: colors.primary },
  CONTRAT_SIGNE: { label: "Contrat signe", tone: "success", dot: colors.success },
  REFUS: { label: "Refus", tone: "danger", dot: colors.danger },
  ARGUMENTE: { label: "Argumente", tone: "info", dot: colors.info },
  NECESSITE_REPASSAGE: {
    label: "Repassage",
    tone: "warning",
    dot: colors.warning,
  },
};

const STATUS_FALLBACK: { label: string; tone: ChipTone; dot: string } = {
  label: "Inconnu",
  tone: "neutral",
  dot: colors.textSubtle,
};

const FILTER_TO_MS: Record<string, number> = {
  all: Number.POSITIVE_INFINITY,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

type PortePipeline = {
  porteId: number;
  porteLabel: string;
  lastDate: string;
  events: StatusHistorique[];
};

type HistoryMeta = {
  porteCount: number;
  historyCount: number;
  pipelines: PortePipeline[];
};

const EMPTY_HISTORY_META: HistoryMeta = {
  porteCount: 0,
  historyCount: 0,
  pipelines: [],
};

function buildHistoryMeta(history: StatusHistorique[]): HistoryMeta {
  if (history.length === 0) return EMPTY_HISTORY_META;

  const grouped = new Map<number, StatusHistorique[]>();
  for (const event of history) {
    const list = grouped.get(event.porteId) ?? [];
    list.push(event);
    grouped.set(event.porteId, list);
  }

  const pipelines = Array.from(grouped.entries()).map(([porteId, events]) => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const last = sorted[sorted.length - 1];
    const porte = last.porte;

    return {
      porteId,
      porteLabel: porte
        ? `Porte ${porte.numero} • Etage ${porte.etage}`
        : `Porte ${porteId}`,
      lastDate: last.createdAt,
      events: sorted,
    };
  });

  const orderedPipelines = pipelines.sort((a, b) => b.lastDate.localeCompare(a.lastDate));

  return {
    porteCount: grouped.size,
    historyCount: history.length,
    pipelines: orderedPipelines,
  };
}

type HistoriqueImmeubleCardProps = {
  immeuble: Immeuble;
  isExpanded: boolean;
  expandAnim: Animated.Value;
  cardAnim: Animated.Value;
  historyMeta: HistoryMeta;
  onToggle: (immeubleId: number) => void;
};

const HistoriqueImmeubleCard = memo(
  function HistoriqueImmeubleCard({
    immeuble,
    isExpanded,
    expandAnim,
    cardAnim,
    historyMeta,
    onToggle,
  }: HistoriqueImmeubleCardProps) {
    const portePipelines = historyMeta.pipelines;

    return (
      <View>
        <PressableCard
          variant="elevated"
          padding="md"
          android_ripple={{ color: colors.border }}
          onPress={() => onToggle(immeuble.id)}
        >
          <Animated.View
            style={[
              styles.cardInner,
              {
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.cardIcon}>
              <Feather name="home" size={18} color={colors.surface} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {immeuble.adresse}
              </Text>
              <View style={styles.cardMeta}>
                <Feather name="clock" size={12} color={colors.textSubtle} />
                <Text style={styles.cardDate}>
                  {immeuble.updatedAt
                    ? new Date(immeuble.updatedAt).toLocaleDateString("fr-FR")
                    : "Date inconnue"}
                </Text>
              </View>
              <View style={styles.cardStats}>
                <Chip
                  tone="neutral"
                  label={`${historyMeta.porteCount} portes`}
                  icon="grid"
                  accent={colors.primary}
                />
                <Chip
                  tone="neutral"
                  label={`${historyMeta.historyCount} actions`}
                  icon="activity"
                  accent={colors.info}
                />
              </View>
            </View>
            <View style={styles.cardChevron}>
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: expandAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "180deg"],
                      }),
                    },
                  ],
                }}
              >
                <Feather name="chevron-down" size={18} color={colors.textSubtle} />
              </Animated.View>
            </View>
          </Animated.View>
        </PressableCard>

        {isExpanded ? (
          <Animated.View
            style={[
              {
                opacity: expandAnim,
                transform: [
                  {
                    translateY: expandAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 0],
                    }),
                  },
                  {
                    scale: expandAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.985, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {portePipelines.length === 0 ? (
              <Card variant="outlined" padding="md" style={styles.historyEmptyPanel}>
                <Feather name="inbox" size={20} color={colors.textSubtle} />
                <Text style={styles.historyEmptyTitle}>
                  Aucun historique pour cet immeuble
                </Text>
              </Card>
            ) : (
              <View style={styles.historyPanel}>
                <Text style={styles.historyPanelTitle}>Historique des portes</Text>
                {portePipelines.map((porte) => (
                  <Card key={porte.porteId} variant="outlined" padding="md">
                    <View style={styles.historyDoorHeader}>
                      <Text style={styles.historyDoorTitle}>{porte.porteLabel}</Text>
                      <Text style={styles.historyDoorDate}>
                        {new Date(porte.lastDate).toLocaleString("fr-FR")}
                      </Text>
                    </View>
                    <View style={styles.historyTimeline}>
                      {porte.events.map((event, index) => {
                        const statusStyle = STATUS_STYLE[event.statut] || {
                          ...STATUS_FALLBACK,
                          label: event.statut,
                        };
                        const isLast = index === porte.events.length - 1;
                        return (
                          <View key={event.id} style={styles.timelineRow}>
                            <View style={styles.timelineLeft}>
                              <View
                                style={[
                                  styles.timelineDot,
                                  { backgroundColor: statusStyle.dot },
                                ]}
                              />
                              {!isLast && <View style={styles.timelineLine} />}
                            </View>
                            <View style={styles.timelineContent}>
                              <Chip
                                tone={statusStyle.tone}
                                label={statusStyle.label}
                              />
                              <Text style={styles.timelineDate}>
                                {new Date(event.createdAt).toLocaleString("fr-FR")}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </Animated.View>
        ) : null}
      </View>
    );
  },
  (prev, next) =>
    prev.immeuble.id === next.immeuble.id &&
    prev.immeuble.adresse === next.immeuble.adresse &&
    prev.immeuble.updatedAt === next.immeuble.updatedAt &&
    prev.isExpanded === next.isExpanded &&
    prev.expandAnim === next.expandAnim &&
    prev.cardAnim === next.cardAnim &&
    prev.historyMeta === next.historyMeta &&
    prev.onToggle === next.onToggle,
);

export default function HistoriqueScreen() {
  const isFocused = useIsFocused();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [historyMap, setHistoryMap] = useState<Record<number, StatusHistorique[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedImmeubleId, setExpandedImmeubleId] = useState<number | null>(null);
  const loadedHistoryIdsRef = useRef<Set<number>>(new Set());
  const pendingRefreshIdsRef = useRef<Set<number>>(new Set());
  const expandAnimsRef = useState(() => new Map<number, Animated.Value>())[0];
  const cardAnimsRef = useState(() => new Map<number, Animated.Value>())[0];
  const skeletonPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
  }, []);

  const getExpandAnim = useCallback((id: number) => {
    const existing = expandAnimsRef.get(id);
    if (existing) return existing;
    const next = new Animated.Value(0);
    expandAnimsRef.set(id, next);
    return next;
  }, [expandAnimsRef]);

  const getCardAnim = useCallback((id: number) => {
    const existing = cardAnimsRef.get(id);
    if (existing) return existing;
    const next = new Animated.Value(0);
    cardAnimsRef.set(id, next);
    return next;
  }, [cardAnimsRef]);

  const { data: profile, loading, error, refetch } = useWorkspaceProfile(userId, role);

  const immeubles = useMemo(() => (profile?.immeubles || []) as Immeuble[], [profile]);

  const sortedImmeubles = useMemo(() => {
    return [...immeubles].sort((a, b) => {
      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [immeubles]);

  const filteredImmeubles = useMemo(() => {
    const now = Date.now();
    const rangeMs = FILTER_TO_MS[filter] ?? Number.POSITIVE_INFINITY;
    const q = query.trim().toLowerCase();
    return sortedImmeubles.filter((imm) => {
      const lastModified = imm.updatedAt ? new Date(imm.updatedAt).getTime() : 0;
      if (now - lastModified >= rangeMs) return false;
      if (!q) return true;
      if (imm.adresse?.toLowerCase().includes(q)) return true;
      return (imm.portes ?? []).some((p) =>
        p.nomPersonnalise?.toLowerCase().includes(q),
      );
    });
  }, [sortedImmeubles, filter, query]);

  const visibleImmeubles = filteredImmeubles;

  type Bucket = { key: string; title: string; data: Immeuble[] };

  const sections = useMemo<Bucket[]>(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const dayOfWeek = now.getDay(); // 0=Sun
    const daysFromMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = startOfToday - daysFromMonday * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const buckets: Bucket[] = [
      { key: "today", title: "Aujourd'hui", data: [] },
      { key: "yesterday", title: "Hier", data: [] },
      { key: "week", title: "Cette semaine", data: [] },
      { key: "month", title: "Ce mois", data: [] },
      { key: "older", title: "Plus ancien", data: [] },
    ];

    for (const imm of filteredImmeubles) {
      const t = imm.updatedAt ? new Date(imm.updatedAt).getTime() : 0;
      if (t >= startOfToday) buckets[0].data.push(imm);
      else if (t >= startOfYesterday) buckets[1].data.push(imm);
      else if (t >= startOfWeek) buckets[2].data.push(imm);
      else if (t >= startOfMonth) buckets[3].data.push(imm);
      else buckets[4].data.push(imm);
    }

    return buckets.filter((b) => b.data.length > 0);
  }, [filteredImmeubles]);

  const refreshHistoryForImmeuble = useCallback(async (immeubleId: number) => {
    try {
      const history = await api.portes.statusHistoriqueByImmeuble(immeubleId);
      loadedHistoryIdsRef.current.add(immeubleId);
      setHistoryMap((prev) => ({ ...prev, [immeubleId]: history || [] }));
    } catch {
      loadedHistoryIdsRef.current.delete(immeubleId);
    }
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      loadedHistoryIdsRef.current.clear();
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  useEffect(() => {
    if (!loading) {
      skeletonPulse.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [loading, skeletonPulse]);

  useEffect(() => {
    if (visibleImmeubles.length === 0) return;
    const animations = visibleImmeubles.map((imm, index) => {
      const anim = getCardAnim(imm.id);
      anim.setValue(0);
      return Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        delay: index * 45,
        useNativeDriver: true,
      });
    });
    Animated.stagger(60, animations).start();
  }, [getCardAnim, visibleImmeubles]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (visibleImmeubles.length === 0) {
        setHistoryLoading(false);
        return;
      }

      const missingImmeubles = visibleImmeubles.filter(
        (imm) => !loadedHistoryIdsRef.current.has(imm.id),
      );

      if (missingImmeubles.length === 0) {
        setHistoryLoading(false);
        return;
      }

      setHistoryLoading(true);
      const entries: Record<number, StatusHistorique[]> = {};

      await Promise.all(
        missingImmeubles.map(async (imm) => {
          try {
            const history = await api.portes.statusHistoriqueByImmeuble(imm.id);
            entries[imm.id] = history || [];
            loadedHistoryIdsRef.current.add(imm.id);
          } catch {
            entries[imm.id] = [];
          }
        }),
      );

      if (!cancelled) {
        setHistoryMap((prev) => ({ ...prev, ...entries }));
        setHistoryLoading(false);
      }
    };

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [visibleImmeubles]);

  useEffect(() => {
    const unsubscribe = dataSyncService.subscribe((event) => {
      if (
        event.type !== "PORTE_CREATED" &&
        event.type !== "PORTE_UPDATED" &&
        event.type !== "PORTE_DELETED"
      ) {
        return;
      }

      if (!event.immeubleId) {
        return;
      }

      loadedHistoryIdsRef.current.delete(event.immeubleId);
      if (!isFocused) {
        pendingRefreshIdsRef.current.add(event.immeubleId);
        return;
      }

      void refreshHistoryForImmeuble(event.immeubleId);
    });

    return unsubscribe;
  }, [isFocused, refreshHistoryForImmeuble]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const pendingIds = Array.from(pendingRefreshIdsRef.current);
    if (pendingIds.length === 0) {
      return;
    }

    pendingRefreshIdsRef.current.clear();
    void Promise.all(pendingIds.map((immeubleId) => refreshHistoryForImmeuble(immeubleId)));
  }, [isFocused, refreshHistoryForImmeuble]);

  const historyMetaByImmeuble = useMemo(() => {
    const entries: Record<number, HistoryMeta> = {};

    for (const imm of visibleImmeubles) {
      const history = historyMap[imm.id] ?? [];
      entries[imm.id] = buildHistoryMeta(history);
    }

    return entries;
  }, [historyMap, visibleImmeubles]);

  const toggleExpand = useCallback((immeubleId: number) => {
    const currentId = expandedImmeubleId;
    if (currentId === immeubleId) {
      const anim = getExpandAnim(immeubleId);
      Animated.timing(anim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start(() => {
        setExpandedImmeubleId(null);
      });
      return;
    }

    if (currentId !== null && currentId !== immeubleId) {
      getExpandAnim(currentId).setValue(0);
    }

    setExpandedImmeubleId(immeubleId);
    const anim = getExpandAnim(immeubleId);
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [expandedImmeubleId, getExpandAnim]);

  const handleFilterPress = useCallback((nextFilter: string) => {
    setFilter(nextFilter);
  }, []);

  const renderSeparator = useCallback(() => <View style={styles.itemSeparator} />, []);

  const renderImmeubleItem = useCallback(
    ({ item: immeuble }: { item: Immeuble }) => {
      const isExpanded = expandedImmeubleId === immeuble.id;
      const expandAnim = getExpandAnim(immeuble.id);
      const cardAnim = getCardAnim(immeuble.id);
      const historyMeta = historyMetaByImmeuble[immeuble.id] ?? EMPTY_HISTORY_META;

      return (
        <HistoriqueImmeubleCard
          immeuble={immeuble}
          isExpanded={isExpanded}
          expandAnim={expandAnim}
          cardAnim={cardAnim}
          historyMeta={historyMeta}
          onToggle={toggleExpand}
        />
      );
    },
    [
      expandedImmeubleId,
      getCardAnim,
      getExpandAnim,
      historyMetaByImmeuble,
      toggleExpand,
    ],
  );

  const totalCount = useMemo(
    () => sections.reduce((sum, s) => sum + s.data.length, 0),
    [sections],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher par adresse ou nom..."
            placeholderTextColor={colors.textSubtle}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.resultCount}>
          {totalCount} immeuble{totalCount > 1 ? "s" : ""}{query ? ` trouvé${totalCount > 1 ? "s" : ""}` : ""}
        </Text>

        <View style={styles.filtersRow}>
          {FILTERS.map((item) => {
            const selected = item.key === filter;
            return (
              <Chip
                key={item.key}
                label={item.label}
                icon={item.icon as keyof typeof Feather.glyphMap}
                selected={selected}
                tone="neutral"
                onPress={() => handleFilterPress(item.key)}
              />
            );
          })}
        </View>

        {loading && <Text style={styles.helper}>Chargement...</Text>}
        {historyLoading && !loading && (
          <Text style={styles.helper}>Chargement historique...</Text>
        )}
        {error && !profile && (
          <View style={{ paddingVertical: 40 }}>
            <ErrorState
              title="Impossible de charger les données"
              message={error}
              onRetry={() => { void onRefresh(); }}
            />
          </View>
        )}
      </View>
    ),
    [error, filter, handleFilterPress, historyLoading, loading, onRefresh, profile, query, setQuery, totalCount],
  );

  const listEmpty = useMemo(
    () =>
      !loading && !error ? (
        <Card variant="filled" padding="lg" style={styles.emptyCardInner}>
          <Feather name="home" size={32} color={colors.textSubtle} />
          {query.length > 0 ? (
            <>
              <Text style={styles.emptyText}>Aucun immeuble pour cette recherche</Text>
              <Pressable onPress={() => setQuery("")} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchText}>Effacer la recherche</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyText}>Aucun immeuble pour cette periode</Text>
          )}
        </Card>
      ) : null,
    [error, loading, query, setQuery],
  );

  if (loading) {
    const skeletonOpacity = skeletonPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 0.9],
    });
    return (
      <View style={styles.container}>
        <View style={styles.skeletonHeader}>
          <Animated.View style={[styles.skeletonTitle, { opacity: skeletonOpacity }]} />
          <Animated.View
            style={[styles.skeletonSubtitle, { opacity: skeletonOpacity }]}
          />
          <View style={styles.skeletonFiltersRow}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Animated.View
                key={index}
                style={[styles.skeletonFilter, { opacity: skeletonOpacity }]}
              />
            ))}
          </View>
        </View>
        <View style={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Animated.View
              key={index}
              style={[styles.skeletonCard, { opacity: skeletonOpacity }]}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        updateCellsBatchingPeriod={24}
        removeClippedSubviews
        contentContainerStyle={styles.content}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ItemSeparatorComponent={renderSeparator}
        renderItem={renderImmeubleItem}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        ListFooterComponent={null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  headerBlock: {
    gap: 12,
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  helper: {
    fontSize: 13,
    color: colors.textMuted,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
  emptyCardInner: {
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  skeletonHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  skeletonTitle: {
    width: "35%",
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  skeletonSubtitle: {
    width: "50%",
    height: 14,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  skeletonFiltersRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  skeletonFilter: {
    width: 54,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
  },
  skeletonList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  skeletonCard: {
    height: 96,
    borderRadius: 18,
    backgroundColor: colors.border,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  cardMeta: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  cardStats: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cardChevron: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  historyPanel: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  historyPanelTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  historyEmptyPanel: {
    marginHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  historyEmptyTitle: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  historyDoorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  historyDoorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  historyDoorDate: {
    fontSize: 11,
    color: colors.textSubtle,
  },
  historyTimeline: {
    gap: 12,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineLeft: {
    alignItems: "center",
    width: 16,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    backgroundColor: colors.border,
  },
  timelineContent: {
    flex: 1,
    gap: 6,
  },
  timelineDate: {
    fontSize: 11,
    color: colors.textSubtle,
  },
  itemSeparator: {
    height: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
  },
  resultCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  clearSearchBtn: {
    marginTop: spacing.xs,
  },
  clearSearchText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
});
