import { Card } from "@/components/ui";
import { colors, fontSize, fontWeight, radius, shadows, spacing } from "@/constants/theme";
import type { Zone } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { polygonAreaKm2 } from "./geo-hull";

type ZoneSheetProps = {
  zone: Zone | null;
  open: boolean;
  onClose: () => void;
  onViewDetail: (id: number) => void;
};

/**
 * Carte flottante (bas d'écran) affichée au tap sur le contour d'une zone en
 * VISUALISATION. Même form-factor que BuildingSheet (Card `position:absolute`,
 * safe-area, bouton fermer) mais volontairement minimale : titre, superficie et
 * un raccourci « Voir le détail ». Teinte `colors.info` pour rester cohérent avec
 * l'accent des contours de zone.
 */
function formatArea(zone: Zone): string | null {
  if (!zone.polygon || zone.polygon.length < 3) return null;
  const km2 = polygonAreaKm2(zone.polygon);
  if (km2 <= 0) return null;
  if (km2 >= 0.1) return `${km2.toFixed(2)} km²`;
  return `${Math.round(km2 * 1_000_000).toLocaleString("fr-FR")} m²`;
}

export default function ZoneSheet({ zone, open, onClose, onViewDetail }: ZoneSheetProps) {
  const insets = useSafeAreaInsets();

  if (!open || !zone) return null;

  const areaLabel = formatArea(zone);

  return (
    <Card
      variant="elevated"
      padding="md"
      style={[styles.panel, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Feather name="grid" size={22} color={colors.info} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {zone.nom}
          </Text>
          {areaLabel ? (
            <View style={styles.subtitleRow}>
              <View style={styles.subtitleDot} />
              <Text style={styles.subtitle} numberOfLines={1}>
                Superficie · {areaLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Feather name="x" size={18} color={colors.textStrong} />
        </Pressable>
      </View>

      <Pressable
        style={styles.action}
        onPress={() => onViewDetail(zone.id)}
        accessibilityRole="button"
      >
        <Feather name="eye" size={18} color={colors.info} />
        <Text style={styles.actionText}>Voir le détail</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  // Même ancrage que BuildingSheet : Card flottante en bas de la zone carte.
  panel: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.info,
    backgroundColor: colors.infoSoft,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  subtitleDot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.textSubtle,
  },
  subtitle: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.infoSoft,
    backgroundColor: colors.infoSoft,
  },
  actionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.info,
  },
});
