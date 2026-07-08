import { memo, useRef } from "react";
import { Animated, Easing, Pressable, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { gradients } from "@/constants/theme";

type Props = {
  size?: number;
  /** If provided, the logo becomes pressable + plays a bounce animation. */
  onPress?: () => void;
  /** Play the press animation even without an onPress callback. Defaults to true when interactive. */
  interactive?: boolean;
  style?: ViewStyle;
};

function ProwinLogoInner({ size }: { size: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      accessibilityLabel="Pro-Win"
    >
      <Defs>
        <LinearGradient id="prowinLogoBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={gradients.brand[0]} />
          <Stop offset="1" stopColor={gradients.brand[1]} />
        </LinearGradient>
      </Defs>
      <Rect width={40} height={40} rx={10} fill="url(#prowinLogoBg)" />
      <Path
        d="M20 6C14.5 6 10 10.5 10 16C10 22.5 20 34 20 34C20 34 30 22.5 30 16C30 10.5 25.5 6 20 6ZM20 20C17.8 20 16 18.2 16 16C16 13.8 17.8 12 20 12C22.2 12 24 13.8 24 16C24 18.2 22.2 20 20 20Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function ProwinLogo({ size = 44, onPress, interactive, style }: Props) {
  const isInteractive = interactive ?? onPress != null;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  if (!isInteractive) {
    return <ProwinLogoInner size={size} />;
  }

  const animate = () => {
    scale.stopAnimation();
    rotate.stopAnimation();
    scale.setValue(1);
    rotate.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.86,
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 3,
          tension: 140,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(rotate, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 0,
          duration: 380,
          easing: Easing.elastic(1.4),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handlePress = () => {
    animate();
    onPress?.();
  };

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "14deg"],
  });

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }, style]}
      accessibilityRole="button"
      accessibilityLabel="Pro-Win logo"
    >
      <Animated.View
        style={{
          transform: [{ scale }, { rotate: rotateInterpolate }],
        }}
      >
        <ProwinLogoInner size={size} />
      </Animated.View>
    </Pressable>
  );
}

export default memo(ProwinLogo);
