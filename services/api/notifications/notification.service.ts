import { gql } from "@/services/core/graphql";
import type { UserType } from "@/types/api";
import {
  MY_NOTIFICATIONS,
  UNREAD_NOTIFICATION_COUNT,
} from "./notification.queries";
import {
  MARK_ALL_NOTIFICATIONS_READ,
  MARK_NOTIFICATION_READ,
  REGISTER_DEVICE_TOKEN,
  UNREGISTER_DEVICE_TOKEN,
} from "./notification.mutations";

export type NotificationType = "ZONE_ASSIGNED" | "ZONE_UNASSIGNED";

/** Contexte transporté par la notification (aligné sur le backend). */
export type NotificationData = {
  type?: NotificationType;
  zoneId?: number;
  zoneName?: string;
  targetCount?: number;
};

/** Notification in-app (centre de notifications). */
export type AppNotification = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData | null;
  readAt?: string | null;
  createdAt: string;
};

export type RegisterDeviceTokenInput = {
  token: string;
  userType: UserType;
  platform?: string;
};

export const notificationApi = {
  async getMine(): Promise<AppNotification[]> {
    const response = await gql<{ myNotifications: AppNotification[] }>(
      MY_NOTIFICATIONS,
    );
    return response.myNotifications;
  },

  async unreadCount(): Promise<number> {
    const response = await gql<{ unreadNotificationCount: number }>(
      UNREAD_NOTIFICATION_COUNT,
    );
    return response.unreadNotificationCount;
  },

  async registerDeviceToken(input: RegisterDeviceTokenInput): Promise<boolean> {
    const response = await gql<
      { registerDeviceToken: boolean },
      { input: RegisterDeviceTokenInput }
    >(REGISTER_DEVICE_TOKEN, { input });
    return response.registerDeviceToken;
  },

  async unregisterDeviceToken(token: string): Promise<boolean> {
    const response = await gql<
      { unregisterDeviceToken: boolean },
      { token: string }
    >(UNREGISTER_DEVICE_TOKEN, { token });
    return response.unregisterDeviceToken;
  },

  async markRead(id: number): Promise<boolean> {
    const response = await gql<
      { markNotificationRead: boolean },
      { id: number }
    >(MARK_NOTIFICATION_READ, { id });
    return response.markNotificationRead;
  },

  async markAllRead(): Promise<boolean> {
    const response = await gql<{ markAllNotificationsRead: boolean }>(
      MARK_ALL_NOTIFICATIONS_READ,
    );
    return response.markAllNotificationsRead;
  },
};
