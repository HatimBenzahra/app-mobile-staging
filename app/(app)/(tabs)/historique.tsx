import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { authService } from "@/services/auth";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { useMapFocus } from "@/hooks/use-map-focus";
import type { Immeuble, StatusHistorique } from "@/types/api";
import { api } from "@/services/api";
import { dataSyncService } from "@/services/sync/data-sync.service";
import { Card, Chip, ErrorState, IconBadge } from "@/components/ui";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";

type Props = {
  onNavigateToImmeuble?: (immeubleId: number, porteId?: number) => void;
};

const FILTERS = [
  { key: "24h", label: "24h", icon: "clock" },
  { key: "7d", label: "7j", icon: "calendar" },
  { key: "30d", label: "30j", icon: "calendar" },
  { key: "all", label: "Tout", icon: "layers" },
] as const;

const FILTER_TO_MS: Record<string, number> = {
  all: Number.POSITIVE_INFINITY,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/**
 * Vocabulaire de statut aligné sur la Carte / le détail immeuble
 * (accents identiques à components/immeubles/prospection/status-display.ts),
 * mais complété pour couvrir toutes les valeurs brutes de StatusHistorique
 * (ABSENT générique, NECESSITE_REPASSAGE, NON_VISITE) qui n'y figurent pas.
 */
type StatusVisual = {
  label: string;
  bg: string;
  fg: string;
  accent: string;
  icon: keyof typeof Feather.glyphMap;
};

const STATUS_VISUAL: Record<string, StatusVisual> = {
  CONTRAT_SIGNE: {
    label: "Contrat signé",
    bg: "#DCFCE7",
    fg: "#166534",
    accent: "#22C55E",
    icon: "check-circle",
  },
  RENDEZ_VOUS_PRIS: {
    label: "RDV pris",
    bg: "#E5EEFF",
    fg: "#001B5E",
    accent: "#005BFF",
    icon: "calendar",
  },
  ARGUMENTE: {
    label: "Argumenté",
    bg: "#EEF2FF",
    fg: "#3730A3",
    accent: "#6366F1",
    icon: "message-square",
  },
  REFUS: {
    label: "Refus",
    bg: "#FEE2E2",
    fg: "#991B1B",
    accent: "#EF4444",
    icon: "x-circle",
  },
  ABSENT: {
    label: "Absent",
    bg: "#FFFBEB",
    fg: "#92400E",
    accent: "#F59E0B",
    icon: "user-x",
  },
  NECESSITE_REPASSAGE: {
    label: "À repasser",
    bg: "#FFFBEB",
    fg: "#92400E",
    accent: "#F59E0B",
    icon: "rotate-ccw",
  },
  NON_VISITE: {
    label: "Non visité",
    bg: "#F1F5F9",
    fg: "#475569",
    accent: "#94A3B8",
    icon: "circle",
  },
};

const STATUS_FALLBACK: StatusVisual = {
  label: "Inconnu",
  bg: colors.surfaceMuted,
  fg: colors.textMuted,
  accent: colors.textSubtle,
  icon: "help-circle",
};

function statusVisual(statut: string): StatusVisual {
  return STATUS_VISUAL[statut] ?? { ...STATUS_FALLBACK, label: statut };
}

/** Puces de filtre par statut affichées au-dessus du flux. */
const STATUS_FILTERS = [
  { key: "all", label: "Tout", icon: "layers" as const },
  { key: "CONTRAT_SIGNE", label: "Contrats", icon: "check-circle" as const },
  { key: "RENDEZ_VOUS_PRIS", label: "RDV", icon: "calendar" as const },
  { key: "REFUS", label: "Refus", icon: "x-circle" as const },
  { key: "ARGUMENTE", label: "Argumenté", icon: "message-square" as const },
  { key: "ABSENT", label: "Absent", icon: "user-x" as const },
  { key: "NECESSITE_REPASSAGE", label: "Repassage", icon: "rotate-ccw" as const },
];

type FeedEvent = {
  id: number;
  createdAt: string;
  statut: string;
  commentaire?: string | null;
  rdvDate?: string | null;
  rdvTime?: string | null;
  immeubleId: number;
  immeuble: Immeuble | undefined;
  adresse: string;
  porteId: number;
  porteLabel: string;
  authorName: string | null;
};

type DaySection = { key: string; title: string; data: FeedEvent[] };

const WEEKDAY_FMT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const TIME_FMT = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});
const RDV_FMT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function authorNameFrom(event: StatusHistorique): string | null {
  const person = event.commercial ?? event.manager;
  if (!person) return null;
  const initial = person.nom ? ` ${person.nom.charAt(0).toUpperCase()}.` : "";
  return `${person.prenom}${initial}`.trim();
}

// ---------------------------------------------------------------------------
// Ligne d'événement
// ---------------------------------------------------------------------------

type EventRowProps = {
  event: FeedEvent;
  showAuthor: boolean;
  canLocate: boolean;
  onPress: (event: FeedEvent) => void;
};

const EventRow = memo(function EventRow({
  event,
  showAuthor,
  canLocate,
  onPress,
}: EventRowProps) {
  const visual = statusVisual(event.statut);
  const time = TIME_FMT.format(new Date(event.createdAt));
  const isRdv = event.statut === "RENDEZ_VOUS_PRIS";
  const rdvLabel = event.rdvDate
    ? `${RDV_FMT.format(new Date(event.rdvDate))}${event.rdvTime ? ` · ${event.rdvTime}` : ""}`
    : null;

  return (
    <Pressable
      onPress={() => onPress(event)}
      android_ripple={{ color: colors.border }}
      style={styles.row}
    >
      <View style={styles.rowRail}>
        <View style={[styles.rowDot, { backgroundColor: visual.accent }]}>
          <Feather name={visual.icon} size={12} color={colors.surface} />
        </View>
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <View style={[styles.statusPill, { backgroundColor: visual.bg }]}>
            <Text style={[styles.statusPillText, { color: visual.fg }]}>
              {visual.label}
            </Text>
          </View>
          <Text style={styles.rowTime}>{time}</Text>
        </View>

        <Text style={styles.rowPorte} numberOfLines={1}>
          {event.porteLabel}
        </Text>
        <Text style={styles.rowAddress} numberOfLines={1}>
          {event.adresse}
        </Text>

        {event.commentaire ? (
          <Text style={styles.rowComment} numberOfLines={2}>
            “{event.commentaire}”
          </Text>
        ) : null}

        {isRdv && rdvLabel ? (
          <View style={styles.rdvBlock}>
            <Feather name="calendar" size={12} color={STATUS_VISUAL.RENDEZ_VOUS_PRIS.accent} />
            <Text style={styles.rdvText}>{rdvLabel}</Text>
          </View>
        ) : null}

        <View style={styles.rowFooter}>
          {showAuthor && event.authorName ? (
            <View style={styles.authorTag}>
              <Feather name="user" size={11} color={colors.textSubtle} />
              <Text style={styles.authorText}>{event.authorName}</Text>
            </View>
          ) : (
            <View />
          )}
          <View style={styles.rowAction}>
            <Feather
              name={canLocate ? "map-pin" : "chevron-right"}
              size={13}
              color={colors.primary}
            />
            <Text style={styles.rowActionText}>
              {canLocate ? "Voir sur carte" : "Ouvrir"}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Bande de compteurs (légère, pas un dashboard)
// ---------------------------------------------------------------------------

type SummaryItem = { label: string; value: number; accent: string; icon: keyof typeof Feather.glyphMap };

const SummaryStrip = memo(function SummaryStrip({ items }: { items: SummaryItem[] }) {
  return (
    <View style={styles.summaryRow}>
      {items.map((item) => (
        <Card key={item.label} variant="elevated" padding="sm" style={styles.summaryCard}>
          <Feather name={item.icon} size={14} color={item.accent} />
          <Text style={[styles.summaryValue, { color: item.accent }]}>{item.value}</Text>
          <Text style={styles.summaryLabel} numberOfLines={1}>
            {item.label}
          </Text>
        </Card>
      ))}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Écran
// ---------------------------------------------------------------------------

export default function HistoriqueScreen({ onNavigateToImmeuble }: Props) {
  const isFocused = useIsFocused();
  const { focusOnMap } = useMapFocus();

  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("7d");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [historyMap, setHistoryMap] = useState<Record<number, StatusHistorique[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadedHistoryIdsRef = useRef<Set<number>>(new Set());
  const pendingRefreshIdsRef = useRef<Set<number>>(new Set());
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

  const showAuthor = role != null && role !== "commercial";

  const { data: profile, loading, error, refetch } = useWorkspaceProfile(userId, role);

  const immeubles = useMemo(() => (profile?.immeubles || []) as Immeuble[], [profile]);

  const periodStartMs = useMemo(() => {
    const range = FILTER_TO_MS[filter] ?? Number.POSITIVE_INFINITY;
    if (!Number.isFinite(range)) return 0;
    return Date.now() - range;
  }, [filter]);

  // Immeubles dont on doit charger l'historique : ceux touchés dans la période
  // (updatedAt ≈ dernier évènement). Suffisant pour ne rien manquer, tout en
  // évitant de tout charger inutilement.
  const candidateImmeubles = useMemo(() => {
    return immeubles
      .filter((imm) => {
        const t = imm.updatedAt ? new Date(imm.updatedAt).getTime() : 0;
        return t >= periodStartMs;
      })
      .sort((a, b) => {
        const aT = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bT = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bT - aT;
      });
  }, [immeubles, periodStartMs]);

  const immeubleById = useMemo(() => {
    const map = new Map<number, Immeuble>();
    for (const imm of immeubles) map.set(imm.id, imm);
    return map;
  }, [immeubles]);

  // ------- Chargement de l'historique par immeuble candidat -------
  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      const missing = candidateImmeubles.filter(
        (imm) => !loadedHistoryIdsRef.current.has(imm.id),
      );
      if (missing.length === 0) {
        setHistoryLoading(false);
        return;
      }

      setHistoryLoading(true);
      const entries: Record<number, StatusHistorique[]> = {};
      await Promise.all(
        missing.map(async (imm) => {
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
  }, [candidateImmeubles]);

  const refreshHistoryForImmeuble = useCallback(async (immeubleId: number) => {
    try {
      const history = await api.portes.statusHistoriqueByImmeuble(immeubleId);
      loadedHistoryIdsRef.current.add(immeubleId);
      setHistoryMap((prev) => ({ ...prev, [immeubleId]: history || [] }));
    } catch {
      loadedHistoryIdsRef.current.delete(immeubleId);
    }
  }, []);

  // ------- Sync temps réel -------
  useEffect(() => {
    const unsubscribe = dataSyncService.subscribe((event) => {
      if (
        event.type !== "PORTE_CREATED" &&
        event.type !== "PORTE_UPDATED" &&
        event.type !== "PORTE_DELETED"
      ) {
        return;
      }
      if (!event.immeubleId) return;

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
    if (!isFocused) return;
    const pendingIds = Array.from(pendingRefreshIdsRef.current);
    if (pendingIds.length === 0) return;
    pendingRefreshIdsRef.current.clear();
    void Promise.all(pendingIds.map((id) => refreshHistoryForImmeuble(id)));
  }, [isFocused, refreshHistoryForImmeuble]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      loadedHistoryIdsRef.current.clear();
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // ------- Aplatissement en flux d'évènements -------
  const allEvents = useMemo(() => {
    const events: FeedEvent[] = [];
    for (const imm of candidateImmeubles) {
      const history = historyMap[imm.id];
      if (!history) continue;
      for (const ev of history) {
        events.push({
          id: ev.id,
          createdAt: ev.createdAt,
          statut: ev.statut,
          commentaire: ev.commentaire,
          rdvDate: ev.rdvDate,
          rdvTime: ev.rdvTime,
          immeubleId: imm.id,
          immeuble: immeubleById.get(imm.id),
          adresse: imm.adresse,
          porteId: ev.porteId,
          porteLabel: ev.porte
            ? `Porte ${ev.porte.numero} · Étage ${ev.porte.etage}`
            : `Porte ${ev.porteId}`,
          authorName: authorNameFrom(ev),
        });
      }
    }
    return events;
  }, [candidateImmeubles, historyMap, immeubleById]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = allEvents.filter((ev) => {
      const t = new Date(ev.createdAt).getTime();
      if (t < periodStartMs) return false;
      if (statusFilter !== "all" && ev.statut !== statusFilter) return false;
      if (q) {
        const hay = `${ev.adresse} ${ev.porteLabel} ${ev.commentaire ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return out;
  }, [allEvents, periodStartMs, statusFilter, query]);

  const summary = useMemo<SummaryItem[]>(() => {
    let contrats = 0;
    let rdv = 0;
    let refus = 0;
    for (const ev of filteredEvents) {
      if (ev.statut === "CONTRAT_SIGNE") contrats += 1;
      else if (ev.statut === "RENDEZ_VOUS_PRIS") rdv += 1;
      else if (ev.statut === "REFUS") refus += 1;
    }
    return [
      { label: "Contrats", value: contrats, accent: STATUS_VISUAL.CONTRAT_SIGNE.accent, icon: "check-circle" },
      { label: "RDV", value: rdv, accent: STATUS_VISUAL.RENDEZ_VOUS_PRIS.accent, icon: "calendar" },
      { label: "Refus", value: refus, accent: STATUS_VISUAL.REFUS.accent, icon: "x-circle" },
      { label: "Actions", value: filteredEvents.length, accent: colors.primary, icon: "activity" },
    ];
  }, [filteredEvents]);

  const sections = useMemo<DaySection[]>(() => {
    if (filteredEvents.length === 0) return [];
    const todayStart = startOfDay(Date.now());
    const yesterdayStart = todayStart - 86400000;

    const groups = new Map<number, FeedEvent[]>();
    for (const ev of filteredEvents) {
      const key = startOfDay(new Date(ev.createdAt).getTime());
      const list = groups.get(key) ?? [];
      list.push(ev);
      groups.set(key, list);
    }

    return Array.from(groups.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([dayMs, data]) => {
        let title: string;
        if (dayMs === todayStart) title = "Aujourd'hui";
        else if (dayMs === yesterdayStart) title = "Hier";
        else title = WEEKDAY_FMT.format(new Date(dayMs));
        return { key: String(dayMs), title, data };
      });
  }, [filteredEvents]);

  // ------- Skeleton pulse -------
  useEffect(() => {
    if (!loading) {
      skeletonPulse.setValue(0);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(skeletonPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [loading, skeletonPulse]);

  // ------- Handlers -------
  const handleEventPress = useCallback(
    (event: FeedEvent) => {
      const imm = event.immeuble;
      if (imm?.latitude != null && imm?.longitude != null) {
        focusOnMap(imm, { porteId: event.porteId });
        return;
      }
      onNavigateToImmeuble?.(event.immeubleId, event.porteId);
    },
    [focusOnMap, onNavigateToImmeuble],
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedEvent }) => {
      const canLocate = item.immeuble?.latitude != null && item.immeuble?.longitude != null;
      return (
        <EventRow
          event={item}
          showAuthor={showAuthor}
          canLocate={canLocate}
          onPress={handleEventPress}
        />
      );
    },
    [handleEventPress, showAuthor],
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
            placeholder="Adresse, porte ou commentaire..."
            placeholderTextColor={colors.textSubtle}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filtersRow}>
          {FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              icon={item.icon}
              selected={item.key === filter}
              tone="neutral"
              onPress={() => setFilter(item.key)}
            />
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusFilterRow}
        >
          {STATUS_FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              icon={item.icon}
              selected={item.key === statusFilter}
              tone="neutral"
              onPress={() => setStatusFilter(item.key)}
            />
          ))}
        </ScrollView>

        <SummaryStrip items={summary} />

        {historyLoading && !loading ? (
          <Text style={styles.helper}>Chargement de l&apos;activité...</Text>
        ) : null}
        {error && !profile ? (
          <View style={{ paddingVertical: 40 }}>
            <ErrorState
              title="Impossible de charger l'activité"
              message={error}
              onRetry={() => {
                void onRefresh();
              }}
            />
          </View>
        ) : null}
      </View>
    ),
    [error, filter, historyLoading, loading, onRefresh, profile, query, statusFilter, summary],
  );

  const listEmpty = useMemo(
    () =>
      !loading && !error ? (
        <Card variant="filled" padding="lg" style={styles.emptyCard}>
          <IconBadge icon="inbox" tone="neutral" size="lg" />
          <Text style={styles.emptyTitle}>Aucune activité</Text>
          <Text style={styles.emptyText}>
            {query.length > 0 || statusFilter !== "all"
              ? "Aucun évènement ne correspond à ces filtres."
              : "Aucune action de prospection sur cette période."}
          </Text>
          {query.length > 0 || statusFilter !== "all" ? (
            <Pressable
              onPress={() => {
                setQuery("");
                setStatusFilter("all");
              }}
              style={styles.clearBtn}
            >
              <Text style={styles.clearText}>Réinitialiser les filtres</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null,
    [error, loading, query, statusFilter],
  );

  if (loading && !profile) {
    const skeletonOpacity = skeletonPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 0.9],
    });
    return (
      <View style={styles.container}>
        <View style={styles.skeletonHeader}>
          <Animated.View style={[styles.skeletonSearch, { opacity: skeletonOpacity }]} />
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
        initialNumToRender={10}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={styles.content}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        stickySectionHeadersEnabled={false}
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
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerBlock: {
    gap: spacing.md,
    marginBottom: spacing.sm,
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
  filtersRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  statusFilterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  helper: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  // ---- Summary strip ----
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.sm,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  // ---- Section header ----
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  // ---- Event row ----
  row: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowRail: {
    alignItems: "center",
    paddingTop: 2,
  },
  rowDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusPillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  rowTime: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    fontWeight: fontWeight.medium,
  },
  rowPorte: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: 2,
  },
  rowAddress: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  rowComment: {
    fontSize: fontSize.sm,
    color: colors.textStrong,
    fontStyle: "italic",
    marginTop: 4,
  },
  rdvBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: STATUS_VISUAL.RENDEZ_VOUS_PRIS.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.md,
  },
  rdvText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: STATUS_VISUAL.RENDEZ_VOUS_PRIS.fg,
  },
  rowFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  authorTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  authorText: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    fontWeight: fontWeight.medium,
  },
  rowAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowActionText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  // ---- Empty ----
  emptyCard: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  clearBtn: {
    marginTop: spacing.xs,
  },
  clearText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  // ---- Skeleton ----
  skeletonHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  skeletonSearch: {
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.border,
  },
  skeletonFiltersRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  skeletonFilter: {
    width: 54,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
  },
  skeletonList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  skeletonCard: {
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.border,
  },
});
