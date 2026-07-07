import { CarteTerrainMap } from "@/components/carte-terrain/CarteTerrainMap";
import { zoneBounds } from "@/components/carte-terrain/geo-hull";
import { ZoneContour } from "@/components/carte-terrain/ZoneContour";
import {
  Card,
  Chip,
  type ChipTone,
  ErrorState,
  StatTile,
} from "@/components/ui";
import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
} from "@/components/immeubles/prospection/status-display";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { useZoneCurrentAssignments } from "@/hooks/api/use-zone-current-assignments";
import { useZoneDetail } from "@/hooks/api/use-zone-detail";
import { useZoneProspections } from "@/hooks/api/use-zone-prospections";
import { useZoneStatistics } from "@/hooks/api/use-zone-statistics";
import type { Zone } from "@/types/api";
import type { ZoneProspection } from "@/types/graphql-schema";
import { Feather } from "@expo/vector-icons";
import { type CameraRef } from "@maplibre/maplibre-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type StatTileData = {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
};

/** mm:ss (< 1 h) ou "H h MM min" pour une durée exprimée en secondes. */
function formatDuration(sec?: number | null): string {
  if (sec == null || sec <= 0) return "—";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);
  if (hours > 0) {
    return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Durée totale lisible (somme des dureeSec) → "H h MM min" ou "M min". */
function formatTotalDuration(totalSec: number): string {
  if (totalSec <= 0) return "0 min";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) {
    return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
  }
  return `${minutes} min`;
}

/** DateTime ISO → "JJ/MM/AAAA · HH:MM". */
function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = date.getDate().toString().padStart(2, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = date.getHours().toString().padStart(2, "0");
  const min = date.getMinutes().toString().padStart(2, "0");
  return `${dd}/${mm}/${yyyy} · ${hh}:${min}`;
}

/** Mappe un statut de porte sur un ton de Chip sémantique. */
function statusToChipTone(accent: string): ChipTone {
  switch (accent) {
    case "#22C55E":
      return "success";
    case "#EF4444":
      return "danger";
    case "#F59E0B":
      return "warning";
    case "#005BFF":
      return "primary";
    case "#6366F1":
      return "info";
    default:
      return "neutral";
  }
}

export default function ZoneDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const zoneId = id ? Number(id) : null;

  const zoneQuery = useZoneDetail(zoneId);
  const statsQuery = useZoneStatistics(zoneId);
  const assignmentsQuery = useZoneCurrentAssignments(zoneId);
  const prospectionsQuery = useZoneProspections(zoneId);

  const zone = zoneQuery.data;
  const stats = statsQuery.data;
  const prospections = useMemo(
    () => prospectionsQuery.data ?? [],
    [prospectionsQuery.data],
  );

  const zoneName =
    zone?.nom ?? stats?.zoneName ?? (zoneId != null ? `Zone #${zoneId}` : "Zone");

  const immeubles = useMemo(() => zone?.immeubles ?? [], [zone?.immeubles]);

  // Mini-carte de cadrage (non interactive) : bbox + centre de la zone.
  // `polygon` arrive du schéma GraphQL comme scalaire JSON : on le restreint au
  // type géométrique attendu par l'overlay après un garde d'exécution.
  const miniMapCameraRef = useRef<CameraRef | null>(null);
  const zoneGeometry = useMemo<Zone | null>(() => {
    if (!zone) return null;
    return {
      id: zone.id,
      nom: zone.nom,
      xOrigin: zone.xOrigin,
      yOrigin: zone.yOrigin,
      rayon: zone.rayon,
      polygon: Array.isArray(zone.polygon)
        ? (zone.polygon as unknown as number[][])
        : null,
    };
  }, [zone]);
  const bounds = useMemo(
    () => (zoneGeometry ? zoneBounds(zoneGeometry) : null),
    [zoneGeometry],
  );
  const mapCenter = useMemo(
    () =>
      bounds
        ? {
            longitude: (bounds[0] + bounds[2]) / 2,
            latitude: (bounds[1] + bounds[3]) / 2,
          }
        : null,
    [bounds],
  );

  // Cadre la caméra sur la zone. Appelé au chargement de la carte ET quand la
  // bbox arrive (la donnée zone peut se charger après le montage de la carte).
  const fitToZone = useCallback(() => {
    if (!bounds) return;
    miniMapCameraRef.current?.fitBounds(bounds, {
      padding: { top: 28, right: 28, bottom: 28, left: 28 },
      duration: 0,
    });
  }, [bounds]);

  useEffect(() => {
    fitToZone();
  }, [fitToZone]);

  // Noms des commerciaux dérivés des prospections (l'assignation ne porte
  // que l'userId). Fallback "Commercial #id" si aucune prospection connue.
  const commercialNames = useMemo(() => {
    const names = new Map<number, string>();
    for (const p of prospections) {
      if (p.commercialId != null && p.commercialNom) {
        names.set(p.commercialId, p.commercialNom);
      }
    }
    return names;
  }, [prospections]);

  const commerciaux = useMemo(
    () =>
      (assignmentsQuery.data ?? []).filter((a) => a.userType === "COMMERCIAL"),
    [assignmentsQuery.data],
  );

  const totalDurationSec = useMemo(
    () => prospections.reduce((acc, p) => acc + (p.dureeSec ?? 0), 0),
    [prospections],
  );

  const statTiles = useMemo<StatTileData[]>(() => {
    if (!stats) return [];
    return [
      {
        key: "contrats",
        icon: "check-circle",
        label: "Contrats signés",
        value: stats.totalContratsSignes,
      },
      {
        key: "rdv",
        icon: "calendar",
        label: "RDV pris",
        value: stats.totalRendezVousPris,
      },
      {
        key: "immeubles",
        icon: "home",
        label: "Immeubles visités",
        value: stats.totalImmeublesVisites,
      },
      {
        key: "refus",
        icon: "x-circle",
        label: "Refus",
        value: stats.totalRefus,
      },
      {
        key: "conversion",
        icon: "trending-up",
        label: "Taux conversion",
        value: `${Math.round(stats.tauxConversion)}%`,
      },
      {
        key: "succes-rdv",
        icon: "target",
        label: "Succès RDV",
        value: `${Math.round(stats.tauxSuccesRdv)}%`,
      },
      {
        key: "portes",
        icon: "grid",
        label: "Portes prospectées",
        value: stats.totalPortesProspectes,
      },
      {
        key: "performance",
        icon: "award",
        label: "Performance",
        value: Math.round(stats.performanceGlobale),
      },
    ];
  }, [stats]);

  const refetchAll = useCallback(() => {
    void zoneQuery.refetch();
    void statsQuery.refetch();
    void assignmentsQuery.refetch();
    void prospectionsQuery.refetch();
  }, [zoneQuery, statsQuery, assignmentsQuery, prospectionsQuery]);

  const renderProspection = useCallback(
    ({ item }: { item: ZoneProspection }) => {
      const statusOption =
        STATUS_DISPLAY[item.statut] ?? DEFAULT_STATUS_OPTION;
      return (
        <Card variant="outlined" padding="md" style={styles.prospectionRow}>
          <View style={styles.prospectionTop}>
            <Text style={styles.prospectionCommercial} numberOfLines={1}>
              {item.commercialNom ?? "Commercial inconnu"}
            </Text>
            <Chip
              label={statusOption.label}
              tone={statusToChipTone(statusOption.accent)}
              icon={statusOption.icon}
            />
          </View>
          <Text style={styles.prospectionAdresse} numberOfLines={1}>
            {item.immeubleAdresse} · Porte {item.porteNumero}
          </Text>
          <View style={styles.prospectionMeta}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="watch" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {formatDuration(item.dureeSec)}
              </Text>
            </View>
          </View>
        </Card>
      );
    },
    [],
  );

  const isInitialLoading =
    (zoneQuery.loading && zone == null) ||
    (statsQuery.loading && stats == null);

  const hasError =
    zoneQuery.error != null &&
    statsQuery.error != null &&
    zone == null &&
    stats == null;

  if (zoneId == null || zoneId <= 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Zone introuvable.</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  if (isInitialLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const ListHeader = (
    <View style={styles.headerContent}>
      {mapCenter ? (
        <Card variant="outlined" padding="none" style={styles.miniMapCard}>
          <CarteTerrainMap
            cameraRef={miniMapCameraRef}
            mapCenter={mapCenter}
            satellite={false}
            showUserLocation={false}
            interactive={false}
            onPress={() => {}}
            onDidFinishLoadingMap={fitToZone}
          >
            {zoneGeometry ? <ZoneContour zones={[zoneGeometry]} /> : null}
          </CarteTerrainMap>
        </Card>
      ) : null}

      {hasError ? (
        <ErrorState
          message="Impossible de charger les statistiques de la zone."
          onRetry={refetchAll}
        />
      ) : null}

      {statTiles.length > 0 ? (
        <View style={styles.statsGrid}>
          {statTiles.map((tile) => (
            <StatTile
              key={tile.key}
              icon={tile.icon}
              label={tile.label}
              value={tile.value}
              style={styles.statTile}
            />
          ))}
        </View>
      ) : null}

      {/* Commerciaux concernés */}
      <Text style={styles.sectionTitle}>
        Commerciaux ({commerciaux.length})
      </Text>
      {commerciaux.length === 0 ? (
        <Text style={styles.sectionEmpty}>Aucun commercial assigné.</Text>
      ) : (
        <View style={styles.chipRow}>
          {commerciaux.map((c) => (
            <Chip
              key={c.id}
              icon="user"
              label={
                commercialNames.get(c.userId) ?? `Commercial #${c.userId}`
              }
            />
          ))}
        </View>
      )}

      {/* Immeubles concernés */}
      <Text style={styles.sectionTitle}>Immeubles ({immeubles.length})</Text>
      {immeubles.length === 0 ? (
        <Text style={styles.sectionEmpty}>Aucun immeuble dans la zone.</Text>
      ) : (
        <Card variant="outlined" padding="none" style={styles.immeubleList}>
          {immeubles.map((imm, index) => (
            <View
              key={imm.id}
              style={[
                styles.immeubleRow,
                index < immeubles.length - 1 && styles.immeubleRowBorder,
              ]}
            >
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={styles.immeubleAdresse} numberOfLines={1}>
                {imm.adresse}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* Prospections */}
      <View style={styles.prospectionsHeader}>
        <Text style={styles.sectionTitle}>
          Prospections ({prospections.length})
        </Text>
        {totalDurationSec > 0 ? (
          <Text style={styles.totalDuration}>
            {formatTotalDuration(totalDurationSec)} au total
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backFab} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.headerNom} numberOfLines={1}>
            {zoneName}
          </Text>
          {stats ? (
            <Text style={styles.headerSub}>
              {stats.nombreCommerciaux} commercial
              {stats.nombreCommerciaux !== 1 ? "aux" : ""} ·{" "}
              {immeubles.length} immeuble{immeubles.length !== 1 ? "s" : ""}
            </Text>
          ) : null}
        </View>
      </View>

      <FlatList
        data={prospections}
        keyExtractor={(item, index) =>
          `${item.immeubleId}-${item.porteId}-${index}`
        }
        renderItem={renderProspection}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !hasError ? (
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={28} color={colors.textSubtle} />
              <Text style={styles.emptyText}>Aucune prospection</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: fontSize.lg,
    color: colors.textStrong,
  },
  backButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  backButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    flex: 1,
  },
  headerNom: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.textStrong,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerContent: {
    gap: spacing.md,
  },
  miniMapCard: {
    height: 200,
    overflow: "hidden",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  statTile: {
    minWidth: "46%",
    flexGrow: 1,
    flexBasis: "46%",
  },
  sectionTitle: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionEmpty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  immeubleList: {
    overflow: "hidden",
  },
  immeubleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  immeubleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  immeubleAdresse: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
  },
  prospectionsHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  totalDuration: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  prospectionRow: {
    gap: spacing.sm,
  },
  prospectionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  prospectionCommercial: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  prospectionAdresse: {
    fontSize: fontSize.sm,
    color: colors.textStrong,
  },
  prospectionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  emptyBox: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing["3xl"],
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
});
