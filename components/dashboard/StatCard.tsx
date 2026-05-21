import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, fontSize, fontWeight, spacing } from "@/constants/theme";
import { Card, IconBadge } from "@/components/ui";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
};

export default function StatCard({ title, value, icon, style }: StatCardProps) {
  return (
    <Card variant="outlined" padding="sm" style={style}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <IconBadge icon={icon} tone="primary" size="sm" />
      </View>
      <Text style={styles.value}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  value: {
    marginTop: spacing.xs + 2,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
