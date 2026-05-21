import { Feather } from "@expo/vector-icons";
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  type StyleProp,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";

export type ChipTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

type ToneStyle = { bg: string; border: string; text: string; icon: string };

const toneStyles: Record<ChipTone, ToneStyle> = {
  neutral: {
    bg: colors.surfaceMuted,
    border: colors.border,
    text: colors.textStrong,
    icon: colors.textMuted,
  },
  primary: {
    bg: colors.primarySoft,
    border: colors.primaryMuted,
    text: colors.primary,
    icon: colors.primary,
  },
  success: {
    bg: colors.successSoft,
    border: colors.successSoft,
    text: colors.successText,
    icon: colors.success,
  },
  warning: {
    bg: colors.warningSoft,
    border: colors.warningSoft,
    text: colors.warningText,
    icon: colors.warning,
  },
  danger: {
    bg: colors.dangerSoft,
    border: colors.dangerSoft,
    text: colors.dangerText,
    icon: colors.danger,
  },
  info: {
    bg: colors.infoSoft,
    border: colors.infoSoft,
    text: colors.info,
    icon: colors.info,
  },
};

type Props = {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  /** When true: brand-primary filled chip (selected/active state). */
  selected?: boolean;
  /** Semantic tone when not selected (default "neutral"). */
  tone?: ChipTone;
  /** Custom accent for icon when not selected. Overrides tone.icon. */
  accent?: string;
  style?: StyleProp<ViewStyle>;
} & Omit<PressableProps, "style" | "children">;

/**
 * Shared filter / segment / status chip.
 * - `selected` → brand-primary filled (used as active filter).
 * - `tone` → semantic colored chip (used as status badge).
 * - Default (no selected, no tone) → neutral white chip.
 */
export function Chip({
  label,
  icon,
  selected,
  tone = "neutral",
  accent,
  style,
  onPress,
  ...rest
}: Props) {
  const t = toneStyles[tone];
  const iconColor = selected ? colors.textOnPrimary : accent ?? t.icon;
  const containerStyle: ViewStyle = selected
    ? { backgroundColor: colors.primary, borderColor: colors.primary }
    : { backgroundColor: t.bg, borderColor: t.border };
  const labelStyle = selected
    ? { color: colors.textOnPrimary }
    : { color: t.text };

  const Content = (
    <>
      {icon ? <Feather name={icon} size={12} color={iconColor} /> : null}
      <Text style={[styles.label, labelStyle]}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={[styles.base, containerStyle, style]}
        onPress={onPress}
        {...rest}
      >
        {Content}
      </Pressable>
    );
  }
  return <View style={[styles.base, containerStyle, style]}>{Content}</View>;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});

export default Chip;
