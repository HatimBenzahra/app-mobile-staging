import { Card } from "@/components/ui";
import { colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

type MapLegendProps = {
  insets: EdgeInsets;
  role: string | null;
};

/**
 * Légende on-map repliable (bas-gauche). Documente les deux axes des marqueurs :
 *  - COULEUR = propriétaire (teal = moi, amber = équipe).
 *  - GLYPH   = type d'habitat (🏢 / 🏠 / 🏡).
 */
export function MapLegend({ insets, role }: MapLegendProps) {
  const [expanded, setExpanded] = useState(false);
  const bottom = insets.bottom + 24;

  if (!expanded) {
    return (
      <Pressable
        style={[styles.pill, { bottom }]}
        onPress={() => setExpanded(true)}
        accessibilityRole="button"
        accessibilityLabel="Afficher la légende de la carte"
      >
        <Feather name="info" size={15} color={colors.primary} />
        <Text style={styles.pillText}>Légende</Text>
      </Pressable>
    );
  }

  return (
    <Card variant="elevated" padding="sm" style={[styles.panel, { bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Légende</Text>
        <Pressable
          style={styles.closeButton}
          onPress={() => setExpanded(false)}
          accessibilityRole="button"
          accessibilityLabel="Masquer la légende"
        >
          <Feather name="chevron-down" size={16} color={colors.textStrong} />
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Propriétaire</Text>
      <LegendRow swatch={<View style={[styles.dot, { backgroundColor: "#0D9488" }]} />} label="Mes lieux" />
      {role === "manager" && (
        <LegendRow swatch={<View style={[styles.dot, { backgroundColor: "#D97706" }]} />} label="Lieux de l'équipe" />
      )}

      <Text style={styles.sectionLabel}>Type d&apos;habitat</Text>
      <LegendRow swatch={<Text style={styles.glyph}>🏢</Text>} label="Immeuble" />
      <LegendRow swatch={<Text style={styles.glyph}>🏠</Text>} label="Maison" />
      <LegendRow swatch={<Text style={styles.glyph}>🏡</Text>} label="Pavillon" />
    </Card>
  );
}

function LegendRow({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.swatch}>{swatch}</View>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  panel: {
    position: "absolute",
    left: 14,
    width: 196,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  sectionLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 3,
  },
  swatch: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  glyph: {
    fontSize: 15,
  },
  rowLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
});
