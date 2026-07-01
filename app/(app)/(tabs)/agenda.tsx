import { useCommercialActivity } from "@/hooks/api/use-commercial-activity";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import { dataSyncService } from "@/services/sync/data-sync.service";
import type { Immeuble } from "@/types/api";
import { Card, Chip, ErrorState, PressableCard, StatTile } from "@/components/ui";
import { colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AgendaScreenProps = {
  onNavigateToImmeuble?: (immeubleId: number, porteId?: number) => void;
};

type RdvItem = {
  porteId: number;
  immeubleId: number;
  adresse: string;
  numero: string;
  nomPersonnalise?: string;
  etage: number;
  statut: string;
  rdvDate: string;
  rdvTime?: string;
  commentaire?: string;
};

type RepassageItem = {
  porteId: number;
  immeubleId: number;
  adresse: string;
  numero: string;
  nomPersonnalise?: string;
  etage: number;
  statut: string;
  commentaire?: string;
  derniereVisite?: string;
};

const STATUS_LABELS: Record<string, string> = {
  ABSENT: "Absent",
  NECESSITE_REPASSAGE: "À revoir",
};

const REPASSAGE_STATUTS = new Set(["ABSENT", "NECESSITE_REPASSAGE"]);

function formatTime(time?: string): string {
  if (!time) return "--:--";
  return time;
}

function formatEtage(etage: number): string {
  if (etage === 0) return "RDC";
  return `${etage}${etage === 1 ? "er" : "ème"} étage`;
}

type RdvCardProps = {
  item: RdvItem;
  onPress: (immeubleId: number, porteId: number) => void;
};

const RdvCard = memo(function RdvCard({ item, onPress }: RdvCardProps) {
  const handlePress = useCallback(() => {
    onPress(item.immeubleId, item.porteId);
  }, [onPress, item.immeubleId, item.porteId]);

  return (
    <PressableCard
      variant="outlined"
      padding="sm"
      style={styles.cardRdvBorder}
      onPress={handlePress}
    >
      <View style={styles.cardInner}>
        <View style={styles.cardLeft}>
          <Chip
            label={formatTime(item.rdvTime)}
            icon="clock"
            tone="primary"
          />
        </View>
        <View style={styles.cardCenter}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            Porte {item.numero}
            {item.nomPersonnalise ? ` · ${item.nomPersonnalise}` : ""}
          </Text>
          <Text style={styles.cardEtage}>{formatEtage(item.etage)}</Text>
          <View style={styles.cardAddressRow}>
            <Feather name="map-pin" size={11} color={colors.textSubtle} />
            <Text style={styles.cardAddress} numberOfLines={1}>
              {item.adresse}
            </Text>
          </View>
          {item.commentaire ? (
            <Text style={styles.cardComment} numberOfLines={2}>
              {item.commentaire}
            </Text>
          ) : null}
        </View>
        <View style={styles.cardChevron}>
          <Feather name="chevron-right" size={16} color={colors.borderStrong} />
        </View>
      </View>
    </PressableCard>
  );
});

type RepassageCardProps = {
  item: RepassageItem;
  onPress: (immeubleId: number, porteId: number) => void;
};

const RepassageCard = memo(function RepassageCard({ item, onPress }: RepassageCardProps) {
  const handlePress = useCallback(() => {
    onPress(item.immeubleId, item.porteId);
  }, [onPress, item.immeubleId, item.porteId]);

  const isAbsent = item.statut === "ABSENT";
  const accentColor = isAbsent ? colors.danger : colors.warning;

  return (
    <PressableCard
      variant="outlined"
      padding="sm"
      style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
      onPress={handlePress}
    >
      <View style={styles.cardInner}>
        <View style={styles.cardLeft}>
          <View style={[styles.repassageBadge, { backgroundColor: isAbsent ? colors.dangerSoft : colors.warningSoft }]}>
            <Feather
              name={isAbsent ? "user-x" : "refresh-cw"}
              size={13}
              color={accentColor}
            />
          </View>
        </View>
        <View style={styles.cardCenter}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            Porte {item.numero}
            {item.nomPersonnalise ? ` · ${item.nomPersonnalise}` : ""}
          </Text>
          <Text style={styles.cardEtage}>{formatEtage(item.etage)}</Text>
          <View style={styles.cardAddressRow}>
            <Feather name="map-pin" size={11} color={colors.textSubtle} />
            <Text style={styles.cardAddress} numberOfLines={1}>
              {item.adresse}
            </Text>
          </View>
          <View style={styles.cardStatusRow}>
            <Chip
              label={STATUS_LABELS[item.statut] ?? item.statut}
              tone={isAbsent ? "danger" : "warning"}
            />
            {item.derniereVisite ? (
              <Text style={styles.cardLastVisit}>
                {new Date(item.derniereVisite).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                })}
              </Text>
            ) : null}
          </View>
          {item.commentaire ? (
            <Text style={styles.cardComment} numberOfLines={2}>
              {item.commentaire}
            </Text>
          ) : null}
        </View>
        <View style={styles.cardChevron}>
          <Feather name="chevron-right" size={16} color={colors.borderStrong} />
        </View>
      </View>
    </PressableCard>
  );
});

export default function AgendaScreen({
  onNavigateToImmeuble,
}: AgendaScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"rdv" | "repassage">("rdv");
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const skeletonPulse = useRef(new Animated.Value(0)).current;
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

  const workspaceState = useWorkspaceProfile(userId, role);
  const { rdvToday, modified } = useCommercialActivity();
  const isLoading =
    !userId || !role || workspaceState.loading || rdvToday.loading || modified.loading;

  useEffect(() => {
    const unsubscribe = dataSyncService.subscribe((event) => {
      if (
        event.type !== "PORTE_CREATED" &&
        event.type !== "PORTE_UPDATED" &&
        event.type !== "PORTE_DELETED"
      ) {
        return;
      }
      if (isFocused) {
        void workspaceState.refetch();
        void rdvToday.refetch();
        void modified.refetch();
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
    void workspaceState.refetch();
    void rdvToday.refetch();
    void modified.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        workspaceState.refetch(),
        rdvToday.refetch(),
        modified.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const addressMap = useMemo(() => {
    const map = new Map<number, string>();
    const immeubles: Immeuble[] = workspaceState.data?.immeubles ?? [];
    for (const imm of immeubles) {
      map.set(imm.id, imm.adresse);
    }
    return map;
  }, [workspaceState.data]);

  const todayRdvs = useMemo<RdvItem[]>(() => {
    const portes = rdvToday.data ?? [];
    return portes
      .map((porte) => ({
        porteId: porte.id,
        immeubleId: porte.immeubleId,
        adresse: addressMap.get(porte.immeubleId) ?? "",
        numero: porte.numero,
        nomPersonnalise: porte.nomPersonnalise ?? undefined,
        etage: porte.etage,
        statut: typeof porte.statut === "string" ? porte.statut : "",
        rdvDate: porte.rdvDate ?? "",
        rdvTime: porte.rdvTime ?? undefined,
        commentaire: porte.commentaire ?? undefined,
      }))
      .sort((a, b) => (a.rdvTime ?? "").localeCompare(b.rdvTime ?? ""));
  }, [rdvToday.data, addressMap]);

  const repassageItems = useMemo<RepassageItem[]>(() => {
    const portes = modified.data ?? [];
    return portes
      .filter((porte) => {
        const st = typeof porte.statut === "string" ? porte.statut : "";
        return REPASSAGE_STATUTS.has(st);
      })
      .map((porte) => ({
        porteId: porte.id,
        immeubleId: porte.immeubleId,
        adresse: addressMap.get(porte.immeubleId) ?? "",
        numero: porte.numero,
        nomPersonnalise: porte.nomPersonnalise ?? undefined,
        etage: porte.etage,
        statut: typeof porte.statut === "string" ? porte.statut : "ABSENT",
        commentaire: porte.commentaire ?? undefined,
        derniereVisite: porte.derniereVisite ?? undefined,
      }));
  }, [modified.data, addressMap]);

  useEffect(() => {
    if (isLoading) {
      skeletonPulse.setValue(0);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonPulse, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonPulse, {
            toValue: 0,
            duration: 650,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
    skeletonPulse.setValue(0);
  }, [isLoading, skeletonPulse]);

  useEffect(() => {
    if (isLoading) {
      contentOpacity.setValue(0);
      return;
    }
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [contentOpacity, isLoading]);

  const todayLabel = useMemo(() => {
    const d = new Date(`${todayKey}T12:00:00`);
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const monthNames = [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    ];
    return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
  }, [todayKey]);

  const handleCardPress = useCallback(
    (immeubleId: number, porteId: number) => {
      onNavigateToImmeuble?.(immeubleId, porteId);
    },
    [onNavigateToImmeuble],
  );

  if (isLoading) {
    const skeletonOpacity = skeletonPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 0.9],
    });

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Animated.View style={{ opacity: skeletonOpacity, gap: 24 }}>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonToggleRow}>
            <View style={[styles.skeletonCard, { flex: 1, marginTop: 0, height: 110 }]} />
            <View style={[styles.skeletonCard, { flex: 1, marginTop: 0, height: 110 }]} />
          </View>
          <View style={[styles.skeletonCard, { height: 300, borderRadius: 20, marginTop: 0 }]} />
        </Animated.View>
      </ScrollView>
    );
  }

  const activeItems = activeSection === "rdv" ? todayRdvs : repassageItems;

  const agendaError = workspaceState.error ?? rdvToday.error ?? modified.error;
  const agendaData = workspaceState.data ?? rdvToday.data ?? modified.data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      {agendaError && !agendaData ? (
        <View style={{ paddingVertical: 40 }}>
          <ErrorState
            title="Impossible de charger les données"
            message={agendaError}
            onRetry={() => { void onRefresh(); }}
          />
        </View>
      ) : (
      <Animated.View style={{ opacity: contentOpacity, gap: 24 }}>
        {/* Hero card */}
        <Card variant="elevated" padding="md">
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <Feather name="calendar" size={22} color={colors.primary} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Aujourd'hui</Text>
              <Text style={styles.heroDate}>{todayLabel}</Text>
            </View>
          </View>
        </Card>

        {/* KPI row */}
        <View style={styles.kpiRow}>
          <StatTile
            icon="clock"
            label="RDV"
            value={todayRdvs.length}
            hint="Rendez-vous du jour"
            emphasis="default"
          />
          <StatTile
            icon="user-x"
            label="À revoir"
            value={repassageItems.length}
            hint="Absents aujourd'hui"
            emphasis="default"
            iconTone="danger"
          />
        </View>

        {/* Section card */}
        <Card variant="elevated" padding="md" style={styles.sectionCardGap}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Programme du jour</Text>
              <Text style={styles.sectionSubtitle}>Vos tâches et visites prévues</Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, activeSection === "rdv" && styles.toggleBtnActive]}
              onPress={() => setActiveSection("rdv")}
            >
              <Feather
                name="clock"
                size={14}
                color={activeSection === "rdv" ? colors.surface : colors.textMuted}
              />
              <Text style={[styles.toggleText, activeSection === "rdv" && styles.toggleTextActive]}>
                RDV du jour
              </Text>
              <View style={[styles.toggleBadge, activeSection === "rdv" && styles.toggleBadgeActive]}>
                <Text style={[styles.toggleBadgeText, activeSection === "rdv" && styles.toggleBadgeTextActive]}>
                  {todayRdvs.length}
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, activeSection === "repassage" && styles.toggleBtnActive]}
              onPress={() => setActiveSection("repassage")}
            >
              <Feather
                name="user-x"
                size={14}
                color={activeSection === "repassage" ? colors.surface : colors.textMuted}
              />
              <Text style={[styles.toggleText, activeSection === "repassage" && styles.toggleTextActive]}>
                À revoir
              </Text>
              <View style={[styles.toggleBadge, activeSection === "repassage" && styles.toggleBadgeActive]}>
                <Text style={[styles.toggleBadgeText, activeSection === "repassage" && styles.toggleBadgeTextActive]}>
                  {repassageItems.length}
                </Text>
              </View>
            </Pressable>
          </View>

          {activeItems.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather
                  name={activeSection === "rdv" ? "calendar" : "user-x"}
                  size={32}
                  color={colors.borderStrong}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeSection === "rdv" ? "Aucun rendez-vous" : "Aucune porte à revoir"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeSection === "rdv"
                  ? "Vos prochains RDV apparaîtront ici"
                  : "Les portes marquées absent aujourd'hui apparaîtront ici"}
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {activeSection === "rdv"
                ? todayRdvs.map((item) => (
                    <RdvCard key={`rdv-${item.porteId}`} item={item} onPress={handleCardPress} />
                  ))
                : repassageItems.map((item) => (
                    <RepassageCard key={`rep-${item.porteId}`} item={item} onPress={handleCardPress} />
                  ))}
            </View>
          )}
        </Card>
      </Animated.View>
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
    padding: 20,
    gap: 28,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  heroDate: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 14,
  },
  sectionCardGap: {
    gap: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: colors.surface,
  },
  toggleBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  toggleBadgeActive: {
    backgroundColor: colors.whiteAlpha25,
  },
  toggleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  toggleBadgeTextActive: {
    color: colors.surface,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: "center",
    maxWidth: 260,
  },
  cardList: {
    gap: 12,
  },
  cardRdvBorder: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cardLeft: {
    alignItems: "center",
    justifyContent: "center",
  },
  repassageBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCenter: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  cardEtage: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cardAddress: {
    fontSize: 11,
    color: colors.textSubtle,
    flex: 1,
  },
  cardStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  cardLastVisit: {
    fontSize: 10,
    color: colors.textSubtle,
  },
  cardComment: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: 4,
  },
  cardChevron: {
    alignItems: "center",
    justifyContent: "center",
    width: 24,
  },
  skeletonHeader: {
    width: "100%",
    height: 88,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  skeletonToggleRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  skeletonCard: {
    height: 80,
    borderRadius: 18,
    backgroundColor: colors.border,
    marginTop: 8,
  },
});
