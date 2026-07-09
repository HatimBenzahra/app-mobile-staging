import { Card, Icon } from "@/components/ui";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import type { Zone } from "@/types/api";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { polygonAreaKm2 } from "./geo-hull";
import { sheetStyles } from "./sheet-styles";

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
      style={[sheetStyles.panel, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
    >
      <View style={sheetStyles.header}>
        <View style={[sheetStyles.headerIcon, styles.headerIconInfo]}>
          <Icon name="vector-polygon" size={22} color={colors.info} />
        </View>
        <View style={sheetStyles.headerText}>
          <Text style={sheetStyles.title} numberOfLines={1}>
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
          style={sheetStyles.closeButton}
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Icon name="x" size={18} color={colors.textStrong} />
        </Pressable>
      </View>

      <Pressable
        style={styles.action}
        onPress={() => onViewDetail(zone.id)}
        accessibilityRole="button"
      >
        <Icon name="eye" size={18} color={colors.info} />
        <Text style={styles.actionText}>Voir le détail</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  // Teinte info de l'icône (le châssis vient de `sheetStyles.headerIcon`).
  headerIconInfo: {
    borderColor: colors.info,
    backgroundColor: colors.infoSoft,
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
