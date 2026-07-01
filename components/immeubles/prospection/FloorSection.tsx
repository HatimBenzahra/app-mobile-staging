import { Feather } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

import PorteTile from "@/components/immeubles/prospection/PorteTile";
import { getLieuTerms } from "@/components/immeubles/lieu-terms";
import type { Porte, TypeHabitat } from "@/types/api";

type FloorSectionProps = {
  etage: number;
  portes: Porte[];
  totalOnFloor?: number;
  onPorteTap: (porte: Porte) => void;
  isTablet?: boolean;
  isFocused?: boolean;
  typeHabitat?: TypeHabitat;
};

function FloorSectionImpl({
  etage,
  portes,
  totalOnFloor,
  onPorteTap,
  isTablet = false,
  isFocused = false,
  typeHabitat,
}: FloorSectionProps) {
  const tiles = useMemo(
    () =>
      portes.map((porte) => (
        <PorteTile
          key={porte.id}
          porte={porte}
          onPress={onPorteTap}
          isTablet={isTablet}
        />
      )),
    [portes, onPorteTap, isTablet],
  );

  if (portes.length === 0) return null;

  const terms = getLieuTerms(typeHabitat);
  const total = totalOnFloor ?? portes.length;
  const done = portes.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const isComplete = pct === 100;

  // MAISON / PAVILLON : pas de header de section avec compteur — uniquement la porte/tuile.
  if (terms.isMaison || terms.isPavillon) {
    return (
      <View style={[styles.section, isTablet && styles.sectionTablet]}>
        <View style={[styles.grid, isTablet && styles.gridTablet]}>
          {tiles}
        </View>
      </View>
    );
  }

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
                {terms.unitLabel} {etage}
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
                <Feather name="check" size={9} color={colors.successText} />

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
        {tiles}
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
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  headerCardTablet: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerCardFocused: {
    borderColor: colors.text,
    backgroundColor: colors.background,
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
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  etageBadgeTablet: {
    width: 46,
    height: 46,
    borderRadius: 14,
  },
  etageBadgeComplete: {
    backgroundColor: colors.successText,
  },
  etageBadgeText: {
    color: colors.textOnPrimary,
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
    color: colors.text,
    letterSpacing: -0.2,
  },
  titleTablet: {
    fontSize: 17,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: "600",
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  pct: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
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
    backgroundColor: colors.successSoft,
  },
  completeChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.successText,
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.text,
    borderRadius: 999,
  },
  progressFillComplete: {
    backgroundColor: colors.successText,
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
