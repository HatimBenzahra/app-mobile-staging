import { CarteTerrainMap } from "@/components/carte-terrain/CarteTerrainMap";
import { zoneBounds } from "@/components/carte-terrain/geo-hull";
import { ZoneContour } from "@/components/carte-terrain/ZoneContour";
import {
  Card,
  Chip,
  type ChipTone,
  ErrorState,
  StatTile,
} from "@/components/ui";
import {
  DEFAULT_STATUS_OPTION,
  STATUS_DISPLAY,
} from "@/components/immeubles/prospection/status-display";
import { HabitatIcon } from "@/components/immeubles/habitat-icon";
import { getLieuTerms } from "@/components/immeubles/lieu-terms";
import { colors, fontSize, fontWeight, radius, spacing } from "@/constants/theme";
import { useZoneCurrentAssignments } from "@/hooks/api/use-zone-current-assignments";
import { useZoneDetail, type ZoneDetailImmeuble } from "@/hooks/api/use-zone-detail";
import { useZoneProspections } from "@/hooks/api/use-zone-prospections";
import { useZoneStatistics } from "@/hooks/api/use-zone-statistics";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import type { Commercial, Manager, Zone } from "@/types/api";
import type { ZoneProspection } from "@/types/graphql-schema";
import { Feather } from "@expo/vector-icons";
import { type CameraRef } from "@maplibre/maplibre-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type StatTileData = {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
};

/** mm:ss (< 1 h) ou "H h MM min" pour une durée exprimée en secondes. */
function formatDuration(sec?: number | null): string {
  if (sec == null || sec <= 0) return "—";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);
  if (hours > 0) {
    return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Durée totale lisible (somme des dureeSec) → "H h MM min" ou "M min". */
function formatTotalDuration(totalSec: number): string {
  if (totalSec <= 0) return "0 min";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) {
    return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
  }
  return `${minutes} min`;
}

/** DateTime ISO → "JJ/MM/AAAA · HH:MM". */
function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = date.getDate().toString().padStart(2, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = date.getHours().toString().padStart(2, "0");
  const min = date.getMinutes().toString().padStart(2, "0");
  return `${dd}/${mm}/${yyyy} · ${hh}:${min}`;
}

/** Mappe un statut de porte sur un ton de Chip sémantique. */
function statusToChipTone(accent: string): ChipTone {
  switch (accent) {
    case "#22C55E":
      return "success";
    case "#EF4444":
      return "danger";
    case "#F59E0B":
      return "warning";
    case "#F97316":
      return "primary";
    case "#6366F1":
      return "info";
    default:
      return "neutral";
  }
}

/**
 * Libellé + couleur d'un statut de porte brut (`StatutPorte`).
 * Réutilise `STATUS_DISPLAY` pour les statuts partagés et complète les statuts
 * bruts absents de la palette de prospection (ABSENT / repassage / non visité).
 */
const PORTE_STATUS_EXTRA: Record<string, { label: string; accent: string }> = {
  ABSENT: { label: "Absent", accent: "#F59E0B" },
  NECESSITE_REPASSAGE: { label: "À repasser", accent: "#6366F1" },
  NON_VISITE: {
    label: DEFAULT_STATUS_OPTION.label,
    accent: DEFAULT_STATUS_OPTION.accent,
  },
};

function porteStatusMeta(statut: string): { label: string; accent: string } {
  const option = STATUS_DISPLAY[statut];
  if (option) return { label: option.label, accent: option.accent };
  return (
    PORTE_STATUS_EXTRA[statut] ?? {
      label: statut,
      accent: DEFAULT_STATUS_OPTION.accent,
    }
  );
}

type PorteBreakdownEntry = {
  statut: string;
  count: number;
  label: string;
  accent: string;
};

/** Répartition des portes d'un immeuble par statut, triée par effectif. */
function buildPorteBreakdown(
  portes: ZoneDetailImmeuble["portes"],
): PorteBreakdownEntry[] {
  const counts = new Map<string, number>();
  for (const porte of portes ?? []) {
    counts.set(porte.statut, (counts.get(porte.statut) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([statut, count]) => ({ statut, count, ...porteStatusMeta(statut) }))
    .sort((a, b) => b.count - a.count);
}

/** Type d'habitat lisible dérivé de `getLieuTerms` (source unique de vérité). */
function habitatLabel(typeHabitat?: ZoneDetailImmeuble["typeHabitat"]): string {
  const terms = getLieuTerms(typeHabitat);
  if (terms.isMaison) return "Maison";
  if (terms.isPavillon) return "Pavillon";
  return "Immeuble";
}

type ZoneDetailViewProps = {
  zoneId: number;
  onBack: () => void;
};

/**
 * Corps du détail d'une zone (mini-carte de cadrage, KPIs, assignés, immeubles
 * et prospections). Rempli son parent (`flex: 1`) avec son propre fond : il est
 * rendu SOIT en panneau embarqué dans la zone de contenu (rail visible, via
 * `useZoneDetailPanel`), SOIT dans la route `zone/[id]` pour les deep-links.
 * Le bouton retour du header délègue à `onBack` (fermeture panneau ou
 * `router.back`) au lieu d'appeler la navigation directement.
 */
export function ZoneDetailView({ zoneId, onBack }: ZoneDetailViewProps) {
  const insets = useSafeAreaInsets();

  // Identité de l'utilisateur courant → profil workspace (pour résoudre les
  // noms des commerciaux assignés sans prospection connue). Chargée en amont des
  // requêtes car elle conditionne l'appel « assignés » (manager uniquement).
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

  const zoneQuery = useZoneDetail(zoneId);
  const statsQuery = useZoneStatistics(zoneId);
  // « Assignés » est réservé au manager (403 pour un commercial) : on ne déclenche
  // la requête que pour un manager ; sinon `zoneId` null ⇒ aucun appel réseau.
  const assignmentsQuery = useZoneCurrentAssignments(
    role === "manager" ? zoneId : null,
  );
  const prospectionsQuery = useZoneProspections(zoneId);

  const { data: profile } = useWorkspaceProfile(userId, role);

  // Immeubles dépliés (vue portes).
  const [expandedImmeubles, setExpandedImmeubles] = useState<Set<number>>(
    () => new Set(),
  );
  const toggleImmeuble = useCallback((immeubleId: number) => {
    setExpandedImmeubles((prev) => {
      const next = new Set(prev);
      if (next.has(immeubleId)) next.delete(immeubleId);
      else next.add(immeubleId);
      return next;
    });
  }, []);

  const zone = zoneQuery.data;
  const stats = statsQuery.data;
  const prospections = useMemo(() => {
    const list = [...(prospectionsQuery.data ?? [])];
    list.sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : -Infinity;
      const tb = b.date ? new Date(b.date).getTime() : -Infinity;
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return tb - ta;
    });
    return list;
  }, [prospectionsQuery.data]);

  const zoneName =
    zone?.nom ?? stats?.zoneName ?? (zoneId != null ? `Zone #${zoneId}` : "Zone");

  const immeubles = useMemo(() => zone?.immeubles ?? [], [zone?.immeubles]);

  // Mini-carte de cadrage (non interactive) : bbox + centre de la zone.
  // `polygon` arrive du schéma GraphQL comme scalaire JSON : on le restreint au
  // type géométrique attendu par l'overlay après un garde d'exécution.
  const miniMapCameraRef = useRef<CameraRef | null>(null);
  const zoneGeometry = useMemo<Zone | null>(() => {
    if (!zone) return null;
    return {
      id: zone.id,
      nom: zone.nom,
      xOrigin: zone.xOrigin,
      yOrigin: zone.yOrigin,
      rayon: zone.rayon,
      polygon: Array.isArray(zone.polygon)
        ? (zone.polygon as unknown as number[][])
        : null,
    };
  }, [zone]);
  const bounds = useMemo(
    () => (zoneGeometry ? zoneBounds(zoneGeometry) : null),
    [zoneGeometry],
  );
  const mapCenter = useMemo(
    () =>
      bounds
        ? {
            longitude: (bounds[0] + bounds[2]) / 2,
            latitude: (bounds[1] + bounds[3]) / 2,
          }
        : null,
    [bounds],
  );

  // Cadre la caméra sur la zone. Appelé au chargement de la carte ET quand la
  // bbox arrive (la donnée zone peut se charger après le montage de la carte).
  const fitToZone = useCallback(() => {
    if (!bounds) return;
    miniMapCameraRef.current?.fitBounds(bounds, {
      padding: { top: 28, right: 28, bottom: 28, left: 28 },
      duration: 0,
    });
  }, [bounds]);

  useEffect(() => {
    fitToZone();
  }, [fitToZone]);

  // Noms issus du profil workspace : le manager porte son propre prénom + nom
  // ainsi que la liste de ses commerciaux (résolution même sans prospection).
  const profileNames = useMemo(() => {
    const names = new Map<number, string>();
    if (role === "manager") {
      const manager = profile as Manager | null;
      if (manager) {
        names.set(manager.id, `${manager.prenom} ${manager.nom}`.trim());
      }
      for (const c of manager?.commercials ?? []) {
        names.set(c.id, `${c.prenom} ${c.nom}`.trim());
      }
    } else if (role === "commercial") {
      // Le commercial n'a accès qu'à son propre profil : on résout au moins son
      // nom (le fallback prospections couvre les autres, évitant les « #id »).
      const commercial = profile as Commercial | null;
      if (commercial) {
        names.set(commercial.id, `${commercial.prenom} ${commercial.nom}`.trim());
      }
    }
    return names;
  }, [profile, role]);

  // Noms dérivés des prospections (l'assignation ne porte que l'userId).
  // Indexe commerciaux ET manager auteur d'une prospection.
  const prospectionNames = useMemo(() => {
    const names = new Map<number, string>();
    for (const p of prospections) {
      if (p.commercialId != null && p.commercialNom) {
        names.set(p.commercialId, p.commercialNom);
      }
      if (p.managerId != null && p.managerNom) {
        names.set(p.managerId, p.managerNom);
      }
    }
    return names;
  }, [prospections]);

  // Priorité : nom du profil > nom issu des prospections > "#id".
  const resolvePersonName = useCallback(
    (id: number | null | undefined): string => {
      if (id == null) return "Inconnu";
      return (
        profileNames.get(id) ?? prospectionNames.get(id) ?? `#${id}`
      );
    },
    [profileNames, prospectionNames],
  );

  // Assignations affichées : commerciaux + manager (auto-assigné).
  const assignes = useMemo(
    () =>
      (assignmentsQuery.data ?? []).filter(
        (a) => a.userType === "COMMERCIAL" || a.userType === "MANAGER",
      ),
    [assignmentsQuery.data],
  );

  const totalDurationSec = useMemo(
    () => prospections.reduce((acc, p) => acc + (p.dureeSec ?? 0), 0),
    [prospections],
  );

  const statTiles = useMemo<StatTileData[]>(() => {
    if (!stats) return [];
    return [
      {
        key: "contrats",
        icon: "check-circle",
        label: "Contrats signés",
        value: stats.totalContratsSignes,
      },
      {
        key: "rdv",
        icon: "calendar",
        label: "RDV pris",
        value: stats.totalRendezVousPris,
      },
      {
        key: "immeubles",
        icon: "home",
        label: "Bâtiments visités",
        value: stats.totalImmeublesVisites,
      },
      {
        key: "refus",
        icon: "x-circle",
        label: "Refus",
        value: stats.totalRefus,
      },
      {
        key: "conversion",
        icon: "trending-up",
        label: "Taux conversion",
        value: `${Math.round(stats.tauxConversion)}%`,
      },
      {
        key: "succes-rdv",
        icon: "target",
        label: "Succès RDV",
        value: `${Math.round(stats.tauxSuccesRdv)}%`,
      },
      {
        key: "portes",
        icon: "grid",
        label: "Portes prospectées",
        value: stats.totalPortesProspectes,
      },
      {
        key: "performance",
        icon: "award",
        label: "Performance",
        value: Math.round(stats.performanceGlobale),
      },
    ];
  }, [stats]);

  const refetchAll = useCallback(() => {
    void zoneQuery.refetch();
    void statsQuery.refetch();
    void assignmentsQuery.refetch();
    void prospectionsQuery.refetch();
  }, [zoneQuery, statsQuery, assignmentsQuery, prospectionsQuery]);

  const renderProspection = useCallback(
    ({ item }: { item: ZoneProspection }) => {
      const statusOption =
        STATUS_DISPLAY[item.statut] ?? DEFAULT_STATUS_OPTION;
      const personId = item.commercialId ?? item.managerId;
      return (
        <Card variant="outlined" padding="sm" style={styles.prospectionRow}>
          <View style={styles.prospectionTop}>
            <Text style={styles.prospectionCommercial} numberOfLines={1}>
              {personId != null
                ? resolvePersonName(personId)
                : (item.commercialNom ?? item.managerNom ?? "Prospection")}
            </Text>
            <Chip
              label={statusOption.label}
              tone={statusToChipTone(statusOption.accent)}
              icon={statusOption.icon}
            />
          </View>
          <Text style={styles.prospectionAdresse} numberOfLines={1}>
            {item.immeubleAdresse} · Porte {item.porteNumero}
          </Text>
          <View style={styles.prospectionMeta}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="watch" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {formatDuration(item.dureeSec)}
              </Text>
            </View>
          </View>
        </Card>
      );
    },
    [resolvePersonName],
  );

  const isInitialLoading =
    (zoneQuery.loading && zone == null) ||
    (statsQuery.loading && stats == null);

  const hasError =
    zoneQuery.error != null &&
    statsQuery.error != null &&
    zone == null &&
    stats == null;

  if (!Number.isFinite(zoneId) || zoneId <= 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Zone introuvable.</Text>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  if (isInitialLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const ListHeader = (
    <View style={styles.headerContent}>
      {mapCenter ? (
        <Card variant="outlined" padding="none" style={styles.miniMapCard}>
          <CarteTerrainMap
            cameraRef={miniMapCameraRef}
            mapCenter={mapCenter}
            satellite={false}
            showUserLocation={false}
            interactive={false}
            onPress={() => {}}
            onDidFinishLoadingMap={fitToZone}
          >
            {zoneGeometry ? <ZoneContour zones={[zoneGeometry]} /> : null}
          </CarteTerrainMap>
        </Card>
      ) : null}

      {hasError ? (
        <ErrorState
          message="Impossible de charger les statistiques de la zone."
          onRetry={refetchAll}
        />
      ) : null}

      {statTiles.length > 0 ? (
        <View style={styles.statsGrid}>
          {statTiles.map((tile) => (
            <StatTile
              key={tile.key}
              icon={tile.icon}
              label={tile.label}
              value={tile.value}
              size="compact"
              style={styles.statTile}
            />
          ))}
        </View>
      ) : null}

      {/* Assignés (commerciaux + manager) — réservé au manager (403 commercial). */}
      {role === "manager" ? (
        <>
          <Text style={styles.sectionTitle}>Assignés ({assignes.length})</Text>
          {assignes.length === 0 ? (
            <Text style={styles.sectionEmpty}>Aucun assigné.</Text>
          ) : (
            <View style={styles.chipRow}>
              {assignes.map((a) => {
                const isManager = a.userType === "MANAGER";
                return (
                  <Chip
                    key={a.id}
                    icon={isManager ? "briefcase" : "user"}
                    tone={isManager ? "info" : "neutral"}
                    label={
                      isManager
                        ? `${resolvePersonName(a.userId)} (manager)`
                        : resolvePersonName(a.userId)
                    }
                  />
                );
              })}
            </View>
          )}
        </>
      ) : null}

      {/* Immeubles concernés */}
      <Text style={styles.sectionTitle}>Bâtiments ({immeubles.length})</Text>
      {immeubles.length === 0 ? (
        <Text style={styles.sectionEmpty}>Aucun bâtiment dans la zone.</Text>
      ) : (
        <Card variant="outlined" padding="none" style={styles.immeubleList}>
          {immeubles.map((imm, index) => {
            const portes = imm.portes ?? [];
            const breakdown = buildPorteBreakdown(portes);
            const isExpanded = expandedImmeubles.has(imm.id);
            const canExpand = portes.length > 0;
            return (
              <View
                key={imm.id}
                style={[
                  index < immeubles.length - 1 && styles.immeubleRowBorder,
                ]}
              >
                <Pressable
                  style={styles.immeubleRow}
                  onPress={
                    canExpand ? () => toggleImmeuble(imm.id) : undefined
                  }
                  disabled={!canExpand}
                >
                  <HabitatIcon
                    type={imm.typeHabitat}
                    size={18}
                    color={colors.primary}
                  />
                  <View style={styles.immeubleInfo}>
                    <Text style={styles.immeubleAdresse} numberOfLines={1}>
                      {imm.adresse}
                    </Text>
                    <Text style={styles.immeubleType}>
                      {habitatLabel(imm.typeHabitat)} · {portes.length} porte
                      {portes.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  {canExpand ? (
                    <Feather
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.textMuted}
                    />
                  ) : null}
                </Pressable>

                {breakdown.length > 0 ? (
                  <View style={styles.porteChipRow}>
                    {breakdown.map((entry) => (
                      <Chip
                        key={entry.statut}
                        label={`${entry.count} ${entry.label}`}
                        tone={statusToChipTone(entry.accent)}
                      />
                    ))}
                  </View>
                ) : null}

                {isExpanded ? (
                  <View style={styles.porteList}>
                    {portes.map((porte) => {
                      const meta = porteStatusMeta(porte.statut);
                      return (
                        <View key={porte.id} style={styles.porteRow}>
                          <View
                            style={[
                              styles.porteDot,
                              { backgroundColor: meta.accent },
                            ]}
                          />
                          <Text style={styles.porteLabel} numberOfLines={1}>
                            Porte {porte.numero} · Étage {porte.etage}
                          </Text>
                          <Text style={styles.porteStatut} numberOfLines={1}>
                            {meta.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>
      )}

      {/* Prospections */}
      <View style={styles.prospectionsHeader}>
        <Text style={styles.sectionTitle}>
          Prospections ({prospections.length})
        </Text>
        {totalDurationSec > 0 ? (
          <Text style={styles.totalDuration}>
            {formatTotalDuration(totalDurationSec)} au total
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backFab} onPress={onBack}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.headerNom} numberOfLines={1}>
            {zoneName}
          </Text>
          {stats ? (
            <Text style={styles.headerSub}>
              {stats.nombreCommerciaux} commercial
              {stats.nombreCommerciaux !== 1 ? "aux" : ""} ·{" "}
              {immeubles.length} bâtiment{immeubles.length !== 1 ? "s" : ""}
            </Text>
          ) : null}
        </View>
      </View>

      <FlatList
        data={prospections}
        keyExtractor={(item, index) =>
          `${item.immeubleId}-${item.porteId}-${index}`
        }
        renderItem={renderProspection}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        ListEmptyComponent={
          !hasError ? (
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={28} color={colors.textSubtle} />
              <Text style={styles.emptyText}>Aucune prospection</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  notFoundText: {
    fontSize: fontSize.lg,
    color: colors.textStrong,
  },
  backButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  backButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    flex: 1,
  },
  headerNom: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.textStrong,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerContent: {
    gap: spacing.sm,
  },
  miniMapCard: {
    height: 160,
    overflow: "hidden",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statTile: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 140,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionEmpty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  immeubleList: {
    overflow: "hidden",
  },
  immeubleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  immeubleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  immeubleInfo: {
    flex: 1,
  },
  immeubleAdresse: {
    fontSize: fontSize.base,
    color: colors.text,
  },
  immeubleType: {
    marginTop: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  porteChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  porteList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  porteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  porteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  porteLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textStrong,
  },
  porteStatut: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  prospectionsHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  totalDuration: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  prospectionRow: {
    gap: spacing.sm,
  },
  prospectionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  prospectionCommercial: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  prospectionAdresse: {
    fontSize: fontSize.sm,
    color: colors.textStrong,
  },
  prospectionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  emptyBox: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing["3xl"],
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
});
