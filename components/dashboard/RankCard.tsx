import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { Card, ProgressBar } from "@/components/ui";
import type { Rank } from "@/utils/business/ranks";

type RankCardProps = {
  rank: Rank;
  points: number;
  nextRank?: Rank | null;
  progressPercent: number;
  pointsNeeded: number;
};

export default function RankCard({
  rank,
  points,
  nextRank,
  progressPercent,
  pointsNeeded,
}: RankCardProps) {
  return (
    <Card variant="outlined">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Rang</Text>
        <View style={[styles.pointsBadge, { borderColor: rank.accent }]}>
          <Text style={[styles.pointsText, { color: rank.accent }]}>
            {points} pts
          </Text>
        </View>
      </View>

      <View style={styles.rankRow}>
        <View style={[styles.rankBadge, { backgroundColor: rank.accent }]} />
        <Text style={styles.rankText}>Rang {rank.name}</Text>
      </View>

      {nextRank ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Prochain rang : {nextRank.name}
            </Text>
            <Text style={styles.progressValue}>{pointsNeeded} pts</Text>
          </View>
          <ProgressBar
            value={progressPercent}
            color={rank.accent}
            style={styles.progressBar}
          />
          <Text style={styles.progressCaption}>
            {Math.round(progressPercent)}% complete
          </Text>
        </View>
      ) : (
        <View style={styles.maxRank}>
          <Text style={styles.maxRankText}>Rang maximum atteint</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: fontSize.base - 1,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  pointsBadge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs,
  },
  pointsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rankBadge: {
    width: 16,
    height: 16,
    borderRadius: 5,
  },
  rankText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  progressBlock: {
    marginTop: spacing.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.textStrong,
  },
  progressValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  progressBar: {
    marginTop: spacing.sm,
  },
  progressCaption: {
    marginTop: spacing.xs + 2,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
  },
  maxRank: {
    marginTop: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  maxRankText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.successText,
  },
});
