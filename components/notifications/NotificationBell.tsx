import { Icon } from "@/components/ui";
import { sidebar } from "@/constants/theme";
import { useUnreadNotificationCount } from "@/hooks/api/use-unread-notification-count";
import { authService } from "@/services/auth";
import type { UserType } from "@/types/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

function roleToUserType(role: string | null): UserType | null {
  if (role === "manager") return "MANAGER";
  if (role === "commercial") return "COMMERCIAL";
  return null;
}

/**
 * Cloche du menu latéral : ouvre le centre de notifications et affiche un badge
 * du nombre de non-lus. Toujours visible (y compris sur la carte plein écran).
 */
export default function NotificationBell() {
  const router = useRouter();
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

  const { data: unread } = useUnreadNotificationCount(userId, userType);
  const count = unread ?? 0;

  return (
    <Pressable
      style={styles.button}
      onPress={() => router.push("/notifications")}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <Icon name="bell" size={22} color={sidebar.textMuted} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sidebar.surface,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sidebar.active,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: sidebar.activeText,
  },
});
