import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { tierStyle } from "@/utils/business/rankTiers";

type Props = {
  tierKey?: string | null;
  /** Label serveur (rankTierLabel) ; sinon on retombe sur le label du mapping. */
  label?: string | null;
  size?: "sm" | "md";
};

/** Pastille de tier (Bronze → Legend) colorée selon le tier serveur. */
export function RankTierBadge({ tierKey, label, size = "md" }: Props) {
  const t = tierStyle(tierKey);
  const iconSize = size === "sm" ? 12 : 14;
  return (
    <View style={[styles.base, { backgroundColor: t.bg }]}>
      <Feather name={t.icon} size={iconSize} color={t.color} />
      <Text style={[styles.label, { color: t.color, fontSize: size === "sm" ? fontSize.xs : fontSize.sm }]}>
        {label ?? t.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  label: {
    fontWeight: fontWeight.bold,
  },
});

export default RankTierBadge;
