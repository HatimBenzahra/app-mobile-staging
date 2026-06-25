import { Feather } from "@expo/vector-icons";
import { memo, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

import BuildingFloorStrip from "@/components/immeubles/prospection/BuildingFloorStrip";
import FloorSection from "@/components/immeubles/prospection/FloorSection";
import ProspectionJourney from "@/components/immeubles/prospection/ProspectionJourney";
import { getLieuTerms } from "@/components/immeubles/lieu-terms";
import type { Porte, TypeHabitat } from "@/types/api";

type ProspectedDoorsListProps = {
  portes: Porte[];
  allPortes?: Porte[];
  onPorteTap: (porte: Porte) => void;
  isTablet?: boolean;
  hasFilters?: boolean;
  nbEtages?: number;
  nbPortesParEtage?: number;
  typeHabitat?: TypeHabitat;
  nbMaisonsPrevu?: number | null;
};

function groupByEtage(portes: Porte[]): Array<{ etage: number; portes: Porte[] }> {
  const map = new Map<number, Porte[]>();
  for (const porte of portes) {
    const list = map.get(porte.etage);
    if (list) list.push(porte);
    else map.set(porte.etage, [porte]);
  }
  return Array.from(map.entries())
    .map(([etage, items]) => ({ etage, portes: items }))
    .sort((a, b) => b.etage - a.etage);
}

function ProspectedDoorsListImpl({
  portes,
  allPortes,
  onPorteTap,
  isTablet = false,
  hasFilters = false,
  nbEtages,
  nbPortesParEtage,
  typeHabitat,
}: ProspectedDoorsListProps) {
  const terms = getLieuTerms(typeHabitat);
  const sections = useMemo(() => groupByEtage(portes), [portes]);
  const totalsPerFloor = useMemo(() => {
    const m = new Map<number, number>();
    const portesArr = allPortes ?? portes;
    for (const p of portesArr) {
      m.set(p.etage, (m.get(p.etage) ?? 0) + 1);
    }
    if (nbPortesParEtage && nbPortesParEtage > 0 && nbEtages && nbEtages > 0) {
      for (let i = 1; i <= nbEtages; i += 1) {
        m.set(i, nbPortesParEtage);
      }
    }
    return m;
  }, [allPortes, portes, nbEtages, nbPortesParEtage]);
  const stripPortes = allPortes ?? portes;
  const [focusedEtage, setFocusedEtage] = useState<number | null>(null);

  const hasAnyBuildingData =
    stripPortes.length > 0 || (nbEtages !== undefined && nbEtages > 0);
  const isEmpty = sections.length === 0;

  return (
    <View style={[styles.root, isTablet && styles.rootTablet]}>
      <ProspectionJourney
        portes={portes}
        onStepTap={onPorteTap}
        isTablet={isTablet}
      />

      {terms.showFloors && hasAnyBuildingData ? (
        <BuildingFloorStrip
          allPortes={stripPortes}
          activeEtage={focusedEtage}
          onFloorTap={(etage) =>
            setFocusedEtage((prev) => (prev === etage ? null : etage))
          }
          isTablet={isTablet}
          nbEtages={nbEtages}
          nbPortesParEtage={nbPortesParEtage}
          typeHabitat={typeHabitat}
        />
      ) : null}

      {isEmpty ? (
        <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
          <View style={styles.emptyIconBox}>
            <Feather
              name={hasFilters ? "filter" : "home"}
              size={22}
              color={colors.text}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {hasFilters ? "Aucune porte trouvée" : "Prêt à prospecter ?"}
          </Text>
          <Text style={styles.emptyText}>
            {hasFilters
              ? "Aucun résultat avec ce filtre. Essaie un autre statut."
              : terms.isMaison
                ? "Démarre la prospection de ce foyer via le bouton ci-dessous."
                : "Tape le bouton « + » pour ajouter ta première porte et démarrer la prospection."}
          </Text>
          {!hasFilters ? (
            <View style={styles.emptyHintPill}>
              <Feather name="arrow-down-right" size={13} color={colors.textSubtle} />
              <Text style={styles.emptyHintText}>Nouvelle prospection</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.list, isTablet && styles.listTablet]}>
          {sections.map((section) => (
            <FloorSection
              key={section.etage}
              etage={section.etage}
              portes={section.portes}
              totalOnFloor={totalsPerFloor.get(section.etage)}
              onPorteTap={onPorteTap}
              isTablet={isTablet}
              isFocused={focusedEtage === section.etage}
              typeHabitat={typeHabitat}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 18,
  },
  rootTablet: {
    gap: 22,
  },
  list: {
    gap: 20,
  },
  listTablet: {
    gap: 24,
  },
  emptyCard: {
    width: "100%",
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 10,
  },
  emptyCardTablet: {
    paddingVertical: 40,
    paddingHorizontal: 36,
    gap: 14,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 320,
  },
  emptyHintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyHintText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});

export default memo(ProspectedDoorsListImpl);
