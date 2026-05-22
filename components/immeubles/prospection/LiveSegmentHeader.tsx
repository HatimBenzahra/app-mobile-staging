import { Feather } from "@expo/vector-icons";
import { memo, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";


type LiveSegmentHeaderProps = {
  porteNumero: string;
  porteEtage: number;
  porteName?: string | null;
  startedAt: number;
  compact?: boolean;
};

function formatChrono(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
      <View style={styles.left}>
        <Text style={styles.eyebrow}>
          Étage {porteEtage} · Porte {porteNumero}
        </Text>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {porteName?.trim() || `Porte ${porteNumero}`}
        </Text>
      </View>
      <View style={styles.chrono}>
        <View style={styles.chronoLabelRow}>
          <Feather name="clock" size={11} color={colors.textMuted} />
          <Text style={styles.chronoLabel}>Chrono</Text>
        </View>
        <Text style={styles.chronoText}>{formatChrono(elapsedMs)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  containerCompact: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  name: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  chrono: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chronoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chronoLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  chronoText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.4,
  },
});

export default memo(LiveSegmentHeaderImpl);
