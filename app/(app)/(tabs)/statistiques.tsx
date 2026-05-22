import { useCommercialTimeline } from "@/hooks/api/use-commercial-timeline";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import { dataSyncService } from "@/services/sync/data-sync.service";
import type { TimelinePoint } from "@/types/api";
import {
  Card,
  Chip,
  ErrorState,
  Funnel,
  IconBadge,
  PeriodSelector,
  PressableCard,
  StatTile,
  useToast,
} from "@/components/ui";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import {
  buildConversionFunnel,
  buildStatusDistribution,
  computeDelta,
  filterTimelineByPeriod,
  findBestDay,
  findBestWeek,
  formatRange,
  getPeriodRange,
  getPreviousPeriodRange,
  groupByDayOfWeek,
  sumTimeline,
  type StatsPeriod,
  type PeriodRange,
} from "@/utils/stats";
import { Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DAY_LABELS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const MONTH_NAMES = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

const TONE_COLORS: Record<string, string> = {
  primary: colors.primary,
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
  info: colors.info,
  neutral: colors.textSubtle,
};

type RdvItem = {
  porteId: number;
  immeubleId: number;
  adresse: string;
  numero: string;
  nomPersonnalise?: string;
  etage: number;
  statut: string;
  rdvDate: string;
  rdvTime?: string;
  commentaire?: string;
};

type StatistiquesScreenProps = {
  onNavigateToImmeuble?: (immeubleId: number) => void;
};

export default function StatistiquesScreen({
  onNavigateToImmeuble,
}: StatistiquesScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const isLandscape = width > screenHeight;
  const isFocused = useIsFocused();
  const toast = useToast();

  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const [period, setPeriod] = useState<StatsPeriod>("week");
  const [customRange] = useState<PeriodRange | undefined>();
  const [teamView, setTeamView] = useState<"mine" | "team">("mine");

  const [chartKey, setChartKey] = useState(0);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const skeletonPulse = useRef(new Animated.Value(0)).current;
  const wasFocusedRef = useRef(false);
  const shouldRefetchOnFocusRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      if (!isMounted) return;
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
    return () => {
      isMounted = false;
    };
  }, []);

  const isManager = role === "manager";
  const commercialId = role === "commercial" ? userId : null;

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const maxDays = 90;
  const { startDate, endDate } = useMemo(() => {
    const end = new Date(`${todayKey}T23:59:59.999Z`);
    const start = new Date(end);
    start.setDate(start.getDate() - (maxDays - 1));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [todayKey]);

  const {
    data: timelineData,
    loading: timelineLoading,
    refetch: refetchTimeline,
  } = useCommercialTimeline(commercialId, startDate, endDate);

  const workspaceState = useWorkspaceProfile(userId, role);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(todayKey);

  const allRdvPortes = useMemo<RdvItem[]>(() => {
    const items: RdvItem[] = [];
    const immeubles = workspaceState.data?.immeubles ?? [];
    for (const imm of immeubles) {
      for (const porte of imm.portes ?? []) {
        if (porte.rdvDate) {
          items.push({
            porteId: porte.id,
            immeubleId: imm.id,
            adresse: imm.adresse,
            numero: porte.numero,
            nomPersonnalise: porte.nomPersonnalise ?? undefined,
            etage: porte.etage,
            statut: typeof porte.statut === "string" ? porte.statut : "",
            rdvDate: porte.rdvDate,
            rdvTime: porte.rdvTime ?? undefined,
            commentaire: porte.commentaire ?? undefined,
          });
        }
      }
    }
    return items.sort((a, b) => {
      const dc = a.rdvDate.localeCompare(b.rdvDate);
      if (dc !== 0) return dc;
      return (a.rdvTime ?? "").localeCompare(b.rdvTime ?? "");
    });
  }, [workspaceState.data]);

  const weekDays = useMemo(() => {
    const today = new Date(`${todayKey}T12:00:00`);
    const dow = today.getDay();
    const mondayDelta = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayDelta + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [todayKey, weekOffset]);

  const weekLabel = useMemo(() => {
    if (!weekDays.length) return "";
    const s = weekDays[0];
    const e = weekDays[6];
    const sd = new Date(`${s}T12:00:00`);
    const ed = new Date(`${e}T12:00:00`);
    const sDay = String(sd.getDate()).padStart(2, "0");
    const eDay = String(ed.getDate()).padStart(2, "0");
    const sMonth = MONTH_NAMES[sd.getMonth()] ?? "";
    const eMonth = MONTH_NAMES[ed.getMonth()] ?? "";
    if (sMonth === eMonth) return `${sDay} - ${eDay} ${sMonth}`;
    return `${sDay} ${sMonth} - ${eDay} ${eMonth}`;
  }, [weekDays]);

  const rdvByDay = useMemo(() => {
    const map = new Map<string, RdvItem[]>();
    for (const item of allRdvPortes) {
      const dayKey = item.rdvDate.slice(0, 10);
      const arr = map.get(dayKey) ?? [];
      arr.push(item);
      map.set(dayKey, arr);
    }
    return map;
  }, [allRdvPortes]);

  const selectedDayRdvs = useMemo(
    () => rdvByDay.get(selectedDay) ?? [],
    [rdvByDay, selectedDay],
  );

  useEffect(() => {
    if (weekDays.includes(selectedDay)) return;
    const firstWithRdv = weekDays.find((d) => rdvByDay.has(d));
    setSelectedDay(firstWithRdv ?? weekDays[0] ?? todayKey);
  }, [weekDays, selectedDay, rdvByDay, todayKey]);

  useEffect(() => {
    const unsubscribe = dataSyncService.subscribe((event) => {
      if (
        event.type !== "IMMEUBLE_CREATED" &&
        event.type !== "IMMEUBLE_UPDATED" &&
        event.type !== "IMMEUBLE_DELETED" &&
        event.type !== "PORTE_CREATED" &&
        event.type !== "PORTE_UPDATED" &&
        event.type !== "PORTE_DELETED"
      ) {
        return;
      }
      if (!commercialId) return;
      if (isFocused) {
        void workspaceState.refetch();
        void refetchTimeline();
        return;
      }
      shouldRefetchOnFocusRef.current = true;
    });
    return unsubscribe;
  }, [commercialId, isFocused, workspaceState, refetchTimeline]);

  useEffect(() => {
    if (commercialId) return;
    shouldRefetchOnFocusRef.current = false;
  }, [commercialId]);

  useEffect(() => {
    if (!isFocused) {
      wasFocusedRef.current = false;
      return;
    }
    if (wasFocusedRef.current) return;
    wasFocusedRef.current = true;
    setChartKey((prev) => prev + 1);
    if (!commercialId || !shouldRefetchOnFocusRef.current) return;
    shouldRefetchOnFocusRef.current = false;
    void workspaceState.refetch();
    void refetchTimeline();
  }, [commercialId, isFocused, workspaceState, refetchTimeline]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([workspaceState.refetch(), refetchTimeline()]);
    } finally {
      setRefreshing(false);
    }
  }, [workspaceState, refetchTimeline]);

  const isLoading = workspaceState.loading || timelineLoading;

  useEffect(() => {
    if (!isLoading) {
      skeletonPulse.setValue(0);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isLoading, skeletonPulse]);

  useEffect(() => {
    if (isLoading) {
      contentOpacity.setValue(0);
      return;
    }
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [contentOpacity, isLoading]);

  const allTimeline: TimelinePoint[] = useMemo(
    () => timelineData ?? [],
    [timelineData],
  );

  const currentRange = useMemo(
    () => getPeriodRange(period, customRange),
    [period, customRange],
  );

  const previousRange = useMemo(
    () => getPreviousPeriodRange(period, customRange),
    [period, customRange],
  );

  const currentPoints = useMemo(
    () => filterTimelineByPeriod(allTimeline, currentRange),
    [allTimeline, currentRange],
  );

  const previousPoints = useMemo(
    () => filterTimelineByPeriod(allTimeline, previousRange),
    [allTimeline, previousRange],
  );

  const totals = useMemo(() => sumTimeline(currentPoints), [currentPoints]);
  const prevTotals = useMemo(() => sumTimeline(previousPoints), [previousPoints]);

  const immeublesDerivedFromWorkspace = useMemo(() => {
    const immeubles = workspaceState.data?.immeubles ?? [];
    const rangeFrom = currentRange.from.toISOString().slice(0, 10);
    const rangeTo = currentRange.to.toISOString().slice(0, 10);
    const set = new Set<number>();
    for (const imm of immeubles) {
      for (const porte of imm.portes ?? []) {
        const dv = porte.derniereVisite?.slice(0, 10);
        if (dv && dv >= rangeFrom && dv <= rangeTo) {
          set.add(imm.id);
        }
      }
    }
    return set.size;
  }, [workspaceState.data, currentRange]);

  const prevImmeublesCount = useMemo(() => {
    const immeubles = workspaceState.data?.immeubles ?? [];
    const rangeFrom = previousRange.from.toISOString().slice(0, 10);
    const rangeTo = previousRange.to.toISOString().slice(0, 10);
    const set = new Set<number>();
    for (const imm of immeubles) {
      for (const porte of imm.portes ?? []) {
        const dv = porte.derniereVisite?.slice(0, 10);
        if (dv && dv >= rangeFrom && dv <= rangeTo) {
          set.add(imm.id);
        }
      }
    }
    return set.size;
  }, [workspaceState.data, previousRange]);

  const contentWidth = width - (isLandscape ? 120 : 40);
  const chartWidth = isLandscape
    ? Math.min(contentWidth - 40, 900)
    : Math.min(contentWidth, 520);
  const chartHeight = isLandscape ? 220 : 180;

  const evolutionPoints = useMemo(() => {
    const pts = currentPoints.slice(-30);
    return pts;
  }, [currentPoints]);

  const { evoPortes, evoRdv, evoContrats } = useMemo(() => {
    const portesData: { value: number; label: string }[] = [];
    const rdvData: { value: number }[] = [];
    const contratsData: { value: number }[] = [];
    for (const p of evolutionPoints) {
      const d = new Date(p.date);
      const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      portesData.push({ value: p.portesProspectees ?? 0, label });
      rdvData.push({ value: p.rdvPris ?? 0 });
      contratsData.push({ value: p.contratsSignes ?? 0 });
    }
    return { evoPortes: portesData, evoRdv: rdvData, evoContrats: contratsData };
  }, [evolutionPoints]);

  const evoMaxValue = useMemo(() => {
    const maxVal = Math.max(
      1,
      evolutionPoints.reduce(
        (m, p) =>
          Math.max(
            m,
            p.portesProspectees ?? 0,
            p.rdvPris ?? 0,
            p.contratsSignes ?? 0,
          ),
        0,
      ),
    );
    return Math.ceil(maxVal * 1.2);
  }, [evolutionPoints]);

  const evoSpacing = useMemo(
    () =>
      Math.max(
        isLandscape ? 16 : 24,
        Math.floor((chartWidth - 80) / Math.max(1, evoPortes.length - 1)),
      ),
    [chartWidth, evoPortes.length, isLandscape],
  );

  const statusDistribution = useMemo(
    () => buildStatusDistribution(totals),
    [totals],
  );

  const pieTotal = useMemo(
    () => statusDistribution.reduce((s, d) => s + d.value, 0),
    [statusDistribution],
  );

  const funnelSteps = useMemo(
    () => buildConversionFunnel(totals),
    [totals],
  );

  const dowBuckets = useMemo(
    () => groupByDayOfWeek(currentPoints),
    [currentPoints],
  );

  const barData = useMemo(
    () =>
      dowBuckets.map((b) => ({
        value: b.portes,
        label: b.label,
        frontColor: colors.primary,
      })),
    [dowBuckets],
  );

  const barMax = useMemo(
    () => Math.max(1, ...dowBuckets.map((b) => b.portes)),
    [dowBuckets],
  );

  const bestDay = useMemo(
    () => findBestDay(allTimeline, "portesProspectees"),
    [allTimeline],
  );

  const bestWeek = useMemo(
    () => findBestWeek(allTimeline, "contratsSignes"),
    [allTimeline],
  );

  const bestDow = useMemo(() => {
    const best = dowBuckets.reduce(
      (best, b) => (b.portes > best.portes ? b : best),
      dowBuckets[0] ?? { label: "", portes: 0 },
    );
    return best.portes > 0 ? best : null;
  }, [dowBuckets]);

  const maxConversionDay = useMemo(() => {
    let max = 0;
    for (const p of currentPoints) {
      const portes = p.portesProspectees ?? 0;
      const contrats = p.contratsSignes ?? 0;
      if (portes > 0) {
        const rate = (contrats / portes) * 100;
        if (rate > max) max = rate;
      }
    }
    return max > 0 ? max : null;
  }, [currentPoints]);

  if (isLoading) {
    const skeletonOpacity = skeletonPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 0.9],
    });

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.kpiGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Animated.View
              key={`kpi-skeleton-${index}`}
              style={[styles.kpiCard, { opacity: skeletonOpacity }]}
            >
              <View style={styles.kpiSkeletonTop} />
              <View style={styles.kpiSkeletonValue} />
              <View style={styles.kpiSkeletonHint} />
            </Animated.View>
          ))}
        </View>
        {Array.from({ length: 5 }).map((_, index) => (
          <Animated.View
            key={`section-skeleton-${index}`}
            style={[
              styles.sectionSkeletonCard,
              styles.sectionCardTopSpacing,
              { opacity: skeletonOpacity },
            ]}
          >
            <View style={styles.sectionSkeletonTitle} />
            <View style={styles.sectionSkeletonSubtitle} />
            <View style={styles.sectionSkeletonChart} />
          </Animated.View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      {workspaceState.error && !workspaceState.data ? (
        <View style={{ paddingVertical: 40 }}>
          <ErrorState
            title="Impossible de charger les données"
            message={workspaceState.error}
            onRetry={() => { void onRefresh(); }}
          />
        </View>
      ) : (
        <Animated.View style={[styles.animatedContent, { opacity: contentOpacity }]}>

          {isManager ? (
            <View style={styles.teamToggleRow}>
              <Chip
                label="Mes stats"
                selected={teamView === "mine"}
                tone="neutral"
                onPress={() => setTeamView("mine")}
              />
              <Chip
                label="Équipe"
                icon="users"
                selected={teamView === "team"}
                tone="neutral"
                onPress={() => {
                  setTeamView("team");
                  toast.show({ message: "Vue équipe bientôt disponible", variant: "info" });
                }}
              />
            </View>
          ) : null}

          <View style={styles.periodSelectorWrap}>
            <PeriodSelector
              value={period}
              onChange={(p) => {
                setPeriod(p);
                setChartKey((k) => k + 1);
              }}
              onRequestCustom={() => {
                toast.show({ message: "Sélection personnalisée bientôt", variant: "info" });
              }}
            />
            <Text style={styles.rangeLabel}>{formatRange(currentRange)}</Text>
          </View>

          <View style={styles.kpiGrid}>
            <StatTile
              icon="home"
              label="Immeubles"
              value={immeublesDerivedFromWorkspace}
              emphasis="default"
              hint={computeDelta(immeublesDerivedFromWorkspace, prevImmeublesCount).formatted}
              style={styles.kpiTile}
            />
            <StatTile
              icon="grid"
              label="Portes"
              value={totals.portesProspectees}
              emphasis="default"
              hint={computeDelta(totals.portesProspectees, prevTotals.portesProspectees).formatted}
              style={styles.kpiTile}
            />
            <StatTile
              icon="calendar"
              label="RDV pris"
              value={totals.rdvPris}
              emphasis="default"
              hint={computeDelta(totals.rdvPris, prevTotals.rdvPris).formatted}
              style={styles.kpiTile}
            />
            <StatTile
              icon="award"
              label="Contrats"
              value={totals.contratsSignes}
              emphasis="default"
              iconTone="success"
              hint={computeDelta(totals.contratsSignes, prevTotals.contratsSignes).formatted}
              style={styles.kpiTile}
            />
            <StatTile
              icon="x-circle"
              label="Refus"
              value={totals.refus}
              emphasis="default"
              iconTone="danger"
              hint={computeDelta(totals.refus, prevTotals.refus).formatted}
              style={styles.kpiTile}
            />
            <StatTile
              icon="user-x"
              label="Absents"
              value={totals.absents}
              emphasis="default"
              iconTone="warning"
              hint={computeDelta(totals.absents, prevTotals.absents).formatted}
              style={styles.kpiTile}
            />
          </View>

          <Text style={styles.sectionTitle}>Évolution</Text>
          <Card variant="elevated" padding="md" style={styles.sectionCardGap}>
            <View style={styles.chartLegendRow}>
              <View style={styles.chartLegendItem}>
                <View style={[styles.chartLegendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.chartLegendText}>Portes</Text>
              </View>
              <View style={styles.chartLegendItem}>
                <View style={[styles.chartLegendDot, { backgroundColor: colors.info }]} />
                <Text style={styles.chartLegendText}>RDV</Text>
              </View>
              <View style={styles.chartLegendItem}>
                <View style={[styles.chartLegendDot, { backgroundColor: colors.success }]} />
                <Text style={styles.chartLegendText}>Contrats</Text>
              </View>
            </View>
            {evoPortes.length === 0 ? (
              <View style={styles.noDataBox}>
                <Text style={styles.noDataText}>Pas assez de données</Text>
              </View>
            ) : (
              <View style={styles.giftedChartWrap}>
                <LineChart
                  key={`evo-chart-${chartKey}`}
                  data={evoPortes}
                  data2={evoRdv}
                  data3={evoContrats}
                  height={chartHeight}
                  width={chartWidth}
                  curved
                  thickness={2.5}
                  color1={colors.primary}
                  color2={colors.info}
                  color3={colors.success}
                  areaChart
                  startFillColor={colors.primaryAlpha12}
                  endFillColor={colors.primaryAlpha0}
                  startOpacity={0.15}
                  endOpacity={0}
                  startFillColor2={colors.infoSoft}
                  endFillColor2={colors.infoSoft}
                  startOpacity2={0.15}
                  endOpacity2={0}
                  startFillColor3={colors.successSoft}
                  endFillColor3={colors.successSoft}
                  startOpacity3={0.15}
                  endOpacity3={0}
                  maxValue={evoMaxValue}
                  noOfSections={3}
                  yAxisLabelWidth={32}
                  yAxisTextStyle={styles.yAxisLabel}
                  yAxisColor="transparent"
                  yAxisThickness={0}
                  xAxisColor={colors.border}
                  xAxisThickness={1}
                  hideRules
                  rulesColor="transparent"
                  xAxisLabelTextStyle={styles.axisLabel}
                  showYAxisIndices={false}
                  isAnimated
                  animateOnDataChange
                  animationDuration={350}
                  spacing={evoSpacing}
                  initialSpacing={12}
                  endSpacing={12}
                  dataPointsColor1={colors.primary}
                  dataPointsColor2={colors.info}
                  dataPointsColor3={colors.success}
                  dataPointsRadius1={3}
                  dataPointsRadius2={3}
                  dataPointsRadius3={3}
                />
              </View>
            )}
          </Card>

          <Text style={styles.sectionTitle}>Répartition statuts</Text>
          <Card variant="elevated" padding="md" style={styles.sectionCardGap}>
            {statusDistribution.length === 0 ? (
              <View style={styles.noDataBox}>
                <Text style={styles.noDataText}>Aucune donnée sur cette période</Text>
              </View>
            ) : (
              <View style={styles.distRow}>
                {statusDistribution.map((item) => {
                  const pct = pieTotal > 0 ? Math.round((item.value / pieTotal) * 100) : 0;
                  const color = TONE_COLORS[item.toneKey] ?? colors.textSubtle;
                  return (
                    <View key={item.label} style={styles.distItem}>
                      <View style={styles.distBarTrack}>
                        <View
                          style={[
                            styles.distBarFill,
                            { width: `${pct}%`, backgroundColor: color },
                          ]}
                        />
                      </View>
                      <View style={styles.distLabelRow}>
                        <View style={[styles.distDot, { backgroundColor: color }]} />
                        <Text style={styles.distLabel} numberOfLines={1}>
                          {item.label}
                        </Text>
                        <Text style={styles.distValue}>{item.value}</Text>
                        <Text style={styles.distPct}>{pct}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          <Text style={styles.sectionTitle}>Funnel de conversion</Text>
          <Card variant="outlined" padding="md" style={styles.sectionCardGap}>
            <Funnel steps={funnelSteps} />
          </Card>

          <Text style={styles.sectionTitle}>Activité par jour</Text>
          <Card variant="elevated" padding="md" style={styles.sectionCardGap}>
            {dowBuckets.every((b) => b.portes === 0) ? (
              <View style={styles.noDataBox}>
                <Text style={styles.noDataText}>Aucune activité sur cette période</Text>
              </View>
            ) : (
              <View style={styles.giftedChartWrap}>
                <BarChart
                  key={`bar-chart-${chartKey}`}
                  data={barData}
                  height={chartHeight}
                  width={chartWidth}
                  maxValue={Math.ceil(barMax * 1.2)}
                  noOfSections={3}
                  barWidth={Math.max(18, Math.floor((chartWidth - 80) / 7 - 8))}
                  spacing={Math.floor((chartWidth - 80) / 7 - Math.max(18, Math.floor((chartWidth - 80) / 7 - 8)))}
                  initialSpacing={12}
                  endSpacing={12}
                  frontColor={colors.primary}
                  yAxisTextStyle={styles.yAxisLabel}
                  yAxisColor="transparent"
                  yAxisThickness={0}
                  xAxisColor={colors.border}
                  xAxisThickness={1}
                  hideRules
                  xAxisLabelTextStyle={styles.axisLabel}
                  isAnimated
                  animationDuration={350}
                  roundedTop
                />
              </View>
            )}
          </Card>

          <Text style={styles.sectionTitle}>Records</Text>
          <View style={styles.recordsGrid}>
            {bestDay ? (
              <Card variant="outlined" padding="md" style={styles.recordCard}>
                <IconBadge icon="trending-up" tone="primary" size="md" />
                <Text style={styles.recordLabel}>Meilleur jour</Text>
                <Text style={styles.recordValue}>{bestDay.value} portes</Text>
                <Text style={styles.recordSub}>le {bestDay.label}</Text>
              </Card>
            ) : null}

            {bestWeek ? (
              <Card variant="outlined" padding="md" style={styles.recordCard}>
                <IconBadge icon="calendar" tone="success" size="md" />
                <Text style={styles.recordLabel}>Meilleure semaine</Text>
                <Text style={styles.recordValue}>{bestWeek.value} contrats</Text>
                <Text style={styles.recordSub}>{bestWeek.label}</Text>
              </Card>
            ) : null}

            {maxConversionDay !== null ? (
              <Card variant="outlined" padding="md" style={styles.recordCard}>
                <IconBadge icon="target" tone="warning" size="md" />
                <Text style={styles.recordLabel}>Meilleur taux</Text>
                <Text style={styles.recordValue}>{Math.round(maxConversionDay)}%</Text>
                <Text style={styles.recordSub}>conversion max/jour</Text>
              </Card>
            ) : null}

            {bestDow ? (
              <Card variant="outlined" padding="md" style={styles.recordCard}>
                <IconBadge icon="star" tone="info" size="md" />
                <Text style={styles.recordLabel}>Meilleur jour</Text>
                <Text style={styles.recordValue}>{bestDow.label}</Text>
                <Text style={styles.recordSub}>{bestDow.portes} portes moy.</Text>
              </Card>
            ) : null}
          </View>

          <Card variant="elevated" padding="md" style={[styles.sectionCardGap, styles.sectionCardTopSpacing]}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitleInCard}>Rendez-vous</Text>
                <Text style={styles.sectionSubtitle}>{weekLabel}</Text>
              </View>
              <View style={styles.weekNav}>
                <Pressable onPress={() => setWeekOffset((w) => w - 1)} style={styles.weekNavBtn}>
                  <Feather name="chevron-left" size={18} color={colors.primary} />
                </Pressable>
                {weekOffset !== 0 && (
                  <Pressable onPress={() => { setWeekOffset(0); setSelectedDay(todayKey); }} style={styles.weekNavBtn}>
                    <Feather name="rotate-ccw" size={14} color={colors.primary} />
                  </Pressable>
                )}
                <Pressable onPress={() => setWeekOffset((w) => w + 1)} style={styles.weekNavBtn}>
                  <Feather name="chevron-right" size={18} color={colors.primary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.dayPillRow}>
              {weekDays.map((day) => {
                const isToday = day === todayKey;
                const isSelected = day === selectedDay;
                const hasRdv = rdvByDay.has(day);
                const d = new Date(`${day}T12:00:00`);
                return (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={[
                      styles.dayPill,
                      isSelected && styles.dayPillActive,
                      isToday && !isSelected && styles.dayPillToday,
                    ]}
                  >
                    <Text style={[styles.dayPillLabel, isSelected && styles.dayPillLabelActive]}>
                      {DAY_LABELS_SHORT[d.getDay()]}
                    </Text>
                    <Text style={[styles.dayPillDate, isSelected && styles.dayPillDateActive]}>
                      {String(d.getDate()).padStart(2, "0")}
                    </Text>
                    {hasRdv ? (
                      <View style={[styles.dayPillDot, isSelected && styles.dayPillDotActive]} />
                    ) : (
                      <View style={styles.dayPillDotSpacer} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {selectedDayRdvs.length === 0 ? (
              <View style={styles.rdvEmpty}>
                <Feather name="calendar" size={28} color={colors.borderStrong} />
                <Text style={styles.rdvEmptyText}>Aucun rendez-vous</Text>
              </View>
            ) : (
              <View style={styles.rdvList}>
                {selectedDayRdvs.map((item) => (
                  <PressableCard
                    key={`${item.porteId}-${item.rdvDate}`}
                    variant="outlined"
                    padding="md"
                    style={styles.rdvCardRow}
                    onPress={() => onNavigateToImmeuble?.(item.immeubleId)}
                  >
                    <View style={styles.rdvTimeCol}>
                      <Chip
                        label={item.rdvTime || "--:--"}
                        icon="clock"
                        tone="primary"
                      />
                    </View>
                    <View style={styles.rdvInfoCol}>
                      <Text style={styles.rdvPorteLabel} numberOfLines={1}>
                        Porte {item.numero}{item.nomPersonnalise ? ` · ${item.nomPersonnalise}` : ""}
                      </Text>
                      <Text style={styles.rdvEtageLabel}>
                        {item.etage === 0 ? "RDC" : `${item.etage}${item.etage === 1 ? "er" : "ème"} étage`}
                      </Text>
                      <View style={styles.rdvAddressRow}>
                        <Feather name="map-pin" size={11} color={colors.textSubtle} />
                        <Text style={styles.rdvAddressText} numberOfLines={1}>{item.adresse}</Text>
                      </View>
                      {item.commentaire ? (
                        <Text style={styles.rdvComment} numberOfLines={2}>{item.commentaire}</Text>
                      ) : null}
                    </View>
                    <View style={styles.rdvChevron}>
                      <Feather name="chevron-right" size={16} color={colors.borderStrong} />
                    </View>
                  </PressableCard>
                ))}
              </View>
            )}
          </Card>

        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  animatedContent: {
    gap: 12,
  },
  teamToggleRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  periodSelectorWrap: {
    gap: spacing.xs,
  },
  rangeLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiTile: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 140,
  },
  kpiCard: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 140,
    borderRadius: radius.lg,
    padding: 14,
    minHeight: 110,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  sectionTitleInCard: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    marginTop: 2,
  },
  sectionCardGap: {
    gap: 12,
  },
  sectionCardTopSpacing: {
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  chartLegendRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  chartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chartLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartLegendText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
  },
  giftedChartWrap: {
    paddingTop: 8,
  },
  noDataBox: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
  distRow: {
    gap: spacing.sm,
  },
  distItem: {
    gap: 4,
  },
  distBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  distBarFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  distLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  distDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  distLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  distValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    minWidth: 24,
    textAlign: "right",
  },
  distPct: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
    minWidth: 36,
    textAlign: "right",
  },
  recordsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  recordCard: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 140,
    gap: spacing.xs,
  },
  recordLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  recordValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  recordSub: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    gap: 2,
  },
  dayPillActive: {
    backgroundColor: colors.primary,
  },
  dayPillToday: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryRing,
  },
  dayPillLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  dayPillLabelActive: {
    color: colors.surface,
  },
  dayPillDate: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  dayPillDateActive: {
    color: colors.surface,
  },
  dayPillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  dayPillDotActive: {
    backgroundColor: colors.surface,
  },
  dayPillDotSpacer: {
    width: 5,
    height: 5,
  },
  rdvEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 8,
  },
  rdvEmptyText: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
  rdvList: {
    gap: 8,
  },
  rdvCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rdvTimeCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  rdvInfoCol: {
    flex: 1,
    gap: 2,
  },
  rdvPorteLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  rdvEtageLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  rdvAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  rdvAddressText: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    flex: 1,
  },
  rdvComment: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: 4,
  },
  rdvChevron: {
    alignItems: "center",
    justifyContent: "center",
    width: 24,
  },
  yAxisLabel: {
    fontSize: 11,
    color: colors.textSubtle,
  },
  axisLabel: {
    fontSize: 10,
    color: colors.textSubtle,
  },
  sectionSkeletonCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: 16,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: 16,
  },
  sectionSkeletonTitle: {
    width: "40%",
    height: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  sectionSkeletonSubtitle: {
    width: "58%",
    height: 12,
    borderRadius: radius.xs,
    backgroundColor: colors.border,
  },
  sectionSkeletonChart: {
    marginTop: 8,
    height: 170,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  kpiSkeletonTop: {
    width: "52%",
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
  },
  kpiSkeletonValue: {
    marginTop: 16,
    width: "64%",
    height: 28,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  kpiSkeletonHint: {
    marginTop: 10,
    width: "58%",
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
});
