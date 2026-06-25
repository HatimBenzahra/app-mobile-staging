import { getImmeubleProgress } from "@/components/immeubles/lieu-progress";
import { colors } from "@/constants/theme";
import { useQuartiers } from "@/hooks/api/use-quartiers";
import type { Immeuble } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import {
  Camera,
  Map as MapLibreMap,
  Marker,
} from "@maplibre/maplibre-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

function getTypeLabel(imm: Immeuble): string {
  if (imm.typeHabitat === "MAISON") return "Maison";
  if (imm.typeHabitat === "PAVILLON") return "Pavillon";
  return "Immeuble";
}

function getTypeColor(imm: Immeuble): string {
  if (imm.typeHabitat === "MAISON") return colors.success;
  if (imm.typeHabitat === "PAVILLON") return "#F97316";
  return colors.primary;
}

export default function QuartierDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const quartierId = id ? Number(id) : null;

  const { data: quartiers, loading } = useQuartiers();

  const quartier = useMemo(
    () => (quartierId != null ? (quartiers ?? []).find((q) => q.id === quartierId) ?? null : null),
    [quartiers, quartierId],
  );

  const mapCenter = useMemo(() => {
    if (quartier?.latitude != null && quartier?.longitude != null) {
      return { latitude: quartier.latitude, longitude: quartier.longitude };
    }
    // Centroïde sur les immeubles s'il n'y a pas de coordonnées quartier.
    const immeublesGeo = (quartier?.immeubles ?? []).filter(
      (imm) => imm.latitude != null && imm.longitude != null,
    );
    if (immeublesGeo.length === 0) return { latitude: 48.8566, longitude: 2.3522 };
    const sumLat = immeublesGeo.reduce((acc, imm) => acc + imm.latitude!, 0);
    const sumLng = immeublesGeo.reduce((acc, imm) => acc + imm.longitude!, 0);
    return {
      latitude: sumLat / immeublesGeo.length,
      longitude: sumLng / immeublesGeo.length,
    };
  }, [quartier]);

  const immeubles = useMemo(
    () => (quartier?.immeubles ?? []) as Immeuble[],
    [quartier],
  );

  const stats = useMemo(() => {
    let totalPortes = 0;
    let prospectees = 0;
    for (const imm of immeubles) {
      const p = getImmeubleProgress(imm);
      totalPortes += p.total;
      prospectees += p.prospectees;
    }
    const percent = totalPortes === 0 ? 0 : Math.round((prospectees / totalPortes) * 100);
    return { totalPortes, prospectees, percent };
  }, [immeubles]);

  if (loading && !quartier) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!quartier) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Quartier introuvable.</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backFab} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.headerNom} numberOfLines={1}>
            {quartier.nom || `Quartier #${quartier.id}`}
          </Text>
          <Text style={styles.headerSub}>
            {immeubles.length} lieu{immeubles.length !== 1 ? "x" : ""} · {stats.percent}% prospecte
          </Text>
        </View>
      </View>

      {/* Mini-map */}
      <View style={styles.mapContainer}>
        <MapLibreMap
          style={StyleSheet.absoluteFill}
          mapStyle={MAP_STYLE_URL}
          logo={false}
          compass={false}
          scaleBar={false}
          attribution={false}
          preferredFramesPerSecond={30}
          androidView="surface"
        >
          <Camera
            initialViewState={{
              center: [mapCenter.longitude, mapCenter.latitude],
              zoom: 14,
            }}
            minZoom={5}
            maxZoom={20}
          />
          {immeubles
            .filter((imm) => imm.latitude != null && imm.longitude != null)
            .map((imm) => {
              const { percent } = getImmeubleProgress(imm);
              const progressColor =
                percent < 35
                  ? colors.danger
                  : percent < 70
                    ? "#F59E0B"
                    : percent < 100
                      ? "#22C55E"
                      : "#16A34A";
              return (
                <Marker
                  key={imm.id}
                  id={`qimm-${imm.id}`}
                  lngLat={[imm.longitude!, imm.latitude!]}
                  anchor="bottom"
                  onPress={(event) => {
                    event.stopPropagation();
                    router.push(`/lieu/${imm.id}`);
                  }}
                >
                  <View style={[styles.mapDot, { backgroundColor: progressColor }]} />
                </Marker>
              );
            })}
        </MapLibreMap>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{immeubles.length}</Text>
          <Text style={styles.statLabel}>Lieux</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.prospectees}</Text>
          <Text style={styles.statLabel}>Prospectees</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.percent}%</Text>
          <Text style={styles.statLabel}>Couverture</Text>
        </View>
      </View>

      {/* Liste des lieux */}
      <FlatList
        data={immeubles}
        keyExtractor={(imm) => String(imm.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item: imm }) => {
          const { percent, color } = getImmeubleProgress(imm);
          return (
            <Pressable
              style={styles.lieuRow}
              onPress={() => router.push(`/lieu/${imm.id}`)}
            >
              <View style={[styles.lieuIcon, { backgroundColor: `${getTypeColor(imm)}1A` }]}>
                <Feather
                  name={imm.typeHabitat === "MAISON" ? "home" : imm.typeHabitat === "PAVILLON" ? "grid" : "layers"}
                  size={16}
                  color={getTypeColor(imm)}
                />
              </View>
              <View style={styles.lieuInfo}>
                <Text style={styles.lieuAdresse} numberOfLines={1}>
                  {imm.adresse}
                </Text>
                <Text style={styles.lieuType}>{getTypeLabel(imm)}</Text>
              </View>
              <View style={styles.lieuProgress}>
                <Text style={[styles.lieuPercent, { color }]}>{percent}%</Text>
                <Feather name="chevron-right" size={16} color={colors.textSubtle} />
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Feather name="map-pin" size={28} color={colors.textSubtle} />
            <Text style={styles.emptyText}>Aucun lieu dans ce quartier</Text>
          </View>
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
    gap: 16,
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: 16,
    color: colors.textStrong,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  backButtonText: {
    fontSize: 15,
    color: colors.text,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textStrong,
  },
  mapContainer: {
    height: 200,
    backgroundColor: colors.border,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textStrong,
  },
  list: {
    padding: 16,
    gap: 8,
  },
  lieuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lieuIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  lieuInfo: {
    flex: 1,
  },
  lieuAdresse: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  lieuType: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textStrong,
  },
  lieuProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lieuPercent: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  mapDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  emptyBox: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSubtle,
  },
});
