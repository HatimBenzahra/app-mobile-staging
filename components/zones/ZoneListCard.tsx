import { Chip, PressableCard, ProgressBar } from "@/components/ui";
import { polygonAreaKm2 } from "@/components/carte-terrain/geo-hull";
import {
  colors,
  fontSize,
  fontWeight,
  habitat,
  radius,
  spacing,
} from "@/constants/theme";
import type { ZoneForUser } from "@/services/api/zones/zone.service";
import type { Commercial } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export type ZoneCommercial = Pick<Commercial, "id" | "prenom" | "nom">;

/**
 * Petite palette stable pour dériver une couleur d'accent depuis un id (zone
 * ou commercial) de façon déterministe. Restreinte au thème + accents habitat
 * pour rester cohérente avec le reste de l'app.
 */
const ACCENTS = [
  colors.primary,
  colors.info,
  colors.success,
  colors.warning,
  habitat.pavillon,
  habitat.quartier,
] as const;

function accentForId(id: number): string {
  if (!Number.isFinite(id)) return colors.info;
  return ACCENTS[Math.abs(id) % ACCENTS.length] ?? colors.info;
}

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
        <View
          key={commercial.id}
          style={[styles.avatar, { backgroundColor: accentForId(commercial.id) }]}
        >
          <Text style={styles.avatarText}>{initials(commercial)}</Text>
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.avatar, styles.avatarExtra]}>
          <Text style={styles.avatarExtraText}>+{extra}</Text>
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
  const accent = accentForId(zone.id);
  const immeubleCount = zone.immeubles?.length ?? 0;
  const areaKm2 = useMemo(() => zoneAreaKm2(zone), [zone]);

  const areaLabel = `${areaKm2 < 1 ? areaKm2.toFixed(2) : areaKm2.toFixed(1)} km²`;
  const prospected = Math.min(Math.max(prospectedCount, 0), immeubleCount);
  const progress = immeubleCount > 0 ? (prospected / immeubleCount) * 100 : 0;

  return (
    <PressableCard variant="elevated" padding="none" style={styles.card} onPress={onPress}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {zone.nom}
          </Text>
          <Feather name="chevron-right" size={20} color={colors.textSubtle} />
        </View>

        <View style={styles.chipsRow}>
          <Chip icon="maximize" label={areaLabel} tone="info" />
          <Chip
            icon="users"
            label={`${commercials.length} comm.`}
            tone="neutral"
          />
          <Chip icon="home" label={`${immeubleCount} imm.`} tone="neutral" />
        </View>

        <CommercialAvatars commercials={commercials} />

        {immeubleCount > 0 ? (
          <View style={styles.progressBlock}>
            <ProgressBar value={progress} color={accent} />
            <Text style={styles.progressLabel}>
              {prospected} / {immeubleCount} immeubles prospectés
            </Text>
          </View>
        ) : null}
      </View>
    </PressableCard>
  );
}

export const ZoneListCard = memo(ZoneListCardBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    overflow: "hidden",
  },
  accentBar: {
    width: 5,
  },
  body: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  avatars: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  avatarText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  avatarExtra: {
    backgroundColor: colors.surfaceMuted,
  },
  avatarExtraText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  progressBlock: {
    gap: spacing.xs,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});

export default ZoneListCard;
