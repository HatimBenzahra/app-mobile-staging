import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import {
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from "@/constants/theme";
import { Card } from "./Card";
import { IconBadge } from "./IconBadge";

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * Standard error placeholder shown when a data hook returns an error.
 * Used in place of empty list content or loading spinners.
 */
export function ErrorState({
  title = "Une erreur est survenue",
  message,
  onRetry,
  retryLabel = "Réessayer",
}: Props) {
  return (
    <Card variant="outlined" padding="lg" style={styles.container}>
      <IconBadge icon="alert-triangle" tone="danger" size="lg" />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
          accessibilityRole="button"
        >
          <Feather name="refresh-cw" size={14} color={colors.textOnPrimary} />
          <Text style={styles.retryLabel}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: "center",
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryLabel: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});

export default ErrorState;
