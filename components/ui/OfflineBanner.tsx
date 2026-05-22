import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
} from "@/constants/theme";

/**
 * Slim banner that slides down from the top when the device loses
 * connectivity. Mount once in the app shell.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const handleChange = (state: NetInfoState) => {
      const isOffline =
        state.isConnected === false ||
        (state.isInternetReachable === false && state.isConnected !== null);
      setOffline(isOffline);
    };
    const unsubscribe = NetInfo.addEventListener(handleChange);
    void NetInfo.fetch().then(handleChange);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (offline) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -60,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [offline, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        {
          paddingTop: insets.top + spacing.xs,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Feather name="wifi-off" size={14} color={colors.textOnPrimary} />
      <Text style={styles.label}>Connexion perdue — mode hors ligne</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.danger,
    paddingBottom: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    zIndex: 9999,
    elevation: 12,
  },
  label: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});

export default OfflineBanner;
