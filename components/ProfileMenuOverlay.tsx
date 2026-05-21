import { useProfileMenu } from "@/hooks/use-profile-menu";
import { authService } from "@/services/auth";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Chip } from "@/components/ui";
import { colors } from "@/constants/theme";

const ROLE_LABELS: Record<string, string> = {
  commercial: "Commercial",
  manager: "Manager",
  admin: "Administrateur",
};

function getInitials(email: string | null) {
  if (!email) return "?";
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[\.\-_]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export default function ProfileMenuOverlay() {
  const router = useRouter();
  const { isVisible, close } = useProfileMenu();
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible) {
      setConfirming(false);
      return;
    }
    void (async () => {
      const [e, r] = await Promise.all([
        authService.getUserEmail(),
        authService.getUserRole(),
      ]);
      setEmail(e);
      setRole(r);
    })();
  }, [isVisible]);

  const handleLogout = useCallback(async () => {
    await authService.userLogout();
    close();
    router.replace("/(auth)/login");
  }, [close, router]);

  if (!isVisible) return null;

  const initials = getInitials(email);
  const roleLabel = role
    ? (ROLE_LABELS[role.toLowerCase()] ?? role)
    : "Utilisateur";

  return (
    <View style={styles.container} pointerEvents="box-none">
      <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.dim} pointerEvents="none" />
      <Pressable style={styles.backdrop} onPress={close} />
      <Card variant="elevated" padding="none" style={[styles.panel, { top: insets.top + 52 }]}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileTextWrap}>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {email ?? "Compte connecté"}
            </Text>
            <Chip tone="primary" label={roleLabel} />
          </View>
        </View>

        <View style={styles.divider} />

        {confirming ? (
          <Card variant="filled" padding="sm" style={{ backgroundColor: colors.dangerSoft }}>
            <Text style={styles.confirmText}>
              Confirmer la déconnexion ?
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnSecondary,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setConfirming(false)}
              >
                <Text style={styles.btnSecondaryText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnDanger,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={handleLogout}
              >
                <Feather name="log-out" size={14} color={colors.textOnPrimary} />
                <Text style={styles.btnDangerText}>Se déconnecter</Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.logoutItem,
              pressed && { backgroundColor: colors.dangerSoft },
            ]}
            onPress={() => setConfirming(true)}
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
          >
            <View style={styles.logoutIcon}>
              <Feather name="log-out" size={15} color={colors.danger} />
            </View>
            <Text style={styles.logoutLabel}>Se déconnecter</Text>
            <Feather name="chevron-right" size={16} color="#FCA5A5" />
          </Pressable>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: "absolute",
    right: 16,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 10,
    minWidth: 280,
    maxWidth: 340,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  avatarText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  profileTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  profileEmail: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 6,
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  logoutIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger,
  },
  confirmText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  confirmRow: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  btnSecondary: {
    backgroundColor: colors.surfaceMuted,
  },
  btnSecondaryText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.textStrong,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnDangerText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.textOnPrimary,
  },
});
