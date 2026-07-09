import { Card, Icon } from "@/components/ui";
import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import { colors, fontWeight, ownership } from "@/constants/theme";
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
 *  - ICÔNE   = type d'habitat.
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
        <Icon name="info" size={15} color={colors.primary} />
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
          <Icon name="chevron-down" size={16} color={colors.textStrong} />
        </Pressable>
      </View>

      {/* Double axe des marqueurs, pour lever l'ambiguïté du code visuel. */}
      <Text style={styles.hint}>
        Marqueur : la couleur indique le propriétaire, l&apos;icône le type de
        lieu.
      </Text>

      <Text style={styles.sectionLabel}>Propriétaire</Text>
      <LegendRow swatch={<View style={[styles.dot, { backgroundColor: ownership.mine.accent }]} />} label="Mes lieux" />
      {role === "manager" && (
        <LegendRow swatch={<View style={[styles.dot, { backgroundColor: ownership.team.accent }]} />} label="Lieux de l'équipe" />
      )}

      <Text style={styles.sectionLabel}>Zones</Text>
      <LegendRow
        swatch={<View style={[styles.zoneSwatch, { borderColor: colors.danger, backgroundColor: colors.dangerSoft }]} />}
        label="Ma zone (en cours)"
      />
      <LegendRow
        swatch={<View style={[styles.zoneSwatch, { borderColor: colors.info, backgroundColor: colors.infoSoft }]} />}
        label="Anciennes zones"
      />

      {/* Sur la carte, l'icône d'habitat est blanche dans une pastille colorée
          par propriétaire : le TYPE est porté par la forme, pas la couleur. On
          neutralise donc la teinte ici (plus de code couleur trompeur). */}
      <Text style={styles.sectionLabel}>Type de lieu</Text>
      <LegendRow swatch={<HabitatIcon type="IMMEUBLE" size={16} color={colors.textStrong} />} label="Immeuble" />
      <LegendRow swatch={<HabitatIcon type="MAISON" size={16} color={colors.textStrong} />} label="Maison" />
      <LegendRow swatch={<HabitatIcon type="PAVILLON" size={16} color={colors.textStrong} />} label="Pavillon" />
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
    fontWeight: fontWeight.extrabold,
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
    fontWeight: fontWeight.extrabold,
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
  hint: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    marginBottom: 2,
  },
  sectionLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: fontWeight.extrabold,
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
  zoneSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    // La couleur (bordure + fond) est fournie par chaque ligne : rouge = ma zone
    // en cours, bleu = anciennes zones (cf. ZoneContour).
  },
  rowLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
});
