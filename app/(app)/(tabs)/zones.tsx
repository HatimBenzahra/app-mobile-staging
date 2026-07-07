import { Card, Chip } from "@/components/ui";
import {
  ZoneListCard,
  zoneAreaKm2,
  type ZoneCommercial,
} from "@/components/zones/ZoneListCard";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { useZoneStatisticsList } from "@/hooks/api/use-zone-statistics-list";
import { useZonesForUser } from "@/hooks/api/use-zones-for-user";
import { useZoneDetailPanel } from "@/hooks/use-zone-detail-panel";
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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SortKey = "nom" | "superficie" | "commerciaux";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "nom", label: "Nom" },
  { key: "superficie", label: "Superficie" },
  { key: "commerciaux", label: "Commerciaux" },
];

export default function ZonesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { openZoneDetail } = useZoneDetailPanel();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("nom");

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

  const isManager = role === "manager";

  const { data: profile, refetch: refetchProfile } = useWorkspaceProfile(
    userId,
    role,
  );
  const {
    data: zonesData,
    loading,
    refetch: refetchZones,
  } = useZonesForUser(isManager ? userId : null, "MANAGER");
  const { data: statsData, refetch: refetchStats } = useZoneStatisticsList();

  const managerProfile = useMemo(
    () => (isManager ? (profile as Manager | null) : null),
    [profile, isManager],
  );

  const zones = useMemo(() => zonesData ?? [], [zonesData]);

  // Commerciaux assignés par zone : un commercial est assigné à une zone si sa
  // liste `zones` (profil manager) contient l'id de celle-ci.
  const commercialsByZone = useMemo(() => {
    const map = new Map<number, ZoneCommercial[]>();
    (managerProfile?.commercials ?? []).forEach((commercial) => {
      (commercial.zones ?? []).forEach((zone) => {
        const list = map.get(zone.id) ?? [];
        list.push({
          id: commercial.id,
          prenom: commercial.prenom,
          nom: commercial.nom,
        });
        map.set(zone.id, list);
      });
    });
    return map;
  }, [managerProfile]);

  // Immeubles prospectés par zone (agrégat `zoneStatistics`), mappé par zoneId.
  const prospectedByZone = useMemo(() => {
    const map = new Map<number, number>();
    (statsData ?? []).forEach((stat) => {
      map.set(stat.zoneId, stat.totalImmeublesProspectes);
    });
    return map;
  }, [statsData]);

  const visibleZones = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? zones.filter((zone) => zone.nom.toLowerCase().includes(query))
      : zones;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "superficie") {
        return zoneAreaKm2(b) - zoneAreaKm2(a);
      }
      if (sort === "commerciaux") {
        return (
          (commercialsByZone.get(b.id)?.length ?? 0) -
          (commercialsByZone.get(a.id)?.length ?? 0)
        );
      }
      return a.nom.localeCompare(b.nom);
    });
    return sorted;
  }, [zones, search, sort, commercialsByZone]);

  const onRefresh = () => {
    void refetchZones();
    void refetchProfile();
    void refetchStats();
  };

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

  if (!isManager) {
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
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xl },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.searchBar}>
        <Feather name="search" size={18} color={colors.textSubtle} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une zone"
          placeholderTextColor={colors.textSubtle}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={18} color={colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortRow}
      >
        {SORT_OPTIONS.map((option) => (
          <Chip
            key={option.key}
            label={option.label}
            selected={sort === option.key}
            onPress={() => setSort(option.key)}
          />
        ))}
      </ScrollView>

      <Pressable
        style={styles.createButton}
        onPress={() =>
          router.push("/zone/create" as Parameters<typeof router.push>[0])
        }
      >
        <Feather name="plus" size={18} color={colors.textOnPrimary} />
        <Text style={styles.createText}>Créer une zone</Text>
      </Pressable>

      {visibleZones.length === 0 ? (
        <Card variant="outlined" padding="lg" style={styles.stateCard}>
          <Feather name="layers" size={28} color={colors.textSubtle} />
          <Text style={styles.stateTitle}>
            {search.trim() ? "Aucun résultat" : "Aucune zone"}
          </Text>
          <Text style={styles.stateText}>
            {search.trim()
              ? "Aucune zone ne correspond à ta recherche."
              : "Trace une zone sur la carte pour l'assigner à ton équipe."}
          </Text>
        </Card>
      ) : (
        visibleZones.map((zone) => (
          <ZoneListCard
            key={zone.id}
            zone={zone}
            commercials={commercialsByZone.get(zone.id) ?? []}
            prospectedCount={prospectedByZone.get(zone.id) ?? 0}
            onPress={() => openZoneDetail(zone.id)}
          />
        ))
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
    gap: spacing.md,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    padding: 0,
  },
  sortRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
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
