import { api } from "@/services/api";
import type { UserType } from "@/types/api";
import { useCallback } from "react";
import { useApiCall, type UseApiState } from "./use-api-call";

/**
 * Nombre de notifications non lues de l'utilisateur courant. Alimente le badge
 * de la cloche. Invalidé à la réception d'une notification (voir data-sync).
 */
export function useUnreadNotificationCount(
  userId: number | null,
  userType: UserType | null,
): UseApiState<number> {
  const fetchCount = useCallback(async (): Promise<number> => {
    if (userId == null || userId <= 0 || userType == null) return 0;
    return api.notifications.unreadCount();
  }, [userId, userType]);

  return useApiCall<number>(fetchCount, [userId, userType], {
    cacheKey: `unread-notification-count:${userType ?? "none"}:${userId ?? 0}`,
    cacheTimeMs: 30_000,
  });
}
