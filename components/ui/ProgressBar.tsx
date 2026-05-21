import { StyleSheet, type StyleProp, View, type ViewStyle } from "react-native";
import { colors, radius } from "@/constants/theme";

type Props = {
  /** 0-100 */
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Linear progress bar used across rank progression, immeuble cards,
 * and any "% complete" surface. Single shared implementation.
 */
export function ProgressBar({
  value,
  color = colors.primary,
  trackColor = colors.surfaceMuted,
  height = 8,
  style,
}: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
    borderRadius: radius.pill,
  },
  fill: {
    height: "100%",
  },
});

export default ProgressBar;
