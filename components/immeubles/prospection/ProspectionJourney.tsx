import { Feather } from "@expo/vector-icons";
import { memo, useEffect, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
  getDisplayStatusKey,
} from "@/components/immeubles/prospection/status-display";
import type { Porte } from "@/types/api";

const MAX_STEPS = 8;

type ProspectionJourneyProps = {
  portes: Porte[];
  onStepTap?: (porte: Porte) => void;
  isTablet?: boolean;
};

function sortRecent(portes: Porte[]): Porte[] {
  return [...portes]
    .filter((p) => p.statut !== "NON_VISITE" && p.derniereVisite)
    .sort((a, b) => {
      const aTime = new Date(a.derniereVisite ?? 0).getTime();
      const bTime = new Date(b.derniereVisite ?? 0).getTime();
      return bTime - aTime;
    });
}

function PulseRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(0.45, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [scale, opacity]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return <Animated.View style={[styles.pulseRing, style]} />;
}

function StepDot({
  porte,
  isLatest,
  onPress,
  isTablet,
}: {
  porte: Porte;
  isLatest: boolean;
  onPress: () => void;
  isTablet: boolean;
}) {
  const key = getDisplayStatusKey(porte);
  const status = key
    ? (STATUS_DISPLAY[key] ?? DEFAULT_STATUS_OPTION)
    : DEFAULT_STATUS_OPTION;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.step, isTablet && styles.stepTablet]}
      accessibilityRole="button"
      accessibilityLabel={`Porte ${porte.numero}, ${status.label}`}
    >
      <View style={styles.stepIconWrap}>
        {isLatest ? <PulseRing /> : null}
        <View
          style={[
            styles.stepIcon,
            { backgroundColor: status.accent },
            isLatest && styles.stepIconLatest,
          ]}
        >
          <Feather name={status.icon} size={isLatest ? 13 : 12} color="#FFFFFF" />
        </View>
      </View>
      <Text
        style={[styles.stepNumber, isLatest && styles.stepNumberLatest]}
        numberOfLines={1}
      >
        {porte.numero}
      </Text>
    </Pressable>
  );
}

function ProspectionJourneyImpl({
  portes,
  onStepTap,
  isTablet = false,
}: ProspectionJourneyProps) {
  const recent = useMemo(
    () => sortRecent(portes).slice(0, MAX_STEPS),
    [portes],
  );

  if (recent.length === 0) return null;

  const latest = recent[0];
  const latestStatusKey = latest ? getDisplayStatusKey(latest) : null;
  const latestStatus = latestStatusKey
    ? (STATUS_DISPLAY[latestStatusKey] ?? DEFAULT_STATUS_OPTION)
    : null;

  return (
    <View style={[styles.wrap, isTablet && styles.wrapTablet]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Feather name="map" size={13} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Mon parcours</Text>
            {latest && latestStatus ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                Dernière : porte {latest.numero}{" "}
                <Text style={{ color: latestStatus.accent, fontWeight: "700" }}>
                  · {latestStatus.label}
                </Text>
              </Text>
            ) : (
              <Text style={styles.headerSubtitle}>Aucune action récente</Text>
            )}
          </View>
        </View>
        <View style={styles.countChip}>
          <Text style={styles.countChipText}>{recent.length}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.trail, isTablet && styles.trailTablet]}
      >
        {recent.map((porte, idx) => (
          <View
            key={porte.id}
            style={styles.stepGroup}
            accessibilityElementsHidden={false}
          >
            <StepDot
              porte={porte}
              isLatest={idx === 0}
              onPress={() => onStepTap?.(porte)}
              isTablet={isTablet}
            />
            {idx < recent.length - 1 ? (
              <View style={styles.connector} />
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#0B1220",
    borderRadius: 22,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12,
    overflow: "hidden",
  },
  wrapTablet: {
    paddingTop: 18,
    paddingBottom: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerSubtitle: {
    color: "#94A3B8",
    fontSize: 11.5,
    marginTop: 2,
  },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  countChipText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.2,
  },
  trail: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 4,
    alignItems: "center",
  },
  trailTablet: {
    paddingHorizontal: 18,
  },
  stepGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  step: {
    alignItems: "center",
    gap: 6,
    width: 52,
  },
  stepTablet: {
    width: 58,
  },
  stepIconWrap: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIcon: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
  },
  stepIconLatest: {
    width: 30,
    height: 30,
    borderColor: "#FFFFFF",
  },
  pulseRing: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  stepNumber: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.2,
  },
  stepNumberLatest: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  connector: {
    width: 18,
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginHorizontal: 1,
    alignSelf: "center",
  },
});

export default memo(ProspectionJourneyImpl);
