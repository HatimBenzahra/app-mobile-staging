import { Card } from "@/components/ui";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { useTerrainModeRequest } from "@/hooks/use-terrain-mode-request";
import { authService } from "@/services/auth";
import type { Manager } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ZonesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { requestTerrainMode } = useTerrainModeRequest();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      if (!isMounted) return;
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
    return () => {
      isMounted = false;
    };
  }, []);

  const { data: profile, loading, refetch } = useWorkspaceProfile(userId, role);

  const managerProfile = useMemo(
    () => (role === "manager" ? (profile as Manager | null) : null),
    [profile, role],
  );

  const zones = useMemo(() => managerProfile?.zones ?? [], [managerProfile]);

  // Nombre de commerciaux assignés par zone : un commercial est assigné à une
  // zone si sa liste `zones` contient l'id de celle-ci (profil manager).
  const assignedCountByZone = useMemo(() => {
    const counts = new Map<number, number>();
    (managerProfile?.commercials ?? []).forEach((commercial) => {
      (commercial.zones ?? []).forEach((zone) => {
        counts.set(zone.id, (counts.get(zone.id) ?? 0) + 1);
      });
    });
    return counts;
  }, [managerProfile]);

  if (role === null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <Card variant="outlined" padding="lg" style={styles.stateCard}>
          <Feather name="loader" size={28} color={colors.textSubtle} />
          <Text style={styles.stateTitle}>Chargement</Text>
          <Text style={styles.stateText}>Récupération du profil manager...</Text>
        </Card>
      </View>
    );
  }

  if (role !== "manager") {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <Card variant="outlined" padding="lg" style={styles.stateCard}>
          <Feather name="lock" size={28} color={colors.textSubtle} />
          <Text style={styles.stateTitle}>Accès manager</Text>
          <Text style={styles.stateText}>Cette page est réservée aux managers.</Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void refetch()} tintColor={colors.primary} />
      }
    >
      <Text style={styles.heading}>Zones</Text>

      <Pressable style={styles.createButton} onPress={() => requestTerrainMode("ZONE")}>
        <Feather name="plus" size={18} color={colors.textOnPrimary} />
        <Text style={styles.createText}>Créer une zone</Text>
      </Pressable>

      {zones.length === 0 ? (
        <Card variant="outlined" padding="lg" style={styles.stateCard}>
          <Feather name="grid" size={28} color={colors.textSubtle} />
          <Text style={styles.stateTitle}>Aucune zone</Text>
          <Text style={styles.stateText}>
            Trace une zone sur la carte pour l&apos;assigner à ton équipe.
          </Text>
        </Card>
      ) : (
        zones.map((zone) => {
          const count = assignedCountByZone.get(zone.id) ?? 0;
          return (
            <Pressable
              key={zone.id}
              onPress={() =>
                router.push(
                  `/zone/${zone.id}` as Parameters<typeof router.push>[0],
                )
              }
            >
              <Card variant="elevated" padding="md" style={styles.zoneCard}>
                <View style={styles.zoneIcon}>
                  <Feather name="grid" size={18} color={colors.info} />
                </View>
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName} numberOfLines={1}>
                    {zone.nom}
                  </Text>
                  <Text style={styles.zoneMeta}>
                    {count > 1
                      ? `${count} commerciaux assignés`
                      : `${count} commercial assigné`}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textSubtle} />
              </Card>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  createButton: {
    height: 48,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },
  createText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  zoneCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.infoSoft,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  zoneMeta: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  stateCard: {
    alignItems: "center",
    gap: spacing.sm,
  },
  stateTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  stateText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});
