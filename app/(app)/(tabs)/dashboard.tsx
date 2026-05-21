import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import type { Commercial, Manager } from "@/types/api";
import { calculateRank, RANKS } from "@/utils/business/ranks";
import { Card, IconBadge, PressableCard } from "@/components/ui";
import { colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  Pressable,
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

// Simple custom bar chart component
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

  const { data: profile, loading } = useWorkspaceProfile(userId, role);

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

  // Calculate weekly data from real backend data
  const { weeklyData, weeklyContracts, conversionRate } = useMemo(() => {
    if (!profile) {
      return {
        weeklyData: [],
        weeklyContracts: [],
        conversionRate: "0.0",
      };
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

    const visitsByDate = new Map<
      string,
      { doors: number; contracts: number }
    >();
    for (const door of allDoors) {
      if (!door.derniereVisite) continue;
      const visitDate = door.derniereVisite.split("T")[0];
      const current = visitsByDate.get(visitDate) ?? { doors: 0, contracts: 0 };
      current.doors += 1;
      if ((door.nbContrats || 0) > 0) {
        current.contracts += 1;
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

    // Calculate conversion rate
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

  const handleOpenInfo = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const handleOpenConversionInfo = useCallback(() => {
    conversionSheetRef.current?.present();
  }, []);

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
      >
        <Animated.View style={{ opacity: contentOpacity }}>
          {/* Rank Card - Compact */}
          <Card variant="elevated" padding="lg">
            {/* Rank Header */}
            <View style={styles.rankHeader}>
              <IconBadge icon="award" tone="warning" size="lg" />
              <View style={styles.rankInfo}>
                <Text style={styles.rankTitle}>{rankInfo.name}</Text>
                <Text style={styles.rankPoints}>{rankInfo.points} points</Text>
              </View>
              <PressableCard variant="filled" padding="none" style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16 }} onPress={handleOpenInfo}>
                <Feather name="info" size={18} color="#005BFF" />
              </PressableCard>
              {rankInfo.isMaxRank && (
                <Feather name="check-circle" size={20} color="#10B981" />
              )}
            </View>

            {/* Progress Bar */}
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

          {/* Charts Slider */}
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
                  <Feather name="bar-chart-2" size={20} color="#005BFF" />
                  <Text style={styles.chartTitle}>
                    Portes prospectées cette semaine
                  </Text>
                </View>
                <SimpleBarChart data={weeklyData} />
              </View>

              <View style={[styles.chartSlide, { width: chartSlideWidth }]}>
                <View style={styles.chartHeader}>
                  <Feather name="file-text" size={20} color="#10B981" />
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
                        <Feather name="help-circle" size={16} color="#059669" />
                      </Pressable>
                    </View>
                  </View>
                </View>
                <SimpleBarChart data={weeklyContracts} color="#10B981" />
              </View>
            </GestureScrollView>
            )}

            {/* Pagination Indicators */}
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
                  color={activeChartIndex === 0 ? "#005BFF" : "#94A3B8"}
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
                  color={activeChartIndex === 1 ? "#10B981" : "#94A3B8"}
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
        </Animated.View>
      </ScrollView>

      {/* Info Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={["40%"]}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Feather name="info" size={20} color="#005BFF" />
            <Text style={styles.sheetTitle}>Calcul des points</Text>
          </View>
          <View style={styles.formulaGrid}>
            <Card variant="filled" padding="md" style={styles.formulaItemRow}>
              <View
                style={[styles.formulaIcon, { backgroundColor: "#ECFDF5" }]}
              >
                <Feather name="check-circle" size={16} color="#10B981" />
              </View>
              <Text style={styles.formulaItemLabel}>Contrat signé</Text>
              <Text style={styles.formulaItemValue}>100 pts</Text>
            </Card>
            <Card variant="filled" padding="md" style={styles.formulaItemRow}>
              <View
                style={[styles.formulaIcon, { backgroundColor: "#F5F3FF" }]}
              >
                <Feather name="calendar" size={16} color="#8B5CF6" />
              </View>
              <Text style={styles.formulaItemLabel}>RDV pris</Text>
              <Text style={styles.formulaItemValue}>20 pts</Text>
            </Card>
            <Card variant="filled" padding="md" style={styles.formulaItemRow}>
              <View
                style={[styles.formulaIcon, { backgroundColor: "#E5EEFF" }]}
              >
                <Feather name="home" size={16} color="#2F80FF" />
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
            <Feather name="help-circle" size={20} color="#10B981" />
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
                <View
                  style={[
                    styles.performanceDot,
                    { backgroundColor: "#10B981" },
                  ]}
                />
                <Text style={styles.performanceText}>
                  {">"} 20% = Excellent
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <View
                  style={[
                    styles.performanceDot,
                    { backgroundColor: "#F59E0B" },
                  ]}
                />
                <Text style={styles.performanceText}>10-20% = Bon</Text>
              </View>
              <View style={styles.performanceItem}>
                <View
                  style={[
                    styles.performanceDot,
                    { backgroundColor: "#EF4444" },
                  ]}
                />
                <Text style={styles.performanceText}>
                  {"<"} 10% = � am�liorer
                </Text>
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
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
  },
  sectionCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  periodRow: {
    flexDirection: "row",
    gap: 6,
  },
  periodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  periodChipActive: {
    borderColor: "#005BFF",
    backgroundColor: "#005BFF",
  },
  periodChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  periodChipTextActive: {
    color: "#FFFFFF",
  },
  legendRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 12,
    minHeight: 140,
  },
  chartItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 110,
    width: "100%",
    justifyContent: "center",
  },
  chartBar: {
    width: 8,
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: 10,
    color: "#94A3B8",
  },
  chartHelper: {
    fontSize: 11,
    color: "#94A3B8",
    marginLeft: 8,
  },
  rankHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rankInfo: {
    flex: 1,
  },
  rankTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  rankPoints: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F59E0B",
  },
  progressSection: {
    marginTop: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  nextRankName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },
  chartCardContainer: {
    marginTop: 20,
  },
  chartSlide: {
    paddingHorizontal: 0,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    alignSelf: "center",
  },
  paginationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  paginationPillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  paginationLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  paginationLabelActive: {
    color: "#0F172A",
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
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
    gap: 8,
  },
  conversionBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
  },
  conversionRate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981",
  },
  conversionLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  conversionInfoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
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
  barValueContainer: {
    height: 24,
    justifyContent: "center",
    marginBottom: 4,
  },
  barValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  barWrapper: {
    width: "100%",
    paddingHorizontal: 4,
    height: 140,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 8,
  },
  sheetContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 200,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  formulaGrid: {
    gap: 12,
    marginBottom: 20,
  },
  formulaItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  formulaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  formulaItemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    flex: 1,
  },
  formulaItemValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#005BFF",
  },
  formulaNote: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  explanationCard: {
    gap: 16,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  formulaBox: {
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  formulaText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
    textAlign: "center",
  },
  explanationExample: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "700",
    color: "#0F172A",
  },
  performanceIndicators: {
    gap: 8,
    marginTop: 8,
  },
  performanceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  performanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  performanceText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
});
