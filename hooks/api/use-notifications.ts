import { api } from "@/services/api";
import type { AppNotification } from "@/services/api/notifications/notification.service";
import type { UserType } from "@/types/api";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

/**
 * Liste des notifications in-app de l'utilisateur courant (centre de
 * notifications). Le backend dérive l'utilisateur du token ; `userId`/`userType`
 * ne servent qu'à la cacheKey et à ne pas fetch avant que l'identité soit connue.
 */
export function useNotifications(
  userId: number | null,
  userType: UserType | null,
): UseApiState<AppNotification[]> {
  const fetchNotifications = useCallback(async (): Promise<AppNotification[]> => {
    if (userId == null || userId <= 0 || userType == null) return [];
    return api.notifications.getMine();
  }, [userId, userType]);

  return useApiCall<AppNotification[]>(fetchNotifications, [userId, userType], {
    cacheKey: `notifications:${userType ?? "none"}:${userId ?? 0}`,
    cacheTimeMs: 30_000,
    persist: true,
    skipPersistEmpty: true,
  });
}
