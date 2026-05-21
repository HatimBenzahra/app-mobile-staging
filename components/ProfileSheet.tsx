import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import type { Commercial, Manager } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ProfileSheetProps = {
  userId: number | null;
  role: string | null;
};

const ProfileSheet = forwardRef<BottomSheet, ProfileSheetProps>(
  ({ userId, role }, ref) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = width >= 700;
    const { data: profile, loading } = useWorkspaceProfile(userId, role);
    const [initials, setInitials] = useState("");

    const snapPoints = useMemo(() => {
      if (isTablet) return ["62%"];
      return ["68%"];
    }, [isTablet]);

    const horizontalPad = isTablet ? 28 : 20;
    const bottomPad = Math.max(insets.bottom, 16) + 16;

    useEffect(() => {
      if (profile) {
        const nom = profile.nom || "";
        const prenom = profile.prenom || "";
        setInitials(`${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase());
      }
    }, [profile]);

    const [confirmingLogout, setConfirmingLogout] = useState(false);

    const handleLogout = async () => {
      await authService.userLogout();
      router.replace("/(auth)/login");
    };

    if (loading || !profile) {
      return (
        <BottomSheet ref={ref} snapPoints={snapPoints} enablePanDownToClose index={-1}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        </BottomSheet>
      );
    }

    const email = (profile as Commercial).email || (profile as Manager).email || "Non renseigné";
    const phone = (profile as Commercial).numTel || (profile as Manager).numTelephone || "Non renseigné";
    const roleLabel = role === "manager" ? "Manager" : "Commercial";

    return (
      <BottomSheet ref={ref} snapPoints={snapPoints} enablePanDownToClose index={-1}>
        <BottomSheetView
          style={[
            styles.container,
            {
              paddingHorizontal: horizontalPad,
              paddingBottom: bottomPad,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.fullName}>
              {profile.prenom} {profile.nom}
            </Text>
            <View style={styles.roleBadge}>
              <Feather name={role === "manager" ? "briefcase" : "user"} size={12} color="#2563EB" />
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Feather name="mail" size={18} color="#64748B" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{email}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Feather name="phone" size={18} color="#64748B" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Téléphone</Text>
                  <Text style={styles.infoValue}>{phone}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Logout */}
          {confirmingLogout ? (
            <View style={styles.confirmCard}>
              <View style={styles.confirmHeader}>
                <View style={styles.confirmIcon}>
                  <Feather name="log-out" size={14} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.confirmTitle}>Se déconnecter ?</Text>
                  <Text style={styles.confirmSubtitle}>
                    Tu devras te reconnecter pour reprendre la prospection.
                  </Text>
                </View>
              </View>
              <View style={styles.confirmActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    styles.confirmBtnSecondary,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => setConfirmingLogout(false)}
                >
                  <Text style={styles.confirmBtnSecondaryText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    styles.confirmBtnPrimary,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={handleLogout}
                >
                  <Feather name="log-out" size={15} color="#FFFFFF" />
                  <Text style={styles.confirmBtnPrimaryText}>Confirmer</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.logoutRow,
                pressed && { backgroundColor: "#FEF2F2" },
              ]}
              onPress={() => setConfirmingLogout(true)}
              accessibilityRole="button"
              accessibilityLabel="Se déconnecter"
            >
              <View style={styles.logoutRowIcon}>
                <Feather name="log-out" size={16} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.logoutRowLabel}>Se déconnecter</Text>
                <Text style={styles.logoutRowHint}>
                  Quitter la session sur cet appareil
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#FCA5A5" />
            </Pressable>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

ProfileSheet.displayName = "ProfileSheet";

export default ProfileSheet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
  },
  header: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 24,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EFF6FF",
    borderWidth: 3,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2563EB",
  },
  fullName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFFFFF",
    marginTop: 4,
  },
  logoutRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutRowLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },
  logoutRowHint: {
    marginTop: 2,
    fontSize: 12,
    color: "#94A3B8",
  },
  confirmCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFFBFB",
    padding: 14,
    gap: 14,
    marginTop: 4,
  },
  confirmHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  confirmIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  confirmSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 17,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmBtnSecondary: {
    backgroundColor: "#F1F5F9",
  },
  confirmBtnSecondaryText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#475569",
  },
  confirmBtnPrimary: {
    backgroundColor: "#DC2626",
  },
  confirmBtnPrimaryText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
