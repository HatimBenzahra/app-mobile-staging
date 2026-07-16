import { useToast } from "@/components/ui";
import { syncWorkspaceMutation } from "@/hooks/api/data-sync";
import { useCreateZone } from "@/hooks/api/use-create-zone";
import { useCurrentAssignment } from "@/hooks/api/use-current-assignment";
import { useMapFocus } from "@/hooks/use-map-focus";
import { useRequestedTab } from "@/hooks/use-requested-tab";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { DEFAULT_REGION } from "@/hooks/carte-terrain/constants";
import { makeDraftPin } from "@/hooks/carte-terrain/helpers";
import type { DraftPin, TerrainPoint } from "@/hooks/carte-terrain/types";
import { api } from "@/services/api";
import { authService } from "@/services/auth";
import type { Immeuble, Manager, UserType, Zone } from "@/types/api";
import { type CameraRef } from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

/**
 * Cible d'assignation d'une zone : soit le manager lui-même (`self`), soit un
 * commercial de son équipe. `role` porte le `UserType` envoyé au backend.
 */
export type ZoneAssignable = {
  key: string;
  id: number;
  label: string;
  role: UserType;
  self: boolean;
};

// Forme minimale d'un commercial d'équipe côté profil manager (mêmes champs que
// dans `useCarteTerrain`), utilisée pour dériver les bâtiments d'équipe.
type TeamCommercial = {
  id: number;
  prenom: string;
  nom: string;
  immeubles?: Immeuble[];
};

const METERS_PER_DEG = 111_320;

/**
 * Bornes géographiques d'une zone au format MapLibre `[west, south, east, north]`,
 * pour cadrer la caméra dessus. Utilise le polygone si présent, sinon le cercle
 * (centre + rayon). Renvoie null si la géométrie est inexploitable.
 */
function zoneBounds(zone: Zone): [number, number, number, number] | null {
  if (zone.polygon && zone.polygon.length >= 3) {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of zone.polygon) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return [minLng, minLat, maxLng, maxLat];
  }
  if (
    zone.xOrigin != null &&
    zone.yOrigin != null &&
    zone.rayon != null &&
    zone.rayon > 0
  ) {
    const d = zone.rayon / METERS_PER_DEG;
    return [
      zone.xOrigin - d,
      zone.yOrigin - d,
      zone.xOrigin + d,
      zone.yOrigin + d,
    ];
  }
  return null;
}

/**
 * Tracé d'une zone dans la page dédiée (`/zone/create`). Extrait de
 * `useCarteTerrain` : gère les sommets du polygone, le recentrage GPS, la liste
 * des commerciaux assignables (manager) et la création finale. Aucune dépendance
 * à l'onglet Carte ni au signal inter-onglets : la page est autonome.
 */
export function useZoneDraft() {
  const cameraRef = useRef<CameraRef | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<TerrainPoint>(DEFAULT_REGION);
  const [zonePins, setZonePins] = useState<DraftPin[]>([]);
  const [activeZonePinId, setActiveZonePinId] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [creating, setCreating] = useState(false);

  const { data: profile, refetch } = useWorkspaceProfile(userId, role);
  const { createZone } = useCreateZone();
  const { focusOnZone } = useMapFocus();
  const { requestTab } = useRequestedTab();
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    const loadIdentity = async () => {
      const [nextUserId, nextRole] = await Promise.all([
        authService.getUserId(),
        authService.getUserRole(),
      ]);
      if (!mounted) return;
      setUserId(nextUserId);
      setRole(nextRole);
    };
    void loadIdentity();
    return () => {
      mounted = false;
    };
  }, []);

  // Cibles d'assignation (manager uniquement) : le manager lui-même en tête,
  // puis les commerciaux de son équipe. Le manager fait partie de l'équipe et
  // peut donc s'assigner la zone (userType MANAGER → crée sa ZoneEnCours).
  const assignables = useMemo<ZoneAssignable[]>(() => {
    if (role !== "manager") return [];
    const manager = profile as Manager | null;
    const list: ZoneAssignable[] = [];
    if (userId != null && manager) {
      list.push({
        key: `MANAGER:${userId}`,
        id: userId,
        label: "Moi (manager)",
        role: "MANAGER",
        self: true,
      });
    }
    for (const commercial of manager?.commercials ?? []) {
      list.push({
        key: `COMMERCIAL:${commercial.id}`,
        id: commercial.id,
        label: `${commercial.prenom} ${commercial.nom}`,
        role: "COMMERCIAL",
        self: false,
      });
    }
    return list;
  }, [profile, role, userId]);

  // Zones déjà créées, affichées en contexte (lecture seule) pendant le tracé.
  const existingZones = useMemo<Zone[]>(() => profile?.zones ?? [], [profile]);

  // Zone actuellement assignée au manager (ZoneEnCours), affichée comme repère
  // principal dans l'écran de création pour qu'il y trace ses sous-zones.
  const { data: assignment } = useCurrentAssignment(
    userId,
    role === "manager" ? "MANAGER" : null,
  );
  const assignedZone = assignment?.zone ?? null;
  const assignedZoneId = assignedZone?.id ?? null;

  // Contexte carte : zone assignée (rendue « active ») + zones déjà créées,
  // dédoublonnées par id (la zone assignée peut déjà figurer dans le profil →
  // une seule occurrence, conservée en active).
  const contextZones = useMemo<Zone[]>(() => {
    const byId = new Map<number, Zone>();
    if (assignedZone) byId.set(assignedZone.id, assignedZone);
    for (const zone of existingZones) {
      if (!byId.has(zone.id)) byId.set(zone.id, zone);
    }
    return Array.from(byId.values());
  }, [assignedZone, existingZones]);

  // Bâtiments existants affichés en contexte : dérivation identique à
  // `useCarteTerrain` (mes propres immeubles → MINE, ceux de l'équipe pour un
  // manager → TEAM, stampés depuis leur commercial parent, dédoublonnés par id).
  const immeubles = useMemo<Immeuble[]>(() => {
    const ownImmeubles = ((profile?.immeubles || []) as Immeuble[]).map(
      (immeuble): Immeuble => ({ ...immeuble, ownership: "MINE" }),
    );

    const teamCommercials =
      role === "manager"
        ? ((profile as { commercials?: TeamCommercial[] } | null)?.commercials ?? [])
        : [];
    const teamImmeubles: Immeuble[] = teamCommercials.flatMap((commercial) =>
      (commercial.immeubles ?? []).map(
        (immeuble): Immeuble => ({
          ...immeuble,
          ownership: "TEAM",
          commercialId: commercial.id,
          creatorName: `${commercial.prenom} ${commercial.nom}`,
        }),
      ),
    );

    const byId = new Map<number, Immeuble>();
    [...ownImmeubles, ...teamImmeubles].forEach((immeuble) => {
      if (immeuble.latitude != null && immeuble.longitude != null) {
        byId.set(immeuble.id, immeuble);
      }
    });
    return Array.from(byId.values());
  }, [profile, role]);

  // Un sommet de zone n'est qu'une coordonnée : pas d'adresse à résoudre.
  const addZonePin = useCallback((point: TerrainPoint) => {
    const nextPin = makeDraftPin(point);
    setZonePins((current) => [...current, nextPin]);
    setActiveZonePinId(nextPin.id);
  }, []);

  const selectZonePin = useCallback((pin: DraftPin) => {
    setActiveZonePinId(pin.id);
  }, []);

  const removeActiveZonePin = useCallback(() => {
    setActiveZonePinId((currentActive) => {
      if (!currentActive) return currentActive;
      setZonePins((current) => current.filter((pin) => pin.id !== currentActive));
      return null;
    });
  }, []);

  // Annuler le dernier point posé (undo), qu'il soit sélectionné ou non.
  const removeLastZonePin = useCallback(() => {
    setZonePins((current) => {
      if (current.length === 0) return current;
      const next = current.slice(0, -1);
      setActiveZonePinId((active) =>
        next.some((pin) => pin.id === active) ? active : null,
      );
      return next;
    });
  }, []);

  const clearZonePins = useCallback(() => {
    setZonePins([]);
    setActiveZonePinId(null);
  }, []);

  // Empêche le recentrage GPS automatique de reprendre le dessus une fois la
  // caméra cadrée sur la zone assignée (précédence à la zone). Le recentrage
  // manuel via le FAB reste toujours actif.
  const hasAutoCenteredRef = useRef(false);

  const centerOnCurrentLocation = useCallback(async (options?: { auto?: boolean }) => {
    if (options?.auto && hasAutoCenteredRef.current) return;
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          "Position indisponible",
          "Autorise la localisation pour centrer la carte sur le terrain.",
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setMapCenter(nextRegion);
      cameraRef.current?.easeTo({
        center: [nextRegion.longitude, nextRegion.latitude],
        zoom: 16,
        duration: 450,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
      });
    } catch {
      Alert.alert("Position indisponible", "Impossible de recuperer la position actuelle.");
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  useEffect(() => {
    void centerOnCurrentLocation({ auto: true });
    // La géolocalisation initiale ne doit se lancer qu'au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cadrage initial sur la zone assignée dès qu'elle est chargée (une seule
  // fois, tant que le manager n'a pas commencé à tracer). Prend le pas sur le
  // recentrage GPS auto via `hasAutoCenteredRef`.
  useEffect(() => {
    if (!assignedZone || zonePins.length > 0 || hasAutoCenteredRef.current) return;
    const bounds = zoneBounds(assignedZone);
    if (!bounds) return;
    cameraRef.current?.fitBounds(bounds, {
      padding: { top: 80, right: 60, bottom: 80, left: 60 },
      duration: 500,
    });
    hasAutoCenteredRef.current = true;
  }, [assignedZone, zonePins.length]);

  const handleCreateZone = useCallback(
    async (nom: string, selectedKeys: string[]) => {
      const trimmed = nom.trim();
      if (!trimmed || zonePins.length < 3) {
        Alert.alert("Zone incomplete", "Donne un nom et pose au moins 3 sommets.");
        return;
      }

      setCreating(true);
      try {
        // Anneau [[lng,lat],…] fermé : on réappend le premier sommet en dernier.
        const ring = zonePins.map((pin) => [pin.longitude, pin.latitude]);
        const polygon = [...ring, ring[0]];

        const newZone = await createZone({ nom: trimmed, polygon });
        if (!newZone) {
          Alert.alert("Creation impossible", "La zone n'a pas pu etre creee.");
          return;
        }

        // Chaque sélection est assignée selon son rôle : le manager via
        // l'assignation générique (userType MANAGER), les commerciaux via
        // l'assignation dédiée existante.
        const targets = assignables.filter((target) => selectedKeys.includes(target.key));
        if (targets.length > 0) {
          await Promise.all(
            targets.map((target) =>
              target.self
                ? api.zones.assignToUser(target.id, target.role, newZone.id, false)
                : api.zones.assignToCommercial(target.id, newZone.id),
            ),
          );
          // Les assignations sont désormais posées : on ré-invalide le cache des
          // zones (carte + liste) APRÈS la boucle pour que le rechargement voie la
          // géométrie ET les assignés (le sync émis par `createZone` partait avant).
          syncWorkspaceMutation("ZONE_CREATED");
        }

        await refetch();
        toast.show({ message: "Zone creee", variant: "success" });

        // Redirection selon les assignés : si le manager s'est inclus, il va
        // prospecter → carte + focus sur la zone (l'effet de focus bascule sur
        // l'onglet Carte). Sinon (uniquement des commerciaux), on l'emmène vers la
        // liste des Zones sans poser de focus (qui rebasculerait sur la carte).
        const managerSelected = targets.some((target) => target.self);
        if (managerSelected) {
          // Le polygone fermé local suffit à zoneBounds.
          focusOnZone({ id: newZone.id, polygon });
        } else {
          requestTab("zones");
        }
        router.back();
      } catch {
        Alert.alert("Creation impossible", "La zone n'a pas pu etre creee.");
      } finally {
        setCreating(false);
      }
    },
    [zonePins, assignables, createZone, refetch, toast, focusOnZone, requestTab],
  );

  // Une zone est un polygone : au moins 3 sommets (le nom est validé côté panneau).
  const readyToCreateZone = zonePins.length >= 3 && !creating;

  return {
    cameraRef,
    mapCenter,
    zonePins,
    activeZonePinId,
    assignables,
    contextZones,
    assignedZoneId,
    immeubles,
    loadingLocation,
    creating,
    readyToCreateZone,
    addZonePin,
    selectZonePin,
    removeActiveZonePin,
    removeLastZonePin,
    clearZonePins,
    centerOnCurrentLocation,
    handleCreateZone,
  };
}
