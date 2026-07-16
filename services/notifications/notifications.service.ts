import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "@/services/api";
import type { NotificationData } from "@/services/api/notifications/notification.service";
import type { UserType } from "@/types/api";

// Comportement quand l'app est AU PREMIER PLAN. On coupe la bannière OS
// (`shouldShowBanner: true`) : au premier plan aussi, on laisse l'OS afficher
// sa vraie bannière système — elle porte l'icône ProWin (`notification_icon`)
// et sa couleur, identique à l'état app fermée. La notif est aussi déposée dans
// le centre système (`shouldShowList`) et sonne.
// App en arrière-plan / fermée : ce handler ne tourne pas → c'est l'OS qui
// affiche la notification push normalement.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL_ID = "default";

// Token courant mémorisé pour permettre la désinscription au logout sans
// redemander la permission.
let cachedToken: string | null = null;

/**
 * Canal Android + permissions + token push FCM natif de l'appareil. Renvoie
 * null si l'appareil ne peut pas recevoir de push (simulateur, permission
 * refusée). Le token FCM est envoyé au backend, qui pousse directement via
 * Firebase Admin (sans passer par le service push Expo).
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

  try {
    // Token FCM natif de l'appareil (via le SDK Firebase embarqué grâce à
    // google-services.json). C'est ce token que le backend cible avec
    // Firebase Admin pour envoyer le push.
    const { data } = await Notifications.getDevicePushTokenAsync();
    return typeof data === "string" ? data : null;
  } catch (error) {
    console.warn("[notifications] getDevicePushTokenAsync a échoué", error);
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

/**
 * Notification entrante, générique : le contexte structuré (`data`, dont
 * `data.type`) + le `title`/`body` affichés. Permet de traiter n'importe quel
 * type de notification (zone, contrat, RDV, …) de façon uniforme.
 */
export type IncomingNotification = {
  data: NotificationData;
  title?: string;
  body?: string;
};

export type NotificationHandlers = {
  /** Notification reçue app au premier plan. */
  onForeground?: (notif: IncomingNotification) => void;
  /** L'utilisateur a tapé la notification (app en arrière-plan / fermée). */
  onResponse?: (notif: IncomingNotification) => void;
};

function toIncoming(content: {
  data?: unknown;
  title?: string | null;
  body?: string | null;
}): IncomingNotification {
  return {
    data: (content.data ?? {}) as NotificationData,
    title: content.title ?? undefined,
    body: content.body ?? undefined,
  };
}

/**
 * Abonne les listeners de notification (générique, tout type). Renvoie une
 * fonction de nettoyage.
 */
export function addNotificationListeners(
  handlers: NotificationHandlers,
): () => void {
  const received = Notifications.addNotificationReceivedListener((notif) => {
    handlers.onForeground?.(toIncoming(notif.request.content));
  });
  const response = Notifications.addNotificationResponseReceivedListener(
    (resp) => {
      handlers.onResponse?.(toIncoming(resp.notification.request.content));
    },
  );
  return () => {
    received.remove();
    response.remove();
  };
}
