import { PressableCard } from "@/components/ui";
import { polygonAreaKm2 } from "@/components/carte-terrain/geo-hull";
import { colors, radius } from "@/constants/theme";
import type { ZoneForUser } from "@/services/api/zones/zone.service";
import type { Commercial } from "@/types/api";
import { Feather } from "@expo/vector-icons";
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

  return (
    <PressableCard variant="outlined" padding="md" style={styles.card} onPress={onPress}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Feather name="map" size={18} color={colors.primary} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {zone.nom}
        </Text>
        {immeubleCount > 0 ? (
          <Text style={[styles.pct, { color: progressColor }]}>{percent}%</Text>
        ) : (
          <Feather name="chevron-right" size={18} color={colors.textSubtle} />
        )}
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaText} numberOfLines={1}>
          {areaLabel} · {commercials.length} comm. · {immeubleCount} imm.
        </Text>
        <View style={styles.metaRight}>
          <CommercialAvatars commercials={commercials} />
        </View>
      </View>

      {immeubleCount > 0 ? (
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
    gap: 8,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primary}1A`,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  pct: {
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 47,
    minHeight: 24,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: "600",
  },
  metaRight: {
    marginLeft: "auto",
  },
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
    marginLeft: 47,
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
});

export default ZoneListCard;
