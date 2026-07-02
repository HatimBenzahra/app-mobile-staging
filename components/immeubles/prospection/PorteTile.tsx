import { Feather } from "@expo/vector-icons";
import { memo, useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
  getDisplayStatusKey,
} from "@/components/immeubles/prospection/status-display";
import type { Porte } from "@/types/api";

type PorteTileProps = {
  porte: Porte;
  onPress: (porte: Porte) => void;
  isTablet?: boolean;
  highlighted?: boolean;
};

function PorteTileImpl({ porte, onPress, isTablet = false, highlighted = false }: PorteTileProps) {
  const statusKey = getDisplayStatusKey(porte);
  const status = statusKey
    ? (STATUS_DISPLAY[statusKey] ?? DEFAULT_STATUS_OPTION)
    : DEFAULT_STATUS_OPTION;

  const scale = useSharedValue(1);
  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 80 });
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 140 });
  }, [scale]);

  // Pulse de mise en avant (redirection depuis l'agenda) : anneau bleu dont
  // l'opacité respire + léger scale de la tuile, tant que `highlighted` est vrai.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (highlighted) {
      pulse.value = 0;
      pulse.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
    return () => {
      cancelAnimation(pulse);
    };
  }, [highlighted, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value + pulse.value * 0.03 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.65,
  }));

  const handlePress = useCallback(() => onPress(porte), [onPress, porte]);

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.tile, isTablet && styles.tileTablet]}
        accessibilityRole="button"
        accessibilityLabel={`Porte ${porte.numero}, statut ${status.label}`}
      >
        <View style={styles.top}>
          <View style={styles.numberWrap}>
            <Text
              style={[styles.number, isTablet && styles.numberTablet]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {porte.numero}
            </Text>
            {porte.nomPersonnalise ? (
              <Text style={styles.subName} numberOfLines={1} ellipsizeMode="tail">
                {porte.nomPersonnalise}
              </Text>
            ) : null}
          </View>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: `${status.accent}1A`,
                borderColor: `${status.accent}33`,
              },
            ]}
          >
            <Feather name={status.icon} size={14} color={status.accent} />
          </View>
        </View>

        <View style={styles.bottom}>
          <Text
            style={[styles.statusLabel, { color: status.accent }]}
            numberOfLines={1}
          >
            {status.label}
          </Text>
          {porte.commentaire ? (
            <View style={styles.commentChip}>
              <Feather name="message-circle" size={9} color={colors.textMuted} />
            </View>
          ) : null}
        </View>

        <View style={[styles.accentBar, { backgroundColor: status.accent }]} />

        {highlighted ? (
          <Animated.View pointerEvents="none" style={[styles.highlightRing, ringStyle]} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  tile: {
    position: "relative",
    padding: 14,
    paddingBottom: 16,
    minHeight: 96,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    justifyContent: "space-between",
    gap: 10,
  },
  tileTablet: {
    padding: 16,
    paddingBottom: 18,
    minHeight: 110,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  numberWrap: {
    flex: 1,
    minWidth: 0,
  },
  number: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  numberTablet: {
    fontSize: 24,
  },
  subName: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSubtle,
    fontWeight: "600",
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.1,
    flex: 1,
  },
  commentChip: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  accentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  highlightRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
});

export default memo(PorteTileImpl);
