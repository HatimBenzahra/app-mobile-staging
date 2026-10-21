import ImmeubleDetailsView from "@/components/immeubles/ImmeubleDetailsScreen";
import { useImmeubleDetail } from "@/hooks/api/use-immeuble-detail";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import type { Immeuble } from "@/types/api";
import { toImmeubleViewer } from "@/utils/business/immeuble-membres";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LieuDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, porteId: porteIdParam } = useLocalSearchParams<{
    id: string;
    porteId?: string;
  }>();

  const immeubleId = id ? Number(id) : null;
  const autoOpenPorteId = porteIdParam ? Number(porteIdParam) : null;
  const [porteConsumed, setPorteConsumed] = useState(false);

  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const loadIdentity = async () => {
      const [uid, r] = await Promise.all([
        authService.getUserId(),
        authService.getUserRole(),
      ]);
      setUserId(uid);
      setRole(r);
    };
    void loadIdentity();
  }, []);

  const {
    data: profile,
    loading: profileLoading,
    refetch,
  } = useWorkspaceProfile(userId, role);
  const {
    data: detail,
    loading: detailLoading,
    refetch: refetchDetail,
  } = useImmeubleDetail(immeubleId);
  const viewer = useMemo(() => toImmeubleViewer(userId, role), [userId, role]);

  const allImmeubles = useMemo((): Immeuble[] => {
    if (!profile) return [];
    const own: Immeuble[] = (profile as { immeubles?: Immeuble[] }).immeubles ?? [];
    // Pour les managers, inclure aussi les immeubles des commerciaux de l'équipe.
    const team: Immeuble[] =
      ((profile as { commercials?: { immeubles?: Immeuble[] }[] }).commercials ?? [])
        .flatMap((c) => c.immeubles ?? []);
    const byId = new Map<number, Immeuble>();
    for (const imm of [...own, ...team]) byId.set(imm.id, imm);
    return Array.from(byId.values());
  }, [profile]);

  const profileImmeuble = useMemo(
    () => (immeubleId != null ? allImmeubles.find((imm) => imm.id === immeubleId) ?? null : null),
    [allImmeubles, immeubleId],
  );

  // Le détail fait foi (membres, auteur de chaque porte, portes des coéquipiers)
  // et couvre un immeuble absent du profil. Le profil sert d'affichage immédiat
  // et de repli hors ligne.
  const immeuble = detail ?? profileImmeuble;

  const isLoading =
    userId === null ||
    role === null ||
    (!immeuble && (detailLoading || profileLoading));

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleRefresh = useCallback(() => {
    void refetchDetail();
  }, [refetchDetail]);

  const handleDirtyChange = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleAutoOpenPorteConsumed = useCallback(() => {
    setPorteConsumed(true);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!immeuble) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Lieu introuvable.</Text>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ImmeubleDetailsView
      immeuble={immeuble}
      viewer={viewer}
      onBack={handleBack}
      onDirtyChange={handleDirtyChange}
      onRefreshImmeuble={handleRefresh}
      autoOpenPorteId={porteConsumed ? null : autoOpenPorteId}
      onAutoOpenPorteConsumed={handleAutoOpenPorteConsumed}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 16,
  },
  notFoundText: {
    fontSize: 16,
    color: "#555",
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  backButtonText: {
    fontSize: 15,
    color: "#333",
  },
});
