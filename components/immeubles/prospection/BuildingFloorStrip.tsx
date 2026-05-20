import { Feather } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
  getDisplayStatusKey,
} from "@/components/immeubles/prospection/status-display";
import type { Porte } from "@/types/api";

type FloorSummary = {
  etage: number;
  total: number;
  done: number;
  portes: Porte[];
};

type BuildingFloorStripProps = {
  allPortes: Porte[];
  activeEtage?: number | null;
  onFloorTap?: (etage: number) => void;
  isTablet?: boolean;
};

function summarize(portes: Porte[]): FloorSummary[] {
  const map = new Map<number, Porte[]>();
  for (const porte of portes) {
    const list = map.get(porte.etage);
    if (list) list.push(porte);
    else map.set(porte.etage, [porte]);
  }
  return Array.from(map.entries())
    .map(([etage, items]) => {
      const sorted = [...items].sort((a, b) =>
        String(a.numero).localeCompare(String(b.numero), "fr", {
          numeric: true,
        }),
      );
      const done = sorted.filter((p) => p.statut !== "NON_VISITE").length;
      return { etage, total: sorted.length, done, portes: sorted };
    })
    .sort((a, b) => b.etage - a.etage);
}

function FloorCard({
  summary,
  active,
  onPress,
  isTablet,
}: {
  summary: FloorSummary;
  active: boolean;
  onPress: () => void;
  isTablet: boolean;
}) {
  const ratio = summary.total === 0 ? 0 : summary.done / summary.total;
  const isComplete = ratio === 1;
  const isEmpty = summary.done === 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        isTablet && styles.cardTablet,
        active && styles.cardActive,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Étage ${summary.etage}, ${summary.done} sur ${summary.total} portes prospectées`}
    >
      <View style={styles.cardHeader}>
        <Text
          style={[
            styles.etageNumber,
            active && styles.etageNumberActive,
            isTablet && styles.etageNumberTablet,
          ]}
        >
          {summary.etage}
        </Text>
        {isComplete ? (
          <View style={styles.completeBadge}>
            <Feather name="check" size={9} color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      <View style={styles.dotsRow}>
        {summary.portes.map((porte) => {
          const key = getDisplayStatusKey(porte);
          const accent = key
            ? (STATUS_DISPLAY[key]?.accent ?? DEFAULT_STATUS_OPTION.accent)
            : null;
          return (
            <View
              key={porte.id}
              style={[
                styles.dot,
                isTablet && styles.dotTablet,
                {
                  backgroundColor: accent ?? "transparent",
                  borderColor: accent ?? "#CBD5E1",
                  borderWidth: accent ? 0 : 1.2,
                },
              ]}
            />
          );
        })}
      </View>

      <Text
        style={[
          styles.countText,
          active && styles.countTextActive,
          isEmpty && styles.countTextEmpty,
        ]}
      >
        {summary.done}/{summary.total}
      </Text>
    </Pressable>
  );
}

function BuildingFloorStripImpl({
  allPortes,
  activeEtage = null,
  onFloorTap,
  isTablet = false,
}: BuildingFloorStripProps) {
  const floors = useMemo(() => summarize(allPortes), [allPortes]);

  if (floors.length === 0) return null;

  const totalDone = floors.reduce((acc, f) => acc + f.done, 0);
  const totalAll = floors.reduce((acc, f) => acc + f.total, 0);
  const overallPct =
    totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);

  return (
    <View style={[styles.wrap, isTablet && styles.wrapTablet]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Feather name="layers" size={13} color="#0F172A" />
          </View>
          <Text style={styles.headerTitle}>Cartographie</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerPct}>{overallPct}%</Text>
          <Text style={styles.headerCount}>
            {totalDone} / {totalAll}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.strip,
          isTablet && styles.stripTablet,
        ]}
      >
        {floors.map((floor) => (
          <FloorCard
            key={floor.etage}
            summary={floor}
            active={activeEtage === floor.etage}
            onPress={() => onFloorTap?.(floor.etage)}
            isTablet={isTablet}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "#EAECEF",
    gap: 12,
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
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerPct: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
  },
  headerCount: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  strip: {
    paddingHorizontal: 14,
    gap: 10,
  },
  stripTablet: {
    paddingHorizontal: 18,
    gap: 12,
  },
  card: {
    width: 78,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#FAFAF7",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 8,
  },
  cardTablet: {
    width: 92,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  cardActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  etageNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  etageNumberTablet: {
    fontSize: 22,
  },
  etageNumberActive: {
    color: "#FFFFFF",
  },
  completeBadge: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 3,
    minHeight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  dotTablet: {
    width: 7,
    height: 7,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    fontVariant: ["tabular-nums"],
  },
  countTextActive: {
    color: "#FFFFFF",
  },
  countTextEmpty: {
    color: "#94A3B8",
  },
});

export default memo(BuildingFloorStripImpl);
