import { useToast } from "@/components/ui";
import { useCreateZone } from "@/hooks/api/use-create-zone";
import { useMapFocus } from "@/hooks/use-map-focus";
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

  const centerOnCurrentLocation = useCallback(async () => {
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
    void centerOnCurrentLocation();
    // La géolocalisation initiale ne doit se lancer qu'au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        }

        await refetch();
        toast.show({ message: "Zone creee", variant: "success" });
        // On cadre la nouvelle zone sur la carte de prospection (fitBounds via le
        // focus partagé) PUIS on revient à l'écran onglets : l'effet de focus y
        // bascule sur l'onglet Carte. Le polygone fermé local suffit à zoneBounds.
        focusOnZone({ id: newZone.id, polygon });
        router.back();
      } catch {
        Alert.alert("Creation impossible", "La zone n'a pas pu etre creee.");
      } finally {
        setCreating(false);
      }
    },
    [zonePins, assignables, createZone, refetch, toast, focusOnZone],
  );

  // Une zone est un polygone : au moins 3 sommets (le nom est validé côté panneau).
  const readyToCreateZone = zonePins.length >= 3 && !creating;

  return {
    cameraRef,
    mapCenter,
    zonePins,
    activeZonePinId,
    assignables,
    existingZones,
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
