import { PressableCard } from "@/components/ui";
import { polygonAreaKm2 } from "@/components/carte-terrain/geo-hull";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import type { ZoneForUser } from "@/services/api/zones/zone.service";
import type { Commercial } from "@/types/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export type ZoneCommercial = Pick<Commercial, "id" | "prenom" | "nom">;

/**
 * Superficie approximative d'une zone en km² : contour exact via la formule du
 * lacet (`polygonAreaKm2`) si un polygone existe, sinon disque `π·rayon²` (rayon
 * en mètres) ramené en km². Exporté pour le tri côté écran (source unique).
 */
export function zoneAreaKm2(zone: Pick<ZoneForUser, "polygon" | "rayon">): number {
  if (zone.polygon && zone.polygon.length >= 3) {
    return polygonAreaKm2(zone.polygon);
  }
  if (zone.rayon != null && zone.rayon > 0) {
    return (Math.PI * zone.rayon * zone.rayon) / 1_000_000;
  }
  return 0;
}

function initials(commercial: ZoneCommercial): string {
  const p = commercial.prenom?.charAt(0) ?? "";
  const n = commercial.nom?.charAt(0) ?? "";
  return `${p}${n}`.toUpperCase() || "?";
}

const MAX_AVATARS = 4;

function CommercialAvatars({ commercials }: { commercials: ZoneCommercial[] }) {
  if (commercials.length === 0) return null;
  const shown = commercials.slice(0, MAX_AVATARS);
  const extra = commercials.length - shown.length;
  return (
    <View style={styles.avatars}>
      {shown.map((commercial) => (
        <View key={commercial.id} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(commercial)}</Text>
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.avatar, styles.avatarExtra]}>
          <Text style={styles.avatarText}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

type Props = {
  zone: ZoneForUser;
  commercials: ZoneCommercial[];
  /** Immeubles prospectés (agrégat `zoneStatistics`). */
  prospectedCount: number;
  onPress: () => void;
};

function ZoneListCardBase({ zone, commercials, prospectedCount, onPress }: Props) {
  const immeubleCount = zone.immeubles?.length ?? 0;
  const areaKm2 = useMemo(() => zoneAreaKm2(zone), [zone]);
  const areaLabel = `${areaKm2 < 1 ? areaKm2.toFixed(2) : areaKm2.toFixed(1)} km²`;

  const prospected = Math.min(Math.max(prospectedCount, 0), immeubleCount);
  const percent = immeubleCount > 0 ? Math.round((prospected / immeubleCount) * 100) : 0;
  const progressColor = percent >= 100 ? colors.success : colors.primary;
  const showProgress = immeubleCount > 0;

  return (
    <PressableCard variant="outlined" padding="md" style={styles.card} onPress={onPress}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="vector-polygon" size={18} color={colors.primary} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {zone.nom}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {areaLabel}
            {commercials.length > 0 ? ` · ${commercials.length} commercial${commercials.length !== 1 ? "s" : ""}` : ""}
            {immeubleCount > 0 ? ` · ${immeubleCount} immeuble${immeubleCount !== 1 ? "s" : ""}` : ""}
          </Text>
        </View>

        {showProgress ? (
          <View style={[styles.pill, { borderColor: `${progressColor}33`, backgroundColor: `${progressColor}14` }]}>
            <Text style={[styles.pillText, { color: progressColor }]}>{percent}%</Text>
          </View>
        ) : (
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSubtle} />
        )}
      </View>

      {commercials.length > 0 ? (
        <View style={styles.bottomRow}>
          <View style={styles.assigned}>
            <MaterialCommunityIcons name="account-multiple-outline" size={16} color={colors.textMuted} />
            <Text style={styles.assignedLabel} numberOfLines={1}>
              Assignés
            </Text>
          </View>
          <View style={styles.metaRight}>
            <CommercialAvatars commercials={commercials} />
          </View>
        </View>
      ) : null}

      {showProgress ? (
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: progressColor }]} />
        </View>
      ) : null}
    </PressableCard>
  );
}

export const ZoneListCard = memo(ZoneListCardBase);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: spacing.sm,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primary}1A`,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
  },
  pill: {
    minWidth: 54,
    height: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extrabold,
    fontVariant: ["tabular-nums"],
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  assigned: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  assignedLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  metaRight: { marginLeft: "auto" },
  avatars: {
    flexDirection: "row",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    marginLeft: -6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primary}1A`,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  avatarExtra: {
    backgroundColor: colors.surfaceMuted,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  bar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
});

export default ZoneListCard;
