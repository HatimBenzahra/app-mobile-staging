import { Feather } from "@expo/vector-icons";
import { StyleSheet, type StyleProp, Text, View, type ViewStyle } from "react-native";
import { colors, fontSize, fontWeight, spacing } from "@/constants/theme";
import { Card, type CardVariant } from "./Card";
import { IconBadge, type IconBadgeTone } from "./IconBadge";

type Props = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  /** Display the brand-colored fill version when emphasis is needed. */
  emphasis?: "primary" | "default";
  iconTone?: IconBadgeTone;
  hint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Compact KPI tile used across dashboard, statistiques, equipe, agenda.
 * Replaces the ~6 different "summaryCardPrimary / kpiCard / statCard"
 * implementations that exist in the codebase.
 */
export function StatTile({
  icon,
  label,
  value,
  emphasis = "default",
  iconTone,
  hint,
  style,
}: Props) {
  const isPrimary = emphasis === "primary";
  const cardVariant: CardVariant = isPrimary ? "primary" : "elevated";
  const resolvedTone: IconBadgeTone =
    iconTone ?? (isPrimary ? "inverse" : "primary");

  return (
    <Card variant={cardVariant} padding="md" style={[styles.tile, style]}>
      <View style={styles.header}>
        <Text
          style={[styles.label, isPrimary && styles.labelOnPrimary]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <IconBadge icon={icon} tone={resolvedTone} size="md" />
      </View>
      <Text style={[styles.value, isPrimary && styles.valueOnPrimary]}>
        {value}
      </Text>
      {hint ? (
        <Text style={[styles.hint, isPrimary && styles.hintOnPrimary]}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 110,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  labelOnPrimary: {
    color: colors.textOnPrimary,
  },
  value: {
    marginTop: spacing.md - 2,
    fontSize: fontSize["4xl"],
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  valueOnPrimary: {
    color: colors.textOnPrimary,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  hintOnPrimary: {
    color: colors.primaryMuted,
  },
});

export default StatTile;
