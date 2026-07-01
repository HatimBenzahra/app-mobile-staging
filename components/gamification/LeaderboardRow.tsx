import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import type { RankSnapshotType } from "@/types/graphql-schema";
import { podiumColor } from "@/utils/business/rankTiers";
import { RankTierBadge } from "./RankTierBadge";

type Props = {
  entry: RankSnapshotType;
  /** Met en évidence la ligne de l'utilisateur courant. */
  highlight?: boolean;
};

function displayName(e: RankSnapshotType): string {
  const prenom = e.commercialPrenom ?? e.managerPrenom ?? "";
  const nom = e.commercialNom ?? e.managerNom ?? "";
  const full = `${prenom} ${nom}`.trim();
  return full || "—";
}

export function LeaderboardRow({ entry, highlight }: Props) {
  const medal = podiumColor(entry.rank);
  return (
    <View style={[styles.row, highlight && styles.rowHighlight]}>
      <View style={[styles.rankBox, medal ? { backgroundColor: medal } : styles.rankBoxNeutral]}>
        {medal ? (
          <Feather name="award" size={14} color={colors.textOnPrimary} />
        ) : (
          <Text style={styles.rankNum}>{entry.rank}</Text>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName(entry)}
        </Text>
        <RankTierBadge tierKey={entry.rankTierKey} label={entry.rankTierLabel} size="sm" />
      </View>

      <View style={styles.metrics}>
        <Text style={styles.points}>{entry.points} pts</Text>
        <Text style={styles.sub}>{entry.contratsSignes} contrats</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  rowHighlight: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  rankBox: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBoxNeutral: {
    backgroundColor: colors.surfaceMuted,
  },
  rankNum: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
    alignItems: "flex-start",
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  metrics: {
    alignItems: "flex-end",
  },
  points: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  sub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});

export default LeaderboardRow;
