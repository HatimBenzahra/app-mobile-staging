import { Feather } from "@expo/vector-icons";
import { memo, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

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
        <Feather name="clock" size={13} color="#0F172A" />
        <Text style={styles.chronoText}>{formatChrono(elapsedMs)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#EAECEF",
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
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  name: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  chrono: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chronoText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.4,
  },
});

export default memo(LiveSegmentHeaderImpl);
