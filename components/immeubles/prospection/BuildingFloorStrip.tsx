import { Feather } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "@/constants/theme";

import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
  getDisplayStatusKey,
} from "@/components/immeubles/prospection/status-display";
import { useToast } from "@/components/ui";
import type { Porte } from "@/types/api";

type FloorSummary = {
  etage: number;
  total: number;
  done: number;
  portes: Porte[];
  locked: boolean;
  active: boolean;
};

type BuildingFloorStripProps = {
  allPortes: Porte[];
  activeEtage?: number | null;
  onFloorTap?: (etage: number) => void;
  isTablet?: boolean;
  nbEtages?: number;
  nbPortesParEtage?: number;
};

function summarize(
  portes: Porte[],
  nbEtages?: number,
  nbPortesParEtage?: number,
): FloorSummary[] {
  const map = new Map<number, Porte[]>();
  for (const porte of portes) {
    const list = map.get(porte.etage);
    if (list) list.push(porte);
    else map.set(porte.etage, [porte]);
  }

  const etageRange =
    nbEtages && nbEtages > 0
      ? Array.from({ length: nbEtages }, (_, i) => nbEtages - i)
      : Array.from(map.keys()).sort((a, b) => b - a);

  const etagesArray: FloorSummary[] = etageRange.map((etage) => {
    const items = map.get(etage) ?? [];
    const sorted = [...items].sort((a, b) =>
      String(a.numero).localeCompare(String(b.numero), "fr", { numeric: true }),
    );
    const done = sorted.filter((p) => p.statut !== "NON_VISITE").length;
    const total =
      nbPortesParEtage && nbPortesParEtage > 0
        ? nbPortesParEtage
        : sorted.length;
    return { etage, total, done, portes: sorted, locked: false, active: false };
  });

  // Descending pass: first floor with remaining work is active, those below are locked.
  let activeFound = false;
  return etagesArray.map((summary) => {
    const hasRemainingWork = summary.done < summary.total;
    if (!activeFound && hasRemainingWork) {
      activeFound = true;
      return { ...summary, locked: false, active: true };
    }
    if (activeFound) {
      return { ...summary, locked: true, active: false };
    }
    return { ...summary, locked: false, active: false };
  });
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
  const isLocked = summary.locked;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        isTablet && styles.cardTablet,
        active && styles.cardActive,
        summary.active && styles.cardCurrentActive,
        isLocked && styles.cardLocked,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Étage ${summary.etage}, ${summary.done} sur ${summary.total} portes prospectées${isLocked ? ", verrouillé" : ""}`}
    >
      <View style={styles.cardHeader}>
        <Text
          style={[
            styles.etageNumber,
            active && styles.etageNumberActive,
            isTablet && styles.etageNumberTablet,
            isLocked && styles.etageNumberLocked,
          ]}
        >
          {summary.etage}
        </Text>
        {isLocked ? (
          <Feather name="lock" size={14} color={colors.textSubtle} />
        ) : isComplete ? (
          <View style={styles.completeBadge}>
            <Feather name="check" size={9} color={colors.textOnPrimary} />
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
                  borderColor: accent ?? colors.borderStrong,
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
          isLocked && styles.countTextLocked,
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
  nbEtages,
  nbPortesParEtage,
}: BuildingFloorStripProps) {
  const toast = useToast();

  const floors = useMemo(
    () => summarize(allPortes, nbEtages, nbPortesParEtage),
    [allPortes, nbEtages, nbPortesParEtage],
  );

  if (floors.length === 0) return null;

  const totalDone = floors.reduce((acc, f) => acc + f.done, 0);
  const totalAll = floors.reduce((acc, f) => acc + f.total, 0);
  const overallPct =
    totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);

  const activeFloor = floors.find((f) => f.active);
  const activeEtageNum = activeFloor?.etage ?? null;

  return (
    <View style={[styles.wrap, isTablet && styles.wrapTablet]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Feather name="layers" size={13} color={colors.text} />
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
            onPress={() => {
              if (floor.locked) {
                toast.show({
                  message: activeEtageNum
                    ? `Termine d'abord l'étage ${activeEtageNum}.`
                    : "Étage verrouillé.",
                  variant: "info",
                });
                return;
              }
              onFloorTap?.(floor.etage);
            }}
            isTablet={isTablet}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerPct: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
  },
  headerCount: {
    fontSize: 11,
    color: colors.textMuted,
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
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    gap: 8,
  },
  cardTablet: {
    width: 92,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  cardActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  cardCurrentActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cardLocked: {
    opacity: 0.4,
    backgroundColor: colors.surfaceMuted,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  etageNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  etageNumberTablet: {
    fontSize: 22,
  },
  etageNumberActive: {
    color: colors.textOnPrimary,
  },
  etageNumberLocked: {
    color: colors.textSubtle,
  },
  completeBadge: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: colors.success,
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
    color: colors.textStrong,
    fontVariant: ["tabular-nums"],
  },
  countTextActive: {
    color: colors.textOnPrimary,
  },
  countTextEmpty: {
    color: colors.textSubtle,
  },
  countTextLocked: {
    color: colors.textSubtle,
  },
});

export default memo(BuildingFloorStripImpl);
