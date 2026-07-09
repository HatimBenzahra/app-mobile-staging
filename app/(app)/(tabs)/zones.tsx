import { Card, Chip, Icon } from "@/components/ui";
import { CommercialZoneMap } from "@/components/zones/CommercialZoneMap";
import {
  ZoneListCard,
  type ZoneCommercial,
} from "@/components/zones/ZoneListCard";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { useZoneStatisticsList } from "@/hooks/api/use-zone-statistics-list";
import { useZonesForUser } from "@/hooks/api/use-zones-for-user";
import { useZoneDetailPanel } from "@/hooks/use-zone-detail-panel";
import { authService } from "@/services/auth";
import { dataSyncService } from "@/services/sync/data-sync.service";
import type { Manager } from "@/types/api";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
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

type SortKey = "recent" | "nom" | "commerciaux";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Récent" },
  { key: "nom", label: "Nom" },
  { key: "commerciaux", label: "Commerciaux" },
];

type AssignedWindow = "all" | "7d" | "30d";

const ASSIGNED_OPTIONS: { key: AssignedWindow; label: string }[] = [
  { key: "all", label: "Tout" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
];

// Fenêtres relatives (en ms) pour le filtre « Date d'assignation », calculées à
// partir de Date.now() au rendu — aucune date absolue en dur.
const WINDOW_DAYS: Record<Exclude<AssignedWindow, "all">, number> = {
  "7d": 7,
  "30d": 30,
};

export default function ZonesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isFocused = useIsFocused();
  const { openZoneDetail } = useZoneDetailPanel();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [creatorFilter, setCreatorFilter] = useState<string | null>(null);
  const [assignedWindow, setAssignedWindow] = useState<AssignedWindow>("all");
  const shouldRefetchOnFocusRef = useRef(false);
  const wasFocusedRef = useRef(false);

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
  } = useZonesForUser(
    // La liste ne concerne que le manager. Le commercial voit sa zone en cours
    // via CommercialZoneMap (source `currentUserAssignment`) → pas de fetch ici.
    isManager ? userId : null,
    isManager ? "MANAGER" : null,
  );
  const { data: statsData, refetch: refetchStats } = useZoneStatisticsList();

  const managerProfile = useMemo(
    () => (isManager ? (profile as Manager | null) : null),
    [profile, isManager],
  );

  const zones = useMemo(() => zonesData ?? [], [zonesData]);

  useEffect(() => {
    const unsubscribe = dataSyncService.subscribe((event) => {
      if (event.type !== "ZONE_CREATED") return;
      if (isFocused) {
        void refetchZones();
        void refetchProfile();
        void refetchStats();
        return;
      }
      shouldRefetchOnFocusRef.current = true;
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused) {
      wasFocusedRef.current = false;
      return;
    }
    if (wasFocusedRef.current) return;
    wasFocusedRef.current = true;
    if (!shouldRefetchOnFocusRef.current) return;
    shouldRefetchOnFocusRef.current = false;
    void refetchZones();
    void refetchProfile();
    void refetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

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

  // Créateurs distincts (createdByName) présents dans les zones chargées, pour
  // alimenter le filtre « Créé par ».
  const creators = useMemo(() => {
    const set = new Set<string>();
    zones.forEach((zone) => {
      if (zone.createdByName) set.add(zone.createdByName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [zones]);

  const hasActiveFilters = creatorFilter !== null || assignedWindow !== "all";

  const resetFilters = () => {
    setCreatorFilter(null);
    setAssignedWindow("all");
  };

  // Pipeline filtre → tri : recherche par nom, filtre « Créé par » et filtre
  // « Date d'assignation » se cumulent, puis le tri s'applique sur le résultat.
  const visibleZones = useMemo(() => {
    const query = search.trim().toLowerCase();
    const windowMs =
      assignedWindow === "all"
        ? null
        : WINDOW_DAYS[assignedWindow] * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const filtered = zones.filter((zone) => {
      if (query && !zone.nom.toLowerCase().includes(query)) return false;
      if (creatorFilter !== null && zone.createdByName !== creatorFilter) {
        return false;
      }
      if (windowMs !== null) {
        // Preset actif : exclure les zones sans date d'assignation, ne garder
        // que celles assignées dans la fenêtre relative.
        if (!zone.assignedAt) return false;
        const assignedMs = new Date(zone.assignedAt).getTime();
        if (Number.isNaN(assignedMs) || now - assignedMs > windowMs) {
          return false;
        }
      }
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "recent") {
        // Plus récentes d'abord. `createdAt` (ISO) comparé lexicographiquement =
        // ordre chronologique ; fallback sur l'id décroissant si absent.
        if (a.createdAt && b.createdAt) {
          return b.createdAt.localeCompare(a.createdAt);
        }
        return b.id - a.id;
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
  }, [zones, search, sort, creatorFilter, assignedWindow, commercialsByZone]);

  const onRefresh = () => {
    void refetchZones();
    void refetchProfile();
    void refetchStats();
  };

  if (role === null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <Card variant="outlined" padding="lg" style={styles.stateCard}>
          <Icon name="loader" size={28} color={colors.textSubtle} />
          <Text style={styles.stateTitle}>Chargement</Text>
          <Text style={styles.stateText}>Récupération de vos zones...</Text>
        </Card>
      </View>
    );
  }

  // Commercial : carte de sa zone en cours (pas de liste de cards).
  if (!isManager) {
    return (
      <CommercialZoneMap
        userId={userId}
        insets={insets}
        onViewDetail={openZoneDetail}
      />
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
        <Icon name="search" size={18} color={colors.textSubtle} />
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
            <Icon name="x" size={18} color={colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterSection}>
        {creators.length > 0 ? (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Créé par</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <Chip
                label="Tous"
                selected={creatorFilter === null}
                onPress={() => setCreatorFilter(null)}
              />
              {creators.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  selected={creatorFilter === name}
                  onPress={() => setCreatorFilter(name)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Date d&apos;assignation</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {ASSIGNED_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={assignedWindow === option.key}
                onPress={() => setAssignedWindow(option.key)}
              />
            ))}
          </ScrollView>
        </View>

        {hasActiveFilters ? (
          <Chip
            label="Réinitialiser"
            icon="x"
            tone="primary"
            onPress={resetFilters}
            style={styles.resetChip}
          />
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

      {isManager ? (
        <Pressable
          style={styles.createButton}
          onPress={() =>
            router.push("/zone/create" as Parameters<typeof router.push>[0])
          }
        >
          <Icon name="plus" size={18} color={colors.textOnPrimary} />
          <Text style={styles.createText}>Créer une zone</Text>
        </Pressable>
      ) : null}

      {visibleZones.length === 0 ? (
        <Card variant="outlined" padding="lg" style={styles.stateCard}>
          <Icon name="vector-polygon" size={28} color={colors.textSubtle} />
          <Text style={styles.stateTitle}>
            {zones.length === 0
              ? "Aucune zone"
              : hasActiveFilters
                ? "Aucune zone pour ces filtres"
                : "Aucun résultat"}
          </Text>
          <Text style={styles.stateText}>
            {zones.length === 0
              ? isManager
                ? "Trace une zone sur la carte pour l'assigner à ton équipe."
                : "Aucune zone ne t'a encore été assignée."
              : hasActiveFilters
                ? "Aucune zone ne correspond à ces filtres. Ajuste-les ou réinitialise."
                : "Aucune zone ne correspond à ta recherche."}
          </Text>
        </Card>
      ) : (
        visibleZones.map((zone) => (
          <ZoneListCard
            key={zone.id}
            zone={zone}
            commercials={commercialsByZone.get(zone.id) ?? []}
            prospectedCount={prospectedByZone.get(zone.id) ?? 0}
            showCommercials={isManager}
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
  filterSection: {
    gap: spacing.sm,
  },
  filterGroup: {
    gap: spacing.xs,
  },
  filterLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chipRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  resetChip: {
    alignSelf: "flex-start",
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
