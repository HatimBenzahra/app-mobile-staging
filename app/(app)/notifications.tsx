import { Icon, useToast } from "@/components/ui";
import { colors, fontSize, fontWeight, radius, shadows, spacing } from "@/constants/theme";
import { useNotifications } from "@/hooks/api/use-notifications";
import { invalidateApiCacheByPrefix } from "@/hooks/api/use-api-call";
import { useZonesForUser } from "@/hooks/api/use-zones-for-user";
import { useMapFocus } from "@/hooks/use-map-focus";
import { api } from "@/services/api";
import type { AppNotification } from "@/services/api/notifications/notification.service";
import type { ZoneForUser } from "@/services/api/zones/zone.service";
import { authService } from "@/services/auth";
import type { UserType } from "@/types/api";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function roleToUserType(role: string | null): UserType | null {
  if (role === "manager") return "MANAGER";
  if (role === "commercial") return "COMMERCIAL";
  return null;
}

// Libellé relatif court et robuste (pas de dépendance externe).
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "à l'instant";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 7) return `il y a ${j} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

type NotificationCardProps = {
  notif: AppNotification;
  /** La zone est-elle actuellement affichable sur la carte (géométrie connue) ? */
  canViewOnMap: boolean;
  onViewOnMap: (notif: AppNotification) => void;
  onViewDetail: (notif: AppNotification) => void;
};

function NotificationCard({
  notif,
  canViewOnMap,
  onViewOnMap,
  onViewDetail,
}: NotificationCardProps) {
  const unread = !notif.readAt;
  const isUnassign = notif.type === "ZONE_UNASSIGNED";
  const hasZone = notif.data?.zoneId != null;

  return (
    <View style={[styles.card, unread && styles.cardUnread]}>
      <View style={styles.cardTop}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: isUnassign ? colors.dangerSoft : colors.primarySoft },
          ]}
        >
          <Icon
            name={isUnassign ? "alert-circle" : "map"}
            size={20}
            color={isUnassign ? colors.danger : colors.primary}
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {notif.title}
          </Text>
          <Text style={styles.cardText} numberOfLines={2}>
            {notif.body}
          </Text>
          <Text style={styles.cardTime}>{relativeTime(notif.createdAt)}</Text>
        </View>
        {unread ? <View style={styles.unreadDot} /> : null}
      </View>

      {hasZone ? (
        <View style={styles.actionsRow}>
          {canViewOnMap ? (
            <Pressable
              style={styles.action}
              onPress={() => onViewOnMap(notif)}
              accessibilityRole="button"
            >
              <Icon name="map" size={16} color={colors.info} />
              <Text style={styles.actionText}>Voir sur la carte</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.action}
            onPress={() => onViewDetail(notif)}
            accessibilityRole="button"
          >
            <Icon name="eye" size={16} color={colors.info} />
            <Text style={styles.actionText}>Voir les détails</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { focusOnZone } = useMapFocus();
  const [userId, setUserId] = useState<number | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);

  useEffect(() => {
    void (async () => {
      const id = await authService.getUserId();
      const role = await authService.getUserRole();
      setUserId(id);
      setUserType(roleToUserType(role));
    })();
  }, []);

  const { data, loading, refetch } = useNotifications(userId, userType);
  const notifications = data ?? [];
  const hasUnread = notifications.some((n) => !n.readAt);

  // Zones actuellement affichables sur la carte (source de la géométrie pour
  // « Voir sur la carte » — la notif ne transporte pas le polygone). Partage sa
  // cacheKey avec la carte terrain → lecture instantanée du cache.
  const { data: zonesForUser } = useZonesForUser(userId, userType);
  const zonesById = useMemo(() => {
    const map = new Map<number, ZoneForUser>();
    for (const zone of zonesForUser ?? []) map.set(zone.id, zone);
    return map;
  }, [zonesForUser]);

  const invalidate = useCallback(() => {
    invalidateApiCacheByPrefix("notifications:");
    invalidateApiCacheByPrefix("unread-notification-count:");
  }, []);

  const markReadIfNeeded = useCallback(
    async (notif: AppNotification) => {
      if (notif.readAt) return;
      try {
        await api.notifications.markRead(notif.id);
        invalidate();
      } catch {
        // best-effort : l'action de navigation prime
      }
    },
    [invalidate],
  );

  const handleViewOnMap = useCallback(
    (notif: AppNotification) => {
      const zoneId = notif.data?.zoneId;
      if (zoneId == null) return;
      const zone = zonesById.get(zoneId);
      if (!zone) {
        toast.show({
          message: "Cette zone n'est plus disponible sur la carte.",
          variant: "info",
        });
        return;
      }
      void markReadIfNeeded(notif);
      // Arme le focus carte ; l'hôte des onglets bascule sur l'onglet Carte au
      // retour (il observe `focusTarget`). On revient donc à la pile d'onglets.
      focusOnZone(zone);
      router.back();
    },
    [zonesById, focusOnZone, markReadIfNeeded, toast],
  );

  const handleViewDetail = useCallback(
    (notif: AppNotification) => {
      const zoneId = notif.data?.zoneId;
      if (zoneId == null) return;
      void markReadIfNeeded(notif);
      router.push(`/zone/${zoneId}`);
    },
    [markReadIfNeeded],
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.notifications.markAllRead();
      invalidate();
      await refetch();
    } catch {
      // best-effort
    }
  }, [invalidate, refetch]);

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const zoneId = item.data?.zoneId;
      const canViewOnMap =
        item.type === "ZONE_ASSIGNED" && zoneId != null && zonesById.has(zoneId);
      return (
        <NotificationCard
          notif={item}
          canViewOnMap={canViewOnMap}
          onViewOnMap={handleViewOnMap}
          onViewDetail={handleViewDetail}
        />
      );
    },
    [zonesById, handleViewOnMap, handleViewDetail],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconFab} onPress={() => router.back()}>
          <Icon name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable
          style={styles.markAllBtn}
          onPress={() => void handleMarkAllRead()}
          disabled={!hasUnread}
        >
          <Text
            style={[styles.markAllText, !hasUnread && styles.markAllTextDisabled]}
          >
            Tout lire
          </Text>
        </Pressable>
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <Icon name="bell" size={30} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptyText}>
            Vous serez notifié lorsqu&apos;une zone vous sera assignée.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => void refetch()} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
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
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  markAllText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  markAllTextDisabled: {
    color: colors.textMuted,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  card: {
    gap: spacing.md,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardUnread: {
    borderColor: colors.primaryRing,
    backgroundColor: colors.primarySoft,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  cardText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  cardTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.infoSoft,
    backgroundColor: colors.infoSoft,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.info,
  },
});
