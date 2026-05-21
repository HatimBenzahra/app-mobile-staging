import { Feather } from "@expo/vector-icons";
import { StyleSheet, type StyleProp, View, type ViewStyle } from "react-native";
import { colors, radius } from "@/constants/theme";

export type IconBadgeTone =
  | "primary"
  | "primaryStrong"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "inverse";

export type IconBadgeSize = "sm" | "md" | "lg";

type Props = {
  icon: keyof typeof Feather.glyphMap;
  tone?: IconBadgeTone;
  size?: IconBadgeSize;
  style?: StyleProp<ViewStyle>;
};

const dims: Record<IconBadgeSize, { box: number; icon: number; radius: number }> =
  {
    sm: { box: 24, icon: 12, radius: radius.sm },
    md: { box: 34, icon: 16, radius: radius.md },
    lg: { box: 44, icon: 20, radius: radius.lg },
  };

function getToneStyle(tone: IconBadgeTone): {
  bg: string;
  fg: string;
} {
  switch (tone) {
    case "primaryStrong":
      return { bg: colors.primary, fg: colors.textOnPrimary };
    case "neutral":
      return { bg: colors.surfaceMuted, fg: colors.textMuted };
    case "success":
      return { bg: colors.successSoft, fg: colors.success };
    case "warning":
      return { bg: colors.warningSoft, fg: colors.warning };
    case "danger":
      return { bg: colors.dangerSoft, fg: colors.danger };
    case "info":
      return { bg: colors.infoSoft, fg: colors.info };
    case "inverse":
      return { bg: colors.whiteAlpha20, fg: colors.textOnPrimary };
    case "primary":
    default:
      return { bg: colors.primarySoft, fg: colors.primary };
  }
}

/**
 * Square rounded icon container. Replaces all bespoke icon-square
 * containers across the app (cardIcon, kpiIcon, sectionIcon, etc.).
 */
export function IconBadge({ icon, tone = "primary", size = "md", style }: Props) {
  const { box, icon: iconSize, radius: r } = dims[size];
  const { bg, fg } = getToneStyle(tone);
  return (
    <View
      style={[
        styles.base,
        { width: box, height: box, borderRadius: r, backgroundColor: bg },
        style,
      ]}
    >
      <Feather name={icon} size={iconSize} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default IconBadge;
