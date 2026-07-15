import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "@/services/api";
import type { NotificationData } from "@/services/api/notifications/notification.service";
import type { UserType } from "@/types/api";

// Comportement quand l'app est AU PREMIER PLAN. On coupe la bannière OS
// (`shouldShowBanner: false`) : l'app affiche elle-même un bandeau in-app
// (cf. usePushNotifications → Toast), façon WhatsApp, ce qui reste visible même
// sur une tablette kiosk où le launcher masque les notifs système. La notif est
// tout de même déposée dans le centre système (`shouldShowList`) et sonne.
// App en arrière-plan / fermée : ce handler ne tourne pas → c'est l'OS qui
// affiche la notification push normalement.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL_ID = "default";

// Token courant mémorisé pour permettre la désinscription au logout sans
// redemander la permission.
let cachedToken: string | null = null;

function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    // easConfig existe sur les builds EAS ; fallback défensif.
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/**
 * Canal Android + permissions + token push Expo. Renvoie null si l'appareil ne
 * peut pas recevoir de push (simulateur, permission refusée, projectId absent).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  // Le push distant nécessite un appareil physique (pas de simulateur).
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId = resolveProjectId();
  if (!projectId) {
    console.warn("[notifications] projectId Expo introuvable");
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (error) {
    console.warn("[notifications] getExpoPushTokenAsync a échoué", error);
    return null;
  }
}

/**
 * Enregistre le token push de cet appareil auprès du backend pour l'utilisateur
 * courant. Best-effort : n'interrompt jamais le flux applicatif.
 */
export async function registerDeviceWithBackend(userType: UserType): Promise<void> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return;
    cachedToken = token;
    await api.notifications.registerDeviceToken({
      token,
      userType,
      platform: Platform.OS,
    });
  } catch (error) {
    console.warn("[notifications] enregistrement du token échoué", error);
  }
}

/** Retire le token de cet appareil (au logout) pour ne plus recevoir de push. */
export async function unregisterDeviceFromBackend(): Promise<void> {
  try {
    const token = cachedToken ?? (await registerForPushNotificationsAsync());
    if (!token) return;
    await api.notifications.unregisterDeviceToken(token);
    cachedToken = null;
  } catch (error) {
    console.warn("[notifications] désinscription du token échouée", error);
  }
}

export type ZoneNotificationHandlers = {
  /** Notification reçue app au premier plan. */
  onForeground?: (data: NotificationData) => void;
  /** L'utilisateur a tapé la notification (app en arrière-plan / fermée). */
  onResponse?: (data: NotificationData) => void;
};

/**
 * Abonne les listeners de notification. Renvoie une fonction de nettoyage.
 */
export function addZoneNotificationListeners(
  handlers: ZoneNotificationHandlers,
): () => void {
  const received = Notifications.addNotificationReceivedListener((notif) => {
    handlers.onForeground?.(
      (notif.request.content.data ?? {}) as NotificationData,
    );
  });
  const response = Notifications.addNotificationResponseReceivedListener(
    (resp) => {
      handlers.onResponse?.(
        (resp.notification.request.content.data ?? {}) as NotificationData,
      );
    },
  );
  return () => {
    received.remove();
    response.remove();
  };
}
