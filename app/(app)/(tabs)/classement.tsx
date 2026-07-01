import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BadgeCard,
  ContractRow,
  LeaderboardRow,
  NextBadgeRow,
  RankTierBadge,
} from "@/components/gamification";
import { Card, Chip, ErrorState } from "@/components/ui";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { useBadgeCatalog } from "@/hooks/api/use-badge-catalog";
import { useTeamLeaderboard } from "@/hooks/api/use-team-leaderboard";
import { useMyBadges } from "@/hooks/api/use-my-badges";
import { useGamificationOffres } from "@/hooks/api/use-gamification-offres";
import { useMyContracts } from "@/hooks/api/use-my-contracts";
import { authService } from "@/services/auth";
import type { BadgeCategory, RankPeriod } from "@/types/graphql-schema";
import { badgeProgress, buildContractCounts } from "@/utils/business/badgeProgress";
import { contractPeriodField, periodKeyFor } from "@/utils/business/periods";

type Section = "classement" | "badges" | "contrats";
type Role = "commercial" | "manager";

const PERIODS: { key: RankPeriod; label: string }[] = [
  { key: "DAILY", label: "Jour" },
  { key: "WEEKLY", label: "Semaine" },
  { key: "MONTHLY", label: "Mois" },
  { key: "QUARTERLY", label: "Trimestre" },
  { key: "YEARLY", label: "Année" },
];

const CATEGORIES: { key: BadgeCategory; label: string }[] = [
  { key: "PROGRESSION", label: "Progression" },
  { key: "PRODUIT", label: "Produit" },
  { key: "PERFORMANCE", label: "Performance" },
  { key: "TROPHEE", label: "Trophée" },
];

const MAX_NEXT_BADGES = 6;

export default function ClassementScreen() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [section, setSection] = useState<Section>("classement");
  const [period, setPeriod] = useState<RankPeriod>("MONTHLY");
  const [categoryFilter, setCategoryFilter] = useState<BadgeCategory | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [id, r] = await Promise.all([
        authService.getUserId(),
        authService.getUserRole(),
      ]);
      if (!mounted) return;
      setUserId(id);
      setRole(r === "manager" ? "manager" : "commercial");
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const { data: leaderboard, loading: lbLoading, error: lbError, refetch: lbRefetch } =
    useTeamLeaderboard(period);
  const { data: myBadges, refetch: badgesRefetch } = useMyBadges(userId, role);
  const { data: catalog, loading: catLoading, error: catError, refetch: catRefetch } =
    useBadgeCatalog();
  const { data: contracts, refetch: contractsRefetch } = useMyContracts(userId, role);
  const { data: offres, refetch: offresRefetch } = useGamificationOffres();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        lbRefetch(),
        badgesRefetch(),
        catRefetch(),
        contractsRefetch(),
        offresRefetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [lbRefetch, badgesRefetch, catRefetch, contractsRefetch, offresRefetch]);

  // Le classement d'équipe ne contient que des commerciaux → match par commercialId.
  const myEntry = useMemo(() => {
    if (!leaderboard || !userId) return null;
    return leaderboard.find((e) => e.commercialId === userId) ?? null;
  }, [leaderboard, userId]);

  const earnedIds = useMemo(
    () => new Set((myBadges ?? []).map((b) => b.badgeDefinitionId)),
    [myBadges],
  );

  // Stats de la période sélectionnée — MÊME logique que la modale web.
  const periodStats = useMemo(() => {
    const key = periodKeyFor(period);
    const field = contractPeriodField(period);
    const periodContracts = (contracts ?? []).filter((c) => c[field] === key);
    const points = periodContracts.reduce((sum, c) => sum + (c.offrePoints ?? 0), 0);
    const badges = (myBadges ?? []).filter(
      (b) => b.periodKey === key || b.periodKey === "lifetime",
    ).length;
    return { contrats: periodContracts.length, points, badges };
  }, [contracts, myBadges, period]);

  // Contrats de la période sélectionnée, triés du plus récent au plus ancien.
  const periodContracts = useMemo(() => {
    const key = periodKeyFor(period);
    const field = contractPeriodField(period);
    return (contracts ?? [])
      .filter((c) => c[field] === key)
      .slice()
      .sort((a, b) =>
        (b.dateValidation ?? "").localeCompare(a.dateValidation ?? ""),
      );
  }, [contracts, period]);

  const contractCounts = useMemo(
    () => buildContractCounts(contracts ?? [], offres ?? []),
    [contracts, offres],
  );

  // Badges obtenus par catégorie — MÊME logique que la modale web :
  // badges du mois (periodKey === mois || "lifetime"), comptés en lignes, groupés par catégorie.
  const categoryStats = useMemo(() => {
    const key = periodKeyFor(period);
    const map = new Map<BadgeCategory, number>();
    for (const b of myBadges ?? []) {
      if (b.periodKey !== key && b.periodKey !== "lifetime") continue;
      const cat = b.badgeDefinition?.category;
      if (!cat) continue;
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return map;
  }, [myBadges, period]);

  const nextBadges = useMemo(() => {
    if (!catalog) return [];
    return catalog
      .filter((b) => !earnedIds.has(b.id))
      .map((b) => ({ badge: b, prog: badgeProgress(b, contractCounts) }))
      .filter((x) => x.prog.computable && x.prog.percent < 100)
      .sort(
        (a, b) =>
          b.prog.percent - a.prog.percent || a.prog.threshold - b.prog.threshold,
      )
      .slice(0, MAX_NEXT_BADGES);
  }, [catalog, earnedIds, contractCounts]);

  const filteredCatalog = useMemo(() => {
    if (!catalog) return [];
    const list = categoryFilter
      ? catalog.filter((b) => b.category === categoryFilter)
      : catalog;
    return [...list].sort((a, b) => {
      const ea = earnedIds.has(a.id) ? 0 : 1;
      const eb = earnedIds.has(b.id) ? 0 : 1;
      return ea - eb || a.tier - b.tier;
    });
  }, [catalog, categoryFilter, earnedIds]);

  const contentPad = { paddingBottom: insets.bottom + 24 };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, contentPad]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Bascule Classement / Badges */}
      <View style={styles.tabsRow}>
        <Chip
          label="Classement"
          icon="award"
          selected={section === "classement"}
          onPress={() => setSection("classement")}
        />
        <Chip
          label="Badges"
          icon="star"
          selected={section === "badges"}
          onPress={() => setSection("badges")}
        />
        <Chip
          label="Contrats"
          icon="file-text"
          selected={section === "contrats"}
          onPress={() => setSection("contrats")}
        />
      </View>

      {section === "classement" ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodRow}
          >
            {PERIODS.map((p) => (
              <Chip
                key={p.key}
                label={p.label}
                selected={period === p.key}
                onPress={() => setPeriod(p.key)}
              />
            ))}
          </ScrollView>

          {myEntry ? (
            <Card variant="primary" padding="lg" style={styles.myCard}>
              <View style={styles.myCardTop}>
                <Text style={styles.myCardLabel}>Ma position</Text>
                <RankTierBadge tierKey={myEntry.rankTierKey} label={myEntry.rankTierLabel} />
              </View>
              <View style={styles.myCardStats}>
                <View style={styles.myStat}>
                  <Text style={styles.myStatValue}>#{myEntry.rank}</Text>
                  <Text style={styles.myStatLabel}>Rang</Text>
                </View>
                <View style={styles.myStat}>
                  <Text style={styles.myStatValue}>{myEntry.points}</Text>
                  <Text style={styles.myStatLabel}>Points</Text>
                </View>
                <View style={styles.myStat}>
                  <Text style={styles.myStatValue}>{myEntry.contratsSignes}</Text>
                  <Text style={styles.myStatLabel}>Contrats</Text>
                </View>
              </View>
            </Card>
          ) : null}

          {lbError ? (
            <ErrorState message="Impossible de charger le classement." onRetry={lbRefetch} />
          ) : lbLoading && !leaderboard ? (
            <EmptyHint icon="loader" text="Chargement du classement..." />
          ) : leaderboard && leaderboard.length > 0 ? (
            <Card variant="outlined" padding="sm">
              {leaderboard.map((entry) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  highlight={entry.commercialId === userId}
                />
              ))}
            </Card>
          ) : (
            <EmptyHint icon="users" text="Aucun classement d'équipe pour cette période." />
          )}
        </>
      ) : section === "badges" ? (
        <>
          {/* Bandeau : tier + stats (badges · contrats · pts), comme le web */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodRow}
          >
            {PERIODS.map((p) => (
              <Chip
                key={p.key}
                label={p.label}
                selected={period === p.key}
                onPress={() => setPeriod(p.key)}
              />
            ))}
          </ScrollView>

          <Card variant="primary" padding="lg" style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>Ma gamification</Text>
              <RankTierBadge tierKey={myEntry?.rankTierKey} label={myEntry?.rankTierLabel} />
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroValue}>{periodStats.badges}</Text>
                <Text style={styles.heroSub}>badges</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroValue}>{periodStats.contrats}</Text>
                <Text style={styles.heroSub}>contrats</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroValue}>{periodStats.points}</Text>
                <Text style={styles.heroSub}>points</Text>
              </View>
            </View>
          </Card>

          {catError ? (
            <ErrorState message="Impossible de charger les badges." onRetry={catRefetch} />
          ) : catLoading && !catalog ? (
            <EmptyHint icon="loader" text="Chargement des badges..." />
          ) : catalog && catalog.length > 0 ? (
            <>
              {/* Stats par catégorie */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.statsRow}
              >
                {CATEGORIES.map((c) => (
                  <View key={c.key} style={styles.statMini}>
                    <Text style={styles.statMiniValue}>{categoryStats.get(c.key) ?? 0}</Text>
                    <Text style={styles.statMiniLabel}>{c.label}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* Prochains badges */}
              {nextBadges.length > 0 ? (
                <View style={styles.block}>
                  <Text style={styles.sectionTitle}>Prochains badges</Text>
                  <Card variant="outlined" padding="md" style={styles.nextCard}>
                    {nextBadges.map(({ badge, prog }) => (
                      <NextBadgeRow
                        key={badge.id}
                        badge={badge}
                        current={prog.current}
                        threshold={prog.threshold}
                        percent={prog.percent}
                      />
                    ))}
                  </Card>
                </View>
              ) : null}

              {/* Filtres catégorie */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                <Chip
                  label="Toutes"
                  selected={categoryFilter === null}
                  onPress={() => setCategoryFilter(null)}
                />
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c.key}
                    label={c.label}
                    selected={categoryFilter === c.key}
                    onPress={() => setCategoryFilter(c.key)}
                  />
                ))}
              </ScrollView>

              {/* Catalogue */}
              <View style={styles.badgeGrid}>
                {filteredCatalog.map((b) => (
                  <BadgeCard key={b.id} badge={b} earned={earnedIds.has(b.id)} />
                ))}
              </View>
            </>
          ) : (
            <EmptyHint icon="star" text="Aucun badge disponible." />
          )}
        </>
      ) : (
        <>
          {/* Sélecteur de période */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodRow}
          >
            {PERIODS.map((p) => (
              <Chip
                key={p.key}
                label={p.label}
                selected={period === p.key}
                onPress={() => setPeriod(p.key)}
              />
            ))}
          </ScrollView>

          {periodContracts.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>
                {periodStats.contrats} contrat{periodStats.contrats > 1 ? "s" : ""} ·{" "}
                {periodStats.points} pts
              </Text>
              <Card variant="outlined" padding="sm">
                {periodContracts.map((c) => (
                  <ContractRow key={c.id} contrat={c} />
                ))}
              </Card>
            </>
          ) : (
            <EmptyHint icon="file-text" text="Aucun contrat signé sur cette période." />
          )}
        </>
      )}
    </ScrollView>
  );
}

function EmptyHint({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <Card variant="outlined" padding="lg" style={styles.empty}>
      <Feather name={icon} size={26} color={colors.textSubtle} />
      <Text style={styles.emptyText}>{text}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  tabsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  periodRow: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  myCard: {
    gap: spacing.lg,
  },
  myCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  myCardLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
    opacity: 0.85,
  },
  myCardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  myStat: {
    alignItems: "center",
  },
  myStatValue: {
    fontSize: fontSize["3xl"],
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  myStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textOnPrimary,
    opacity: 0.85,
  },
  heroCard: {
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
    opacity: 0.85,
  },
  heroStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroStat: {
    alignItems: "center",
  },
  heroValue: {
    fontSize: fontSize["3xl"],
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  heroSub: {
    fontSize: fontSize.xs,
    color: colors.textOnPrimary,
    opacity: 0.85,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statMini: {
    minWidth: 92,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  statMiniValue: {
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statMiniTotal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSubtle,
  },
  statMiniLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  block: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  nextCard: {
    gap: spacing.xs,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-start",
  },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: "center",
  },
});
