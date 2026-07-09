import { CarteTerrainMap } from "@/components/carte-terrain/CarteTerrainMap";
import { zoneBounds } from "@/components/carte-terrain/geo-hull";
import { ZoneContour } from "@/components/carte-terrain/ZoneContour";
import { Icon } from "@/components/ui";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { useCurrentAssignment } from "@/hooks/api/use-current-assignment";
import { type CameraRef } from "@maplibre/maplibre-react-native";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

type CommercialZoneMapProps = {
  userId: number | null;
  insets: EdgeInsets;
  onViewDetail: (zoneId: number) => void;
};

/** DateTime ISO → "JJ/MM/AAAA". */
function formatShortDate(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = date.getDate().toString().padStart(2, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

/**
 * Vue « Mes zones » du commercial : une carte de cadrage (lecture seule) sur sa
 * zone EN COURS (unique), + un bandeau d'infos épuré (nom, date d'assignation,
 * lien détail). Remplace l'ancienne liste de cards. Source unique :
 * `currentUserAssignment` (aucune query supplémentaire).
 */
export function CommercialZoneMap({
  userId,
  insets,
  onViewDetail,
}: CommercialZoneMapProps) {
  const { data, loading } = useCurrentAssignment(userId, "COMMERCIAL");
  const zone = data?.zone ?? null;
  const assignedAt = data?.assignedAt ?? null;

  const cameraRef = useRef<CameraRef | null>(null);
  const bounds = useMemo(() => (zone ? zoneBounds(zone) : null), [zone]);
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
  const fitToZone = useCallback(() => {
    if (!bounds) return;
    cameraRef.current?.fitBounds(bounds, {
      padding: { top: insets.top + 60, right: 40, bottom: 160, left: 40 },
      duration: 0,
    });
  }, [bounds, insets.top]);
  useEffect(() => {
    fitToZone();
  }, [fitToZone]);

  if (loading && !zone) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!zone || !mapCenter) {
    return (
      <View style={styles.centered}>
        <Icon name="vector-polygon" size={30} color={colors.textSubtle} />
        <Text style={styles.emptyTitle}>Aucune zone assignée</Text>
        <Text style={styles.emptyHint}>
          Ta zone en cours apparaîtra ici dès qu&apos;elle te sera assignée.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CarteTerrainMap
        cameraRef={cameraRef}
        mapCenter={mapCenter}
        satellite={false}
        showUserLocation={false}
        interactive={false}
        onPress={() => {}}
        onDidFinishLoadingMap={fitToZone}
      >
        <ZoneContour zones={[zone]} activeZoneId={zone.id} />
      </CarteTerrainMap>

      <View style={[styles.banner, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.eyebrow}>Ma zone en cours</Text>
        <View style={styles.titleRow}>
          <View style={styles.dot} />
          <Text style={styles.zoneName} numberOfLines={1}>
            {zone.nom}
          </Text>
        </View>
        {assignedAt ? (
          <View style={styles.metaRow}>
            <Icon name="calendar" size={13} color={colors.textMuted} />
            <Text style={styles.meta}>Assignée le {formatShortDate(assignedAt)}</Text>
          </View>
        ) : null}
        <Pressable
          style={styles.detailBtn}
          onPress={() => onViewDetail(zone.id)}
          accessibilityRole="button"
          accessibilityLabel="Voir le détail de ma zone"
        >
          <Text style={styles.detailBtnText}>Voir le détail</Text>
          <Icon name="chevron-right" size={18} color={colors.textOnPrimary} />
        </Pressable>
      </View>
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
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  banner: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
  },
  zoneName: {
    flexShrink: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  meta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  detailBtn: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  detailBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
});
