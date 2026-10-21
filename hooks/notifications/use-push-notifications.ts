import { syncWorkspaceMutation } from "@/hooks/api/data-sync";
import { invalidateApiCacheByPrefix } from "@/hooks/api/use-api-call";
import {
  getNotificationImmeubleId,
  type NotificationData,
} from "@/services/api/notifications/notification.service";
import { authService } from "@/services/auth";
import {
  addNotificationListeners,
  registerDeviceWithBackend,
} from "@/services/notifications/notifications.service";
import type { UserType } from "@/types/api";
import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";

function roleToUserType(role: string | null): UserType {
  return role === "manager" ? "MANAGER" : "COMMERCIAL";
}

// Types liés aux zones : seuls ceux-ci déclenchent le refresh carte/zone.
function isZoneType(type?: string): boolean {
  return type === "ZONE_ASSIGNED" || type === "ZONE_UNASSIGNED";
}

// data.type === "ZONE_UNASSIGNED" → retrait ; sinon assignation.
function eventFromData(data: NotificationData) {
  return data?.type === "ZONE_UNASSIGNED"
    ? ("ZONE_UNASSIGNED" as const)
    : ("ZONE_ASSIGNED" as const);
}

// Écran ouvert au tap, selon le type. Table extensible : ajouter une entrée par
// nouveau type pour un deep-link dédié. Défaut = centre de notifications.
function routeForData(data: NotificationData): Href {
  const immeubleId = getNotificationImmeubleId(data);
  if (immeubleId !== null) return `/lieu/${immeubleId}`;
  return "/notifications";
}

// Rafraîchit ce que la notification rend périmé : la carte pour une zone ;
// Lieux, carte et profil pour un immeuble partagé (il vient d'apparaître dans
// l'espace de l'utilisateur), plus le badge de la cloche.
function syncForData(data: NotificationData): void {
  if (isZoneType(data?.type)) {
    syncWorkspaceMutation(eventFromData(data));
    return;
  }
  const immeubleId = getNotificationImmeubleId(data);
  if (immeubleId !== null) {
    syncWorkspaceMutation("IMMEUBLE_CREATED", { immeubleId });
    invalidateApiCacheByPrefix("notifications:");
    invalidateApiCacheByPrefix("unread-notification-count:");
  }
}

// Caches à rafraîchir au retour au premier plan (filet de sécurité pour un push
// reçu pendant que l'app était en arrière-plan) : tout ce qui alimente la carte
// + le centre de notifs. Ce n'est PAS du polling : déclenché uniquement sur
// l'événement AppState "active".
const FOREGROUND_REFRESH_PREFIXES = [
  "current-assignment:",
  "user-zone-history:",
  "zones-for-user:",
  "workspace-profile:",
  "mobile-map-quartiers:",
  "mobile-manager-map-places:",
  "notifications:",
  "unread-notification-count:",
];

function refreshForegroundCaches(): void {
  for (const prefix of FOREGROUND_REFRESH_PREFIXES) {
    invalidateApiCacheByPrefix(prefix);
  }
}

/**
 * Cycle de vie des notifications push pour une session authentifiée :
 * - enregistre le token push de l'appareil auprès du backend,
 * - à la réception (foreground), l'OS affiche sa bannière système (cf.
 *   setNotificationHandler → shouldShowBanner) ; on se contente de rafraîchir la
 *   carte + le badge pour les notifs de zone,
 * - au tap, ouvre l'écran routé selon le type (défaut : centre de notifications),
 * - au retour au premier plan, filet de sécurité qui recharge la carte et le
 *   centre de notifs (cas d'un push délivré app en arrière-plan).
 * À monter une seule fois, dans le layout de la zone authentifiée.
 */
export function usePushNotifications(): void {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const role = await authService.getUserRole();
      if (cancelled || !role) return;
      await registerDeviceWithBackend(roleToUserType(role));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return addNotificationListeners({
      onForeground: (notif) => {
        // L'OS affiche la bannière système (icône ProWin). Ici on ne fait que
        // rafraîchir les données concernées (zone, immeuble partagé).
        syncForData(notif.data);
      },
      onResponse: (notif) => {
        syncForData(notif.data);
        router.push(routeForData(notif.data));
      },
    });
  }, [router]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      // Filet : couvre une (dé)assignation dont le push est arrivé app en
      // arrière-plan → au retour, on recharge la carte + le centre de notifs.
      refreshForegroundCaches();
    });
    return () => subscription.remove();
  }, []);
}
