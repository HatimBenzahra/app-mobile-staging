import { useToast } from "@/components/ui";
import { syncWorkspaceMutation } from "@/hooks/api/data-sync";
import { invalidateApiCacheByPrefix } from "@/hooks/api/use-api-call";
import type { NotificationData } from "@/services/api/notifications/notification.service";
import { authService } from "@/services/auth";
import {
  addZoneNotificationListeners,
  registerDeviceWithBackend,
} from "@/services/notifications/notifications.service";
import type { UserType } from "@/types/api";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";

function roleToUserType(role: string | null): UserType {
  return role === "manager" ? "MANAGER" : "COMMERCIAL";
}

// data.type === "ZONE_UNASSIGNED" → retrait ; sinon assignation.
function eventFromData(data: NotificationData) {
  return data?.type === "ZONE_UNASSIGNED"
    ? ("ZONE_UNASSIGNED" as const)
    : ("ZONE_ASSIGNED" as const);
}

// Libellé du bandeau in-app à partir du contenu de la notification.
function bannerMessage(data: NotificationData): string {
  const zone = data?.zoneName?.trim();
  if (data?.type === "ZONE_UNASSIGNED") {
    return zone ? `Zone retirée : ${zone}` : "Une zone vous a été retirée";
  }
  return zone
    ? `Nouvelle zone assignée : ${zone}`
    : "Une nouvelle zone vous a été assignée";
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
 * - à la réception (foreground), affiche un bandeau in-app (rendu par l'app,
 *   visible même sur tablette kiosk) ET invalide les caches carte/notifs
 *   (⇒ la carte + le badge se rafraîchissent) ; au tap (background), ouvre le
 *   centre de notifications,
 * - au retour au premier plan, filet de sécurité qui recharge la carte et le
 *   centre de notifs (cas d'un push délivré app en arrière-plan).
 * À monter une seule fois, dans le layout de la zone authentifiée.
 */
export function usePushNotifications(): void {
  const router = useRouter();
  const toast = useToast();

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
    return addZoneNotificationListeners({
      onForeground: (data) => {
        // 1. Bandeau in-app (l'OS ne montre pas de bannière au premier plan,
        //    cf. setNotificationHandler). Tap → centre de notifs.
        toast.show({
          message: bannerMessage(data),
          variant: "info",
          actionLabel: "Voir",
          onAction: () => router.push("/notifications"),
        });
        // 2. Rafraîchit carte + badge + liste.
        syncWorkspaceMutation(eventFromData(data));
      },
      onResponse: (data) => {
        syncWorkspaceMutation(eventFromData(data));
        router.push("/notifications");
      },
    });
  }, [router, toast]);

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
