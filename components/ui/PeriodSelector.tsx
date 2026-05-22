import { ScrollView, StyleSheet } from "react-native";
import { spacing } from "@/constants/theme";
import { Chip } from "./Chip";
import type { StatsPeriod } from "@/utils/stats";

type Props = {
  value: StatsPeriod;
  onChange: (period: StatsPeriod) => void;
  /** Show the "Personnalisé" chip. Defaults to true. */
  showCustom?: boolean;
  /** When the user taps "Personnalisé". Required if showCustom is true. */
  onRequestCustom?: () => void;
};

type Option = { value: StatsPeriod; label: string };

const BASE_OPTIONS: Option[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
];

/**
 * Horizontal scrollable segment of period chips. Used at the top of
 * the stats page to scope all aggregations.
 */
export function PeriodSelector({
  value,
  onChange,
  showCustom = true,
  onRequestCustom,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {BASE_OPTIONS.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          selected={value === opt.value}
          tone="neutral"
          onPress={() => onChange(opt.value)}
        />
      ))}
      {showCustom ? (
        <Chip
          label="Personnalisé"
          icon="calendar"
          selected={value === "custom"}
          tone="neutral"
          onPress={() => {
            onRequestCustom?.();
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
});

export default PeriodSelector;
