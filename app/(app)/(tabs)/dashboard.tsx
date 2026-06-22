import { useCommercialActivity } from "@/hooks/api/use-commercial-activity";
import { useCommercialTimeline } from "@/hooks/api/use-commercial-timeline";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import type { Commercial, Manager } from "@/types/api";
import { calculateRank, RANKS } from "@/utils/business/ranks";
import {
  findBestDay,
  getNextRdvCountdown,
} from "@/utils/stats";
import {
  Card,
  Chip,
  ErrorState,
  IconBadge,
} from "@/components/ui";
import {
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type WeeklyData = {
  day: string;
  doors: number;
};

const BAR_AREA_HEIGHT = 140;

const SimpleBarChart = memo(function SimpleBarChart({
  data,
  color = colors.primary,
}: {
  data: WeeklyData[];
  color?: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.doors), 1);

  return (
    <View style={styles.chartContainer}>
      {data.map((item, index) => {
        const barHeight = Math.max((item.doors / maxValue) * BAR_AREA_HEIGHT, 4);
        const topSpace = BAR_AREA_HEIGHT - barHeight;
        return (
          <View key={index} style={styles.barColumn}>
            <Text style={[styles.barValue, { color }]}>{item.doors}</Text>
            <View style={styles.barWrapper}>
              <View style={{ height: topSpace }} />
              <View
                style={[
                  styles.bar,
                  { height: barHeight, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.dayLabel}>{item.day}</Text>
          </View>
        );
      })}
    </View>
  );
});

export default function DashboardScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [chartSlideWidth, setChartSlideWidth] = useState(0);
  const chartScrollRef = useRef<GestureScrollView>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const conversionSheetRef = useRef<BottomSheetModal>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const handleChartCardLayout = useCallback((e: LayoutChangeEvent) => {
    const cardInnerWidth = e.nativeEvent.layout.width - 40;
    setChartSlideWidth(cardInnerWidth);
  }, []);

  useEffect(() => {
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
  }, []);

  const { data: profile, loading, error, refetch } = useWorkspaceProfile(userId, role);
  const { rdvToday } = useCommercialActivity();
  const timeline = useCommercialTimeline(userId);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), rdvToday.refetch?.(), timeline.refetch?.()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, rdvToday, timeline]);

  const isManager = role === "manager";

  const stats = useMemo(() => {
    if (!profile) {
      return { contratsSignes: 0, immeublesVisites: 0, rendezVousPris: 0 };
    }

    const statsArray = isManager
      ? (profile as Manager).personalStatistics ||
        (profile as Manager).statistics ||
        []
      : (profile as Commercial).statistics || [];

    return statsArray.reduce(
      (acc, stat) => ({
        contratsSignes: acc.contratsSignes + (stat.contratsSignes || 0),
        immeublesVisites: acc.immeublesVisites + (stat.immeublesVisites || 0),
        rendezVousPris: acc.rendezVousPris + (stat.rendezVousPris || 0),
      }),
      { contratsSignes: 0, immeublesVisites: 0, rendezVousPris: 0 },
    );
  }, [profile, isManager]);

  const rankInfo = useMemo(() => {
    const result = calculateRank(
      stats.contratsSignes,
      stats.rendezVousPris,
      stats.immeublesVisites,
    );
    const currentRankIndex = RANKS.findIndex(
      (r) => r.name === result.rank.name,
    );
    const nextRank = RANKS[currentRankIndex + 1];
    const isMaxRank = !nextRank;

    let progressPercent = 0;
    let pointsToNext = 0;

    if (nextRank) {
      const pointsInCurrent = result.points - result.rank.minPoints;
      const pointsTotal = nextRank.minPoints - result.rank.minPoints;
      progressPercent = Math.min((pointsInCurrent / pointsTotal) * 100, 100);
      pointsToNext = nextRank.minPoints - result.points;
    }

    return {
      ...result,
      name: result.rank.name,
      isMaxRank,
      progressPercent,
      pointsToNext,
      nextRank,
    };
  }, [stats]);

  const nextRank = rankInfo.nextRank;

  const handleChartsMomentumEnd = useCallback((event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    if (chartSlideWidth > 0) {
      const index = Math.round(scrollPosition / chartSlideWidth);
      setActiveChartIndex(index);
    }
  }, [chartSlideWidth]);

  const handlePaginationPress = useCallback((targetIndex: number) => {
    if (chartSlideWidth > 0) {
      chartScrollRef.current?.scrollTo({
        x: targetIndex * chartSlideWidth,
        animated: true,
      });
    }
    setActiveChartIndex(targetIndex);
  }, [chartSlideWidth]);

  useEffect(() => {
    if (loading || !profile) {
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
  }, [contentOpacity, loading, profile]);

  const { weeklyData, weeklyContracts, conversionRate } = useMemo(() => {
    if (!profile) {
      return { weeklyData: [], weeklyContracts: [], conversionRate: "0.0" };
    }

    const immeubles = isManager
      ? (profile as Manager).immeubles || []
      : (profile as Commercial).immeubles || [];

    const allDoors = immeubles.flatMap((immeuble) => immeuble.portes || []);

    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split("T")[0],
        dayName: DAY_NAMES[date.getDay()],
      };
    });

    const visitsByDate = new Map<string, { doors: number; contracts: number }>();
    for (const door of allDoors) {
      if (!door.derniereVisite) continue;
      const visitDate = door.derniereVisite.split("T")[0];
      const current = visitsByDate.get(visitDate) ?? { doors: 0, contracts: 0 };
      current.doors += 1;
      if (door.statut === "CONTRAT_SIGNE") {
        current.contracts += door.nbContrats || 1;
      }
      visitsByDate.set(visitDate, current);
    }

    const doorsPerDay = last7Days.map(({ date, dayName }) => ({
      day: dayName,
      doors: visitsByDate.get(date)?.doors ?? 0,
    }));

    const contractsPerDay = last7Days.map(({ date, dayName }) => ({
      day: dayName,
      doors: visitsByDate.get(date)?.contracts ?? 0,
    }));

    const totalDoors = doorsPerDay.reduce((sum, d) => sum + d.doors, 0);
    const totalContracts = contractsPerDay.reduce((sum, d) => sum + d.doors, 0);
    const rate =
      totalDoors > 0 ? ((totalContracts / totalDoors) * 100).toFixed(1) : "0.0";

    return {
      weeklyData: doorsPerDay,
      weeklyContracts: contractsPerDay,
      conversionRate: rate,
    };
  }, [profile, isManager]);

  const nextRdvCountdown = useMemo(
    () => getNextRdvCountdown(rdvToday.data ?? [], new Date()),
    [rdvToday.data],
  );

  const bestDay = useMemo(
    () => findBestDay(timeline.data ?? [], "portesProspectees"),
    [timeline.data],
  );

  const handleOpenInfo = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const handleOpenConversionInfo = useCallback(() => {
    conversionSheetRef.current?.present();
  }, []);


  const prenom = profile
    ? isManager
      ? (profile as Manager).prenom
      : (profile as Commercial).prenom
    : null;

  if (loading || !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
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
        {error && !profile ? (
          <View style={{ paddingVertical: 40 }}>
            <ErrorState
              title="Impossible de charger les données"
              message={error}
              onRetry={() => { void refetch(); }}
            />
          </View>
        ) : (
          <Animated.View style={{ opacity: contentOpacity, gap: spacing.lg }}>

            {/* 1. Hero compact */}
            <Card variant="elevated" padding="md">
              <Text style={styles.heroGreeting}>
                Bonjour {prenom ?? ""}
              </Text>
              <View style={styles.heroSubRow}>
                <Chip
                  label={isManager ? "Manager" : "Commercial"}
                  tone="primary"
                />
              </View>
            </Card>

            {/* 2. Prochain RDV */}
            {isManager ? (
              <Card variant="elevated" padding="md">
                <View style={styles.rdvRow}>
                  <IconBadge icon="calendar" tone="neutral" size="md" />
                  <View style={styles.rdvInfo}>
                    <Text style={styles.rdvTitle}>Agenda équipe aujourd'hui</Text>
                    <Text style={styles.rdvSub}>
                      {rdvToday.data?.length ?? 0} RDV planifié{(rdvToday.data?.length ?? 0) !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : nextRdvCountdown ? (
              <Card variant="elevated" padding="md">
                <View style={styles.rdvRow}>
                  <IconBadge icon="clock" tone="primary" size="md" />
                  <View style={styles.rdvInfo}>
                    <Text style={styles.rdvTitle}>
                      Prochain RDV {nextRdvCountdown.formatted}
                    </Text>
                    <Text style={styles.rdvSub}>
                      {nextRdvCountdown.porte.numero
                        ? `Porte ${nextRdvCountdown.porte.numero}`
                        : "Porte inconnue"}
                      {nextRdvCountdown.porte.etage != null
                        ? ` · Étage ${nextRdvCountdown.porte.etage}`
                        : ""}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : (
              <Card variant="elevated" padding="md">
                <View style={styles.rdvRow}>
                  <IconBadge icon="calendar" tone="neutral" size="md" />
                  <View style={styles.rdvInfo}>
                    <Text style={styles.rdvTitle}>Pas de RDV aujourd'hui</Text>
                  </View>
                </View>
              </Card>
            )}

            {/* 3. Carte rang (condensée) */}
            <Card variant="elevated" padding="lg">
              <View style={styles.rankHeader}>
                <IconBadge icon="award" tone="warning" size="lg" />
                <View style={styles.rankInfo}>
                  <Text style={styles.rankTitle}>{rankInfo.name}</Text>
                  <Text style={styles.rankPoints}>{rankInfo.points} points</Text>
                </View>
                <Pressable
                  onPress={handleOpenInfo}
                  hitSlop={8}
                  style={styles.rankInfoBtn}
                >
                  <IconBadge icon="info" tone="neutral" size="sm" />
                </Pressable>
                {rankInfo.isMaxRank && (
                  <Feather name="check-circle" size={20} color={colors.success} />
                )}
              </View>

              {!rankInfo.isMaxRank && nextRank && (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Prochain rang</Text>
                    <Text style={styles.nextRankName}>{nextRank.name}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${rankInfo.progressPercent}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {rankInfo.pointsToNext} points restants
                  </Text>
                </View>
              )}
            </Card>

            {/* 4. Chart hebdomadaire */}
            <Card variant="elevated" padding="lg" onLayout={handleChartCardLayout} style={styles.chartCardContainer}>
              {chartSlideWidth > 0 && (
                <GestureScrollView
                  ref={chartScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleChartsMomentumEnd}
                >
                  <View style={[styles.chartSlide, { width: chartSlideWidth }]}>
                    <View style={styles.chartHeader}>
                      <Feather name="bar-chart-2" size={20} color={colors.primary} />
                      <Text style={styles.chartTitle}>
                        Portes prospectées cette semaine
                      </Text>
                    </View>
                    <SimpleBarChart data={weeklyData} />
                  </View>

                  <View style={[styles.chartSlide, { width: chartSlideWidth }]}>
                    <View style={styles.chartHeader}>
                      <Feather name="file-text" size={20} color={colors.success} />
                      <View style={styles.chartTitleContainer}>
                        <Text style={styles.chartTitle}>
                          Contrats signés cette semaine
                        </Text>
                        <View style={styles.conversionContainer}>
                          <View style={styles.conversionBadge}>
                            <Text style={styles.conversionRate}>
                              {conversionRate}%
                            </Text>
                            <Text style={styles.conversionLabel}>
                              taux conversion
                            </Text>
                          </View>
                          <Pressable
                            style={styles.conversionInfoButton}
                            onPress={handleOpenConversionInfo}
                          >
                            <Feather name="help-circle" size={16} color={colors.successText} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                    <SimpleBarChart data={weeklyContracts} color={colors.success} />
                  </View>
                </GestureScrollView>
              )}

              <View style={styles.paginationContainer}>
                <Pressable
                  onPress={() => handlePaginationPress(0)}
                  style={[
                    styles.paginationPill,
                    activeChartIndex === 0 && styles.paginationPillActive,
                  ]}
                >
                  <Feather
                    name="bar-chart-2"
                    size={14}
                    color={activeChartIndex === 0 ? colors.primary : colors.textSubtle}
                  />
                  <Text
                    style={[
                      styles.paginationLabel,
                      activeChartIndex === 0 && styles.paginationLabelActive,
                    ]}
                  >
                    Portes
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handlePaginationPress(1)}
                  style={[
                    styles.paginationPill,
                    activeChartIndex === 1 && styles.paginationPillActive,
                  ]}
                >
                  <Feather
                    name="file-text"
                    size={14}
                    color={activeChartIndex === 1 ? colors.success : colors.textSubtle}
                  />
                  <Text
                    style={[
                      styles.paginationLabel,
                      activeChartIndex === 1 && styles.paginationLabelActive,
                    ]}
                  >
                    Contrats
                  </Text>
                </Pressable>
              </View>
            </Card>

            {/* 5. Record personnel (commercial only) */}
            {!isManager && bestDay && (
              <Card variant="outlined" padding="md">
                <View style={styles.recordRow}>
                  <IconBadge icon="award" tone="warning" size="md" />
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordTitle}>
                      Record : {bestDay.value} portes
                    </Text>
                    <Text style={styles.recordSub}>le {bestDay.label}</Text>
                  </View>
                </View>
              </Card>
            )}

          </Animated.View>
        )}
      </ScrollView>

      {/* Info Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={["40%"]}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Feather name="info" size={20} color={colors.primary} />
            <Text style={styles.sheetTitle}>Calcul des points</Text>
          </View>
          <View style={styles.formulaGrid}>
            <Card variant="filled" padding="md" style={styles.formulaItemRow}>
              <View style={[styles.formulaIcon, { backgroundColor: colors.successSoft }]}>
                <Feather name="check-circle" size={16} color={colors.success} />
              </View>
              <Text style={styles.formulaItemLabel}>Contrat signé</Text>
              <Text style={styles.formulaItemValue}>100 pts</Text>
            </Card>
            <Card variant="filled" padding="md" style={styles.formulaItemRow}>
              <View style={[styles.formulaIcon, { backgroundColor: colors.primarySoft }]}>
                <Feather name="calendar" size={16} color={colors.primary} />
              </View>
              <Text style={styles.formulaItemLabel}>RDV pris</Text>
              <Text style={styles.formulaItemValue}>20 pts</Text>
            </Card>
            <Card variant="filled" padding="md" style={styles.formulaItemRow}>
              <View style={[styles.formulaIcon, { backgroundColor: colors.primaryMuted }]}>
                <Feather name="home" size={16} color={colors.primary} />
              </View>
              <Text style={styles.formulaItemLabel}>Immeuble visité</Text>
              <Text style={styles.formulaItemValue}>5 pts</Text>
            </Card>
          </View>
          <Text style={styles.formulaNote}>
            Votre rang est calculé en fonction de ces actions. Plus vous êtes
            actif, plus vous gagnez de points !
          </Text>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Conversion Rate Explanation Bottom Sheet */}
      <BottomSheetModal
        ref={conversionSheetRef}
        snapPoints={["35%"]}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Feather name="help-circle" size={20} color={colors.success} />
            <Text style={styles.sheetTitle}>Taux de conversion</Text>
          </View>
          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>
              Comment est-il calculé ?
            </Text>
            <Text style={styles.explanationText}>
              Le taux de conversion mesure l&apos;efficacité de votre
              prospection.
            </Text>
            <View style={styles.formulaBox}>
              <Text style={styles.formulaText}>
                (Portes avec contrats / Portes visitées) / 100
              </Text>
            </View>
            <Text style={styles.explanationExample}>
              <Text style={styles.boldText}>Exemple :</Text> Si vous visitez 100
              portes et signez 13 contrats, votre taux est de 13%.
            </Text>
            <View style={styles.performanceIndicators}>
              <View style={styles.performanceItem}>
                <View style={[styles.performanceDot, { backgroundColor: colors.success }]} />
                <Text style={styles.performanceText}>{">"} 20% = Excellent</Text>
              </View>
              <View style={styles.performanceItem}>
                <View style={[styles.performanceDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.performanceText}>10-20% = Bon</Text>
              </View>
              <View style={styles.performanceItem}>
                <View style={[styles.performanceDot, { backgroundColor: colors.danger }]} />
                <Text style={styles.performanceText}>{"<"} 10% = À améliorer</Text>
              </View>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  heroGreeting: {
    fontSize: fontSize["3xl"],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  heroSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rdvRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rdvInfo: {
    flex: 1,
  },
  rdvTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  rdvSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  rankHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rankInfo: {
    flex: 1,
  },
  rankTitle: {
    fontSize: fontSize["3xl"],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  rankPoints: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  rankInfoBtn: {
    padding: 4,
  },
  progressSection: {
    marginTop: spacing.lg,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  nextRankName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xs,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.warning,
    borderRadius: radius.xs,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
  chartCardContainer: {
    marginTop: 0,
  },
  chartSlide: {
    paddingHorizontal: 0,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    alignSelf: "center",
  },
  paginationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm + 2,
  },
  paginationPillActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  paginationLabel: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
  },
  paginationLabelActive: {
    color: colors.text,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    marginBottom: spacing.xl,
  },
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  chartTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  conversionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  conversionBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    alignItems: "center",
  },
  conversionRate: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  conversionLabel: {
    fontSize: fontSize.xs - 2,
    fontWeight: fontWeight.semibold,
    color: colors.successText,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  conversionInfoButton: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 180,
    paddingHorizontal: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barValue: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  barWrapper: {
    width: "100%",
    paddingHorizontal: 4,
    height: 140,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: radius.xs,
    borderTopRightRadius: radius.xs,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  recordSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  sheetContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 200,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    marginBottom: spacing.xl,
  },
  sheetTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  formulaGrid: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  formulaItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg - 2,
  },
  formulaIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  formulaItemLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    flex: 1,
  },
  formulaItemValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  formulaNote: {
    fontSize: fontSize.sm + 1,
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: spacing.sm + 2,
  },
  explanationCard: {
    gap: spacing.lg,
  },
  explanationTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  explanationText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 20,
  },
  formulaBox: {
    backgroundColor: colors.successSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.successSoft,
  },
  formulaText: {
    fontSize: fontSize.sm + 1,
    fontWeight: fontWeight.semibold,
    color: colors.successText,
    textAlign: "center",
  },
  explanationExample: {
    fontSize: fontSize.sm + 1,
    color: colors.textMuted,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  performanceIndicators: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  performanceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  performanceDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  performanceText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
});
