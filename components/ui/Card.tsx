import { type ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  type StyleProp,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { colors, radius, shadows, spacing } from "@/constants/theme";

export type CardVariant = "elevated" | "outlined" | "filled" | "primary";
export type CardPadding = "none" | "sm" | "md" | "lg";

type BaseProps = {
  variant?: CardVariant;
  padding?: CardPadding;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  sm: spacing.md,
  md: spacing.lg,
  lg: spacing.xl,
};

function getVariantStyle(variant: CardVariant): ViewStyle {
  switch (variant) {
    case "outlined":
      return styles.outlined;
    case "filled":
      return styles.filled;
    case "primary":
      return styles.primary;
    case "elevated":
    default:
      return styles.elevated;
  }
}

/**
 * Shared Card primitive. Elevated by default to match the app's
 * "premium" surface look. Use `variant="outlined"` for dense lists,
 * `variant="filled"` for muted containers, `variant="primary"` for
 * brand-colored hero cards.
 */
export function Card({
  variant = "elevated",
  padding = "md",
  children,
  style,
  ...rest
}: BaseProps & ViewProps) {
  return (
    <View
      style={[
        styles.base,
        { padding: paddingMap[padding] },
        getVariantStyle(variant),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

type PressableCardProps = BaseProps & Omit<PressableProps, "style">;

export function PressableCard({
  variant = "elevated",
  padding = "md",
  children,
  style,
  ...rest
}: PressableCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        { padding: paddingMap[padding] },
        getVariantStyle(variant),
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  elevated: {
    backgroundColor: colors.surface,
    ...shadows.lg,
  },
  outlined: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filled: {
    backgroundColor: colors.surfaceMuted,
  },
  primary: {
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  pressed: {
    opacity: 0.92,
  },
});

export default Card;
