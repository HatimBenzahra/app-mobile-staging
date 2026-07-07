import { CarteTerrainMap } from "@/components/carte-terrain/CarteTerrainMap";
import { TerrainMarkers } from "@/components/carte-terrain/TerrainMarkers";
import { ZoneContour } from "@/components/carte-terrain/ZoneContour";
import { ZoneDraft } from "@/components/carte-terrain/ZoneDraft";
import { ZoneVertexPins } from "@/components/carte-terrain/ZoneVertexPins";
import { ZonePanel } from "@/components/carte-terrain/panels/ZonePanel";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { useZoneDraft } from "@/hooks/zone/use-zone-draft";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ZoneCreateScreen() {
  const insets = useSafeAreaInsets();
  const [satellite, setSatellite] = useState(false);
  const {
    cameraRef,
    mapCenter,
    zonePins,
    activeZonePinId,
    assignables,
    existingZones,
    immeubles,
    loadingLocation,
    creating,
    readyToCreateZone,
    addZonePin,
    selectZonePin,
    removeActiveZonePin,
    removeLastZonePin,
    clearZonePins,
    centerOnCurrentLocation,
    handleCreateZone,
  } = useZoneDraft();

  const totalSommets = zonePins.length;
  const hasPins = totalSommets > 0;

  // Garde de sortie : on ne perd pas un tracé en cours sans confirmation.
  const handleBack = useCallback(() => {
    if (zonePins.length === 0) {
      router.back();
      return;
    }
    Alert.alert(
      "Quitter la création ?",
      "Les sommets déjà placés seront perdus.",
      [
        { text: "Continuer", style: "cancel" },
        { text: "Quitter", style: "destructive", onPress: () => router.back() },
      ],
    );
  }, [zonePins.length]);

  const handleToggleSatellite = useCallback(() => setSatellite((s) => !s), []);

  return (
    <View style={styles.container}>
      <CarteTerrainMap
        cameraRef={cameraRef}
        mapCenter={mapCenter}
        satellite={satellite}
        onPress={(event) => addZonePin({
          latitude: event.nativeEvent.lngLat[1],
          longitude: event.nativeEvent.lngLat[0],
        })}
      >
        {/* Contexte lecture seule (z-order dessous) : zones et bâtiments déjà */}
        {/* créés, montés AVANT le tracé pour rester sous les pins/sommets. */}
        {/* ZoneContour sans mode/onSelectZone → non interactif : son onPress */}
        {/* sort avant tout stopPropagation, donc un tap dans une zone existante */}
        {/* pose quand même un sommet. */}
        <ZoneContour zones={existingZones} />
        <TerrainMarkers immeubles={immeubles} mode="VISUALISATION" onSelectLieu={() => {}} />
        <ZoneDraft zonePins={zonePins} />
        <ZoneVertexPins
          zonePins={zonePins}
          activeZonePinId={activeZonePinId}
          onSelect={selectZonePin}
        />
      </CarteTerrainMap>

      {/* Header flottant : retour + titre. */}
      <View style={[styles.header, { top: insets.top + 8 }]}>
        <Pressable style={styles.iconFab} onPress={handleBack}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Nouvelle zone
        </Text>
      </View>

      {/* Bandeau d'instruction + compteur de sommets. */}
      <View style={[styles.banner, { top: insets.top + 62 }]}>
        <Feather
          name={totalSommets < 3 ? "map-pin" : "check-circle"}
          size={16}
          color={totalSommets < 3 ? colors.info : colors.success}
        />
        <Text style={styles.bannerText} numberOfLines={2}>
          {totalSommets < 3
            ? "Touchez la carte pour poser les sommets · min. 3"
            : "Zone prête · nommez-la et créez-la"}
        </Text>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{totalSommets}</Text>
        </View>
      </View>

      {/* Contrôles carte + édition du tracé (colonne droite). */}
      <View style={[styles.fabColumn, { top: insets.top + 116 }]}>
        <Pressable style={styles.fab} onPress={centerOnCurrentLocation}>
          {loadingLocation ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="crosshair" size={22} color={colors.primary} />
          )}
        </Pressable>
        <Pressable
          style={[styles.fab, satellite && styles.fabActive]}
          onPress={handleToggleSatellite}
        >
          <Feather
            name="layers"
            size={22}
            color={satellite ? colors.textOnPrimary : colors.primary}
          />
        </Pressable>
        {hasPins && (
          <>
            <Pressable style={styles.fab} onPress={removeLastZonePin}>
              <Feather name="corner-up-left" size={20} color={colors.primary} />
            </Pressable>
            <Pressable style={[styles.fab, styles.fabDanger]} onPress={clearZonePins}>
              <Feather name="trash-2" size={20} color={colors.danger} />
            </Pressable>
          </>
        )}
      </View>

      <ZonePanel
        insets={insets}
        zonePins={zonePins}
        activeZonePinId={activeZonePinId}
        assignables={assignables}
        creating={creating}
        readyToCreateZone={readyToCreateZone}
        onSelectZonePin={selectZonePin}
        onRemoveActiveZonePin={removeActiveZonePin}
        onCreateZone={handleCreateZone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconFab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    textShadowColor: colors.surface,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  banner: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  bannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textStrong,
  },
  counterBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.info,
  },
  counterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
    color: colors.textOnPrimary,
  },
  fabColumn: {
    position: "absolute",
    right: 16,
    gap: 12,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  fabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fabDanger: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
});
