import { Card, Chip, Icon } from "@/components/ui";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { useUserZoneHistory } from "@/hooks/api/use-user-zone-history";
import { useZonesForUser } from "@/hooks/api/use-zones-for-user";
import type { UserType } from "@/types/api";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ZoneBoundsInput } from "./geo-hull";
import { sheetStyles } from "./sheet-styles";

/** Zone focusable sur la carte : géométrie (ZoneBoundsInput) + identifiant. */
type FocusableZone = ZoneBoundsInput & { id: number };

type ZonesHistoryModalProps = {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  userType: UserType | null;
  onFocusZone: (zone: FocusableZone) => void;
  onViewDetail: (zoneId: number) => void;
};

/** DateTime ISO → "JJ/MM/AAAA" (dates courtes de la période d'assignation). */
function formatShortDate(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = date.getDate().toString().padStart(2, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

type ZoneEntryRowProps = {
  name: string;
  creatorName?: string | null;
  badge?: string;
  period?: string;
  stats?: { key: string; label: string }[];
  onPress: () => void;
  onViewDetail: () => void;
};

/**
 * Ligne réutilisable pour une zone, partagée par les sections « En cours » et
 * « Historique ». Tap sur la ligne → focus carte ; chevron → détail read-only.
 */
function ZoneEntryRow({
  name,
  creatorName,
  badge,
  period,
  stats,
  onPress,
  onViewDetail,
}: ZoneEntryRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.rowMain}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowName} numberOfLines={1}>
            {name}
          </Text>
          {badge ? <Chip label={badge} tone="success" /> : null}
        </View>
        <View style={styles.rowMetaLine}>
          <Icon name="user" size={12} color={colors.textMuted} />
          <Text style={styles.rowMeta} numberOfLines={1}>
            Créée par {creatorName?.trim() || "—"}
          </Text>
        </View>
        {period ? (
          <View style={styles.rowMetaLine}>
            <Icon name="calendar" size={12} color={colors.textMuted} />
            <Text style={styles.rowMeta} numberOfLines={1}>
              {period}
            </Text>
          </View>
        ) : null}
        {stats && stats.length > 0 ? (
          <View style={styles.chipRow}>
            {stats.map((s) => (
              <Chip key={s.key} label={s.label} tone="neutral" />
            ))}
          </View>
        ) : null}
      </View>
      <Pressable
        style={styles.detailButton}
        onPress={onViewDetail}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Voir le détail"
      >
        <Icon name="chevron-right" size={20} color={colors.info} />
      </Pressable>
    </Pressable>
  );
}

/**
 * Modal « Mes zones » (lecture seule), même form-factor que `ZoneSheet` (Card
 * flottante bas d'écran, safe-area, bouton fermer — châssis partagé via
 * `sheetStyles`). Deux sections : « En cours » (zones actives, source
 * `useZonesForUser`) et « Historique » (assignations passées, source
 * `useUserZoneHistory`, triées par fin d'assignation décroissante). Chaque entrée
 * affiche son créateur ; le tap recentre la carte, le chevron ouvre le détail.
 */
export default function ZonesHistoryModal({
  open,
  onClose,
  userId,
  userType,
  onFocusZone,
  onViewDetail,
}: ZonesHistoryModalProps) {
  const insets = useSafeAreaInsets();

  // Ne déclenche les requêtes qu'à l'ouverture (userId gaté). `useZonesForUser`
  // partage sa cacheKey avec la carte terrain → lecture instantanée du cache.
  const gatedUserId = open ? userId : null;
  const currentQuery = useZonesForUser(gatedUserId, userType);
  const historyQuery = useUserZoneHistory(gatedUserId, userType);

  const currentZones = useMemo(
    () => currentQuery.data ?? [],
    [currentQuery.data],
  );
  const sortedHistory = useMemo(() => {
    return [...(historyQuery.data ?? [])].sort((a, b) => {
      const ta = a.unassignedAt ? new Date(a.unassignedAt).getTime() : 0;
      const tb = b.unassignedAt ? new Date(b.unassignedAt).getTime() : 0;
      return tb - ta;
    });
  }, [historyQuery.data]);

  const handleFocus = useCallback(
    (zone: FocusableZone) => {
      onFocusZone(zone);
      onClose();
    },
    [onFocusZone, onClose],
  );

  const handleDetail = useCallback(
    (zoneId: number) => {
      onViewDetail(zoneId);
      onClose();
    },
    [onViewDetail, onClose],
  );

  if (!open) return null;

  const isEmpty = currentZones.length === 0 && sortedHistory.length === 0;
  const isLoading = currentQuery.loading || historyQuery.loading;

  return (
    <Card
      variant="elevated"
      padding="md"
      style={[
        sheetStyles.panel,
        styles.panel,
        { paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}
    >
      <View style={sheetStyles.header}>
        <View style={[sheetStyles.headerIcon, styles.headerIconAccent]}>
          <Icon name="clock" size={22} color={colors.primary} />
        </View>
        <View style={sheetStyles.headerText}>
          <Text style={sheetStyles.title} numberOfLines={1}>
            Mes zones
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            En cours et historique
          </Text>
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          isLoading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Icon name="inbox" size={26} color={colors.textSubtle} />
              <Text style={styles.emptyText}>Aucune zone</Text>
            </View>
          )
        ) : (
          <>
            {currentZones.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  En cours ({currentZones.length})
                </Text>
                {currentZones.map((zone) => (
                  <ZoneEntryRow
                    key={`current-${zone.id}`}
                    name={zone.nom}
                    creatorName={zone.createdByName}
                    badge="En cours"
                    onPress={() => handleFocus(zone)}
                    onViewDetail={() => handleDetail(zone.id)}
                  />
                ))}
              </View>
            ) : null}

            {sortedHistory.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Historique ({sortedHistory.length})
                </Text>
                {sortedHistory.map((entry) => {
                  const zone = entry.zone;
                  return (
                    <ZoneEntryRow
                      key={`history-${entry.id}`}
                      name={zone?.nom ?? `Zone #${entry.zoneId}`}
                      creatorName={zone?.createdByName}
                      period={`${formatShortDate(entry.assignedAt)} → ${formatShortDate(entry.unassignedAt)}`}
                      stats={[
                        {
                          key: "contrats",
                          label: `${entry.totalContratsSignes} contrat${entry.totalContratsSignes !== 1 ? "s" : ""}`,
                        },
                        {
                          key: "immeubles",
                          label: `${entry.totalImmeublesVisites} immeuble${entry.totalImmeublesVisites !== 1 ? "s" : ""}`,
                        },
                      ]}
                      onPress={() => {
                        if (zone) handleFocus(zone);
                      }}
                      onViewDetail={() => handleDetail(entry.zoneId)}
                    />
                  );
                })}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  panel: {
    maxHeight: "72%",
  },
  headerIconAccent: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12.5,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.1,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowName: {
    flexShrink: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  rowMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rowMeta: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 2,
  },
  detailButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.infoSoft,
  },
  emptyBox: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing["3xl"],
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
});
