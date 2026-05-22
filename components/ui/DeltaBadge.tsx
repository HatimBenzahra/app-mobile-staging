import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import type { Delta, Trend } from "@/utils/stats";

type Props = {
  delta: Delta | null | undefined;
  /** Show "= stable" or hide when value is 0. Defaults to "show". */
  flatBehavior?: "show" | "hide";
  size?: "sm" | "md";
};

const trendColor: Record<Trend, { bg: string; fg: string; icon: keyof typeof Feather.glyphMap }> = {
  up: { bg: colors.successSoft, fg: colors.successText, icon: "arrow-up-right" },
  down: { bg: colors.dangerSoft, fg: colors.dangerText, icon: "arrow-down-right" },
  flat: { bg: colors.surfaceMuted, fg: colors.textMuted, icon: "minus" },
};

/**
 * Small pill that visualizes a metric delta vs previous period.
 * Pair with StatTile's `hint` prop or place freely next to a value.
 */
export function DeltaBadge({ delta, flatBehavior = "show", size = "sm" }: Props) {
  if (!delta) return null;
  if (delta.trend === "flat" && flatBehavior === "hide") return null;

  const t = trendColor[delta.trend];
  const iconSize = size === "sm" ? 10 : 12;
  const fontSizeValue = size === "sm" ? fontSize.xs : fontSize.sm;
  const padV = size === "sm" ? 1 : 2;
  const padH = size === "sm" ? spacing.xs + 2 : spacing.sm;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: t.bg,
          paddingVertical: padV,
          paddingHorizontal: padH,
        },
      ]}
    >
      <Feather name={t.icon} size={iconSize} color={t.fg} />
      <Text style={[styles.text, { color: t.fg, fontSize: fontSizeValue }]}>
        {delta.formatted}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: fontWeight.semibold,
  },
});

export default DeltaBadge;
