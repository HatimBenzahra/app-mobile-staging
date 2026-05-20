import { Feather } from "@expo/vector-icons";
import { memo, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type LiveSegmentHeaderProps = {
  porteNumero: string;
  porteEtage: number;
  porteName?: string | null;
  startedAt: number;
  compact?: boolean;
};

const BAR_COUNT = 9;
const BAR_HEIGHTS = [0.32, 0.65, 0.45, 0.85, 1, 0.78, 0.5, 0.7, 0.38];

function formatChrono(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function PulseDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.9, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) }),
        withTiming(0.45, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [scale, opacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseRing, ringStyle]} />
      <View style={styles.pulseCore} />
    </View>
  );
}

function WaveBar({ baseHeight, index }: { baseHeight: number; index: number }) {
  const h = useSharedValue(baseHeight);

  useEffect(() => {
    const animate = () => {
      const peak = 0.45 + Math.random() * 0.55;
      const dur = 320 + Math.random() * 220;
      h.value = withRepeat(
        withSequence(
          withTiming(peak, {
            duration: dur,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(0.25 + Math.random() * 0.25, {
            duration: dur,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        true,
      );
    };
    const t = setTimeout(animate, index * 55);
    return () => clearTimeout(t);
  }, [h, index]);

  const style = useAnimatedStyle(() => ({
    height: `${Math.min(100, Math.max(12, h.value * 100))}%`,
  }));

  return <Animated.View style={[styles.waveBar, style]} />;
}

function Waveform() {
  return (
    <View style={styles.waveform}>
      {BAR_HEIGHTS.slice(0, BAR_COUNT).map((h, i) => (
        <WaveBar key={i} baseHeight={h} index={i} />
      ))}
    </View>
  );
}

function LiveSegmentHeaderImpl({
  porteNumero,
  porteEtage,
  porteName,
  startedAt,
  compact = false,
}: LiveSegmentHeaderProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedMs = now - startedAt;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.topRow}>
        <View style={styles.recBadge}>
          <PulseDot />
          <Text style={styles.recLabel}>EN COURS</Text>
        </View>
        <View style={styles.chronoWrap}>
          <Feather name="clock" size={11} color="#CBD5E1" />
          <Text style={styles.chronoText}>{formatChrono(elapsedMs)}</Text>
        </View>
      </View>

      <View style={styles.identityRow}>
        <View style={styles.identityLeft}>
          <Text style={styles.etageLabel}>
            Étage {porteEtage} · porte {porteNumero}
          </Text>
          <Text
            style={styles.nameText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {porteName?.trim() || `Porte ${porteNumero}`}
          </Text>
        </View>
        <Waveform />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0B1220",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    overflow: "hidden",
    gap: 14,
  },
  containerCompact: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 4,
  },
  recLabel: {
    color: "#FCA5A5",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  chronoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chronoText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.4,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  identityLeft: {
    flex: 1,
    gap: 4,
  },
  etageLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  nameText: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  pulseWrap: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EF4444",
  },
  pulseCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  waveform: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 32,
    width: 88,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: "#EF4444",
  },
});

export default memo(LiveSegmentHeaderImpl);
