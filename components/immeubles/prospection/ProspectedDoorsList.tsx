import { Feather } from "@expo/vector-icons";
import { memo, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import BuildingFloorStrip from "@/components/immeubles/prospection/BuildingFloorStrip";
import FloorSection from "@/components/immeubles/prospection/FloorSection";
import ProspectionJourney from "@/components/immeubles/prospection/ProspectionJourney";
import type { Porte } from "@/types/api";

type ProspectedDoorsListProps = {
  portes: Porte[];
  allPortes?: Porte[];
  onPorteTap: (porte: Porte) => void;
  isTablet?: boolean;
  hasFilters?: boolean;
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

function countByEtage(portes: Porte[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const porte of portes) {
    map.set(porte.etage, (map.get(porte.etage) ?? 0) + 1);
  }
  return map;
}

function ProspectedDoorsListImpl({
  portes,
  allPortes,
  onPorteTap,
  isTablet = false,
  hasFilters = false,
}: ProspectedDoorsListProps) {
  const sections = useMemo(() => groupByEtage(portes), [portes]);
  const totalsPerFloor = useMemo(
    () => countByEtage(allPortes ?? portes),
    [allPortes, portes],
  );
  const stripPortes = allPortes ?? portes;
  const [focusedEtage, setFocusedEtage] = useState<number | null>(null);

  const hasAnyBuildingData = stripPortes.length > 0;
  const isEmpty = sections.length === 0;

  return (
    <View style={[styles.root, isTablet && styles.rootTablet]}>
      <ProspectionJourney
        portes={portes}
        onStepTap={onPorteTap}
        isTablet={isTablet}
      />

      {hasAnyBuildingData ? (
        <BuildingFloorStrip
          allPortes={stripPortes}
          activeEtage={focusedEtage}
          onFloorTap={(etage) =>
            setFocusedEtage((prev) => (prev === etage ? null : etage))
          }
          isTablet={isTablet}
        />
      ) : null}

      {isEmpty ? (
        <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
          <View style={styles.emptyIconBox}>
            <Feather
              name={hasFilters ? "filter" : "mic"}
              size={22}
              color="#0F172A"
            />
          </View>
          <Text style={styles.emptyTitle}>
            {hasFilters ? "Aucune porte trouvée" : "Prêt à prospecter ?"}
          </Text>
          <Text style={styles.emptyText}>
            {hasFilters
              ? "Aucun résultat avec ce filtre. Essaie un autre statut."
              : "Tape le bouton « + » pour démarrer ta première porte. L'audio sera synchronisé sur la conversation."}
          </Text>
          {!hasFilters ? (
            <View style={styles.emptyHintPill}>
              <Feather name="arrow-down-right" size={13} color="#94A3B8" />
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EAECEF",
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
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 13,
    color: "#64748B",
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
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyHintText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});

export default memo(ProspectedDoorsListImpl);
