import { Feather } from "@expo/vector-icons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import PorteTile from "@/components/immeubles/prospection/PorteTile";
import type { Porte } from "@/types/api";

type FloorSectionProps = {
  etage: number;
  portes: Porte[];
  totalOnFloor?: number;
  onPorteTap: (porte: Porte) => void;
  isTablet?: boolean;
  isFocused?: boolean;
};

function FloorSectionImpl({
  etage,
  portes,
  totalOnFloor,
  onPorteTap,
  isTablet = false,
  isFocused = false,
}: FloorSectionProps) {
  if (portes.length === 0) return null;

  const total = totalOnFloor ?? portes.length;
  const done = portes.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const isComplete = pct === 100;

  return (
    <View style={[styles.section, isTablet && styles.sectionTablet]}>
      <View
        style={[
          styles.headerCard,
          isFocused && styles.headerCardFocused,
          isTablet && styles.headerCardTablet,
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.etageBadge,
                isTablet && styles.etageBadgeTablet,
                isComplete && styles.etageBadgeComplete,
              ]}
            >
              <Text
                style={[
                  styles.etageBadgeText,
                  isTablet && styles.etageBadgeTextTablet,
                ]}
              >
                {etage}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, isTablet && styles.titleTablet]}>
                Étage {etage}
              </Text>
              <Text style={styles.subtitle}>
                {done} prospecté{done > 1 ? "es" : "e"} sur {total}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.pct, isTablet && styles.pctTablet]}>
              {pct}%
            </Text>
            {isComplete ? (
              <View style={styles.completeChip}>
                <Feather name="check" size={9} color="#047857" />
                <Text style={styles.completeChipText}>Complet</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct}%` },
              isComplete && styles.progressFillComplete,
            ]}
          />
        </View>
      </View>

      <View style={[styles.grid, isTablet && styles.gridTablet]}>
        {portes.map((porte) => (
          <PorteTile
            key={porte.id}
            porte={porte}
            onPress={onPorteTap}
            isTablet={isTablet}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTablet: {
    gap: 16,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#EAECEF",
    gap: 10,
  },
  headerCardTablet: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerCardFocused: {
    borderColor: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  etageBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  etageBadgeTablet: {
    width: 46,
    height: 46,
    borderRadius: 14,
  },
  etageBadgeComplete: {
    backgroundColor: "#047857",
  },
  etageBadgeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  etageBadgeTextTablet: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  titleTablet: {
    fontSize: 17,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  pct: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
  },
  pctTablet: {
    fontSize: 19,
  },
  completeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#D1FAE5",
  },
  completeChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#047857",
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 999,
  },
  progressFillComplete: {
    backgroundColor: "#047857",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridTablet: {
    gap: 14,
  },
});

export default memo(FloorSectionImpl);
