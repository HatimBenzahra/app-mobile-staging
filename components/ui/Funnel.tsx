import { StyleSheet, Text, View } from "react-native";
import {
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from "@/constants/theme";
import type { FunnelStep } from "@/utils/stats";

type Props = {
  steps: FunnelStep[];
};

/**
 * Horizontal funnel — each step is a bar whose width is proportional
 * to its value relative to the top step. Conversion % is displayed
 * between consecutive steps.
 */
export function Funnel({ steps }: Props) {
  if (steps.length === 0) return null;
  const top = Math.max(steps[0]?.value ?? 0, 1);

  return (
    <View style={styles.container}>
      {steps.map((step, idx) => {
        const ratio = Math.max(step.value / top, 0.02);
        return (
          <View key={step.label}>
            {idx > 0 && step.conversionFromPrev !== null ? (
              <View style={styles.conversionRow}>
                <View style={styles.connector} />
                <Text style={styles.conversionLabel}>
                  {Math.round(step.conversionFromPrev)}% de conversion
                </Text>
                <View style={styles.connector} />
              </View>
            ) : null}
            <View style={styles.row}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${ratio * 100}%`,
                      backgroundColor: STEP_COLORS[idx % STEP_COLORS.length],
                    },
                  ]}
                />
                <Text style={styles.valueText}>{step.value}</Text>
              </View>
            </View>
            <Text style={styles.stepLabel}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const STEP_COLORS = [colors.primary, colors.info, colors.success];

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  barTrack: {
    flex: 1,
    height: 40,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    overflow: "hidden",
    justifyContent: "center",
  },
  barFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.md,
  },
  valueText: {
    paddingHorizontal: spacing.md,
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
    zIndex: 1,
  },
  stepLabel: {
    marginTop: 2,
    marginBottom: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  conversionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  connector: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  conversionLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
  },
});

export default Funnel;
