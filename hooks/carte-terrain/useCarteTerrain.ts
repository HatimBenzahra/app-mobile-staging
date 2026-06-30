import { useCreateMaison } from "@/hooks/api/use-create-maison";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { api } from "@/services/api";
import { authService } from "@/services/auth";
import type { CreateQuartierPointInput, Immeuble, TypeHabitat } from "@/types/api";
import { type CameraRef, type PressEvent } from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import { Alert } from "react-native";
import {
  downloadAreaPack,
  getAreaPackName,
  listOfflinePacks,
} from "@/services/offline/map-offline-pack.service";
import {
  ensureConnectivityMonitoring,
  getIsOnline,
  subscribeConnectivity,
} from "@/services/network/connectivity.service";
import { DEFAULT_REGION } from "./constants";
import { createBuildingInput, makeDraftPin } from "./helpers";
import type { AdresseFeature, DraftPin, TerrainMode, TerrainPoint } from "./types";

type UseCarteTerrainParams = {
  embedded?: boolean;
};

type TeamCommercial = {
  id: number;
  prenom: string;
  nom: string;
  immeubles?: Immeuble[];
};

export function useCarteTerrain({ embedded = false }: UseCarteTerrainParams = {}) {
  const cameraRef = useRef<CameraRef | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mode, setMode] = useState<TerrainMode>("VISUALISATION");
  const [mapCenter, setMapCenter] = useState<TerrainPoint>(DEFAULT_REGION);
  const [buildingPin, setBuildingPin] = useState<DraftPin | null>(null);
  const [quartierPins, setQuartierPins] = useState<DraftPin[]>([]);
  const [activeQuartierPinId, setActiveQuartierPinId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AdresseFeature[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [creatingLieu, setCreatingLieu] = useState(false);
  const [selectedExistingLieu, setSelectedExistingLieu] = useState<Immeuble | null>(null);
  const [movingLieu, setMovingLieu] = useState<Immeuble | null>(null);
  const [editingLieu, setEditingLieu] = useState<Immeuble | null>(null);
  const [editingType, setEditingType] = useState<TypeHabitat>("IMMEUBLE");
  const [editingNbMaisons, setEditingNbMaisons] = useState(1);
  const [updatingLieu, setUpdatingLieu] = useState(false);
  const [satellite, setSatellite] = useState(false);
  // Affichage des bâtiments de l'équipe (managers uniquement). Désactivé par défaut.
  const [showTeam, setShowTeam] = useState(false);
  const navigatingRef = useRef(false);
  // Garde anti-doublon du téléchargement offline auto (1 pack max par zone).
  const offlineRequestedAreasRef = useRef<Set<string>>(new Set());
  // Remet le garde à zéro dès que le panneau marqueur se ferme.
  useEffect(() => {
    if (selectedExistingLieu === null) navigatingRef.current = false;
  }, [selectedExistingLieu]);

  const { data: profile, refetch } = useWorkspaceProfile(userId, role);
  const { createMaison, loading: creatingMaison } = useCreateMaison();

  const activePin = useMemo(() => {
    if (mode === "VISUALISATION") return null;
    if (mode === "BATIMENT") return buildingPin;
    return quartierPins.find((pin) => pin.id === activeQuartierPinId) ?? null;
  }, [activeQuartierPinId, buildingPin, mode, quartierPins]);

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

  const immeubles = useMemo(() => {
    // Mes propres bâtiments → ownership MINE.
    const ownImmeubles = ((profile?.immeubles || []) as Immeuble[]).map(
      (immeuble): Immeuble => ({ ...immeuble, ownership: "MINE" }),
    );

    // Bâtiments de l'équipe (managers uniquement, et seulement si showTeam).
    // Les immeubles d'équipe n'embarquent ni commercialId ni portes dans la
    // requête : on les stampe depuis le commercial parent (obligatoire pour la
    // couleur + le futur modal).
    const teamCommercials =
      role === "manager" && showTeam
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
  }, [profile, role, showTeam]);

  const currentUserName = useMemo(() => {
    const prenom = profile?.prenom?.trim();
    const nom = profile?.nom?.trim();
    const full = [prenom, nom].filter(Boolean).join(" ");
    return full || undefined;
  }, [profile]);

  const toggleShowTeam = useCallback(() => setShowTeam((current) => !current), []);

  const fetchAddressSuggestions = useCallback(async (point: TerrainPoint) => {
    setLoadingSuggestions(true);
    try {
      const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${point.longitude}&lat=${point.latitude}&limit=5`;
      const response = await fetch(url);
      if (!response.ok) {
        setSuggestions([]);
        return;
      }
      const data = await response.json();
      setSuggestions((data?.features as AdresseFeature[]) || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  const setBuildingActivePin = useCallback(
    (point: TerrainPoint) => {
      const nextPin = makeDraftPin(point);
      setBuildingPin(nextPin);
      void fetchAddressSuggestions(point);
    },
    [fetchAddressSuggestions],
  );

  const addQuartierPin = useCallback(
    (point: TerrainPoint) => {
      const nextPin = makeDraftPin(point);
      setQuartierPins((current) => [...current, nextPin]);
      setActiveQuartierPinId(nextPin.id);
      void fetchAddressSuggestions(point);
    },
    [fetchAddressSuggestions],
  );

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
      });
      if (mode === "BATIMENT" && !buildingPin && quartierPins.length === 0) {
        setBuildingActivePin(nextRegion);
      }
    } catch {
      Alert.alert("Position indisponible", "Impossible de recuperer la position actuelle.");
    } finally {
      setLoadingLocation(false);
    }
  }, [buildingPin, mode, quartierPins.length, setBuildingActivePin]);

  useEffect(() => {
    void centerOnCurrentLocation();
    // La geolocalisation initiale ne doit se lancer qu'au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Téléchargement offline AUTOMATIQUE et silencieux : dès que le centre de la
  // carte est connu ET qu'on est en ligne, on télécharge (une seule fois par
  // zone) un pack vectoriel garanti autour de cette zone. Aucun bouton, aucune
  // Alert : fire-and-forget, le seul retour étant un warn en DEV.
  useEffect(() => {
    ensureConnectivityMonitoring();

    let cancelled = false;

    const maybeDownload = async () => {
      if (cancelled || !getIsOnline()) return;
      const name = getAreaPackName(mapCenter);
      // Déjà demandé dans cette session → on ne relance pas.
      if (offlineRequestedAreasRef.current.has(name)) return;

      try {
        // Pack déjà présent sur le device → rien à faire.
        const packs = await listOfflinePacks();
        if (cancelled) return;
        if (packs.some((pack) => pack.name === name)) {
          offlineRequestedAreasRef.current.add(name);
          return;
        }

        // Marque la zone AVANT le téléchargement pour éviter tout double-trigger.
        offlineRequestedAreasRef.current.add(name);
        await downloadAreaPack({ name, center: mapCenter });
      } catch (err) {
        if (__DEV__) {
          console.warn("[CarteTerrain] auto offline download failed:", err);
        }
      }
    };

    void maybeDownload();
    const unsubscribe = subscribeConnectivity((isOnline) => {
      if (isOnline) void maybeDownload();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [mapCenter]);

  const updateActivePin = (patch: Partial<DraftPin>) => {
    if (mode === "BATIMENT") {
      setBuildingPin((current) => (current ? { ...current, ...patch } : current));
      return;
    }
    setQuartierPins((current) =>
      current.map((pin) => (pin.id === activeQuartierPinId ? { ...pin, ...patch } : pin)),
    );
  };

  const handleMapPress = (event: NativeSyntheticEvent<PressEvent>) => {
    const [longitude, latitude] = event.nativeEvent.lngLat;
    const point = { latitude, longitude };
    if (movingLieu) {
      setSelectedExistingLieu(null);
      Alert.alert(
        "Deplacer le lieu",
        "Confirmer cette nouvelle position ?",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Deplacer",
            onPress: () => {
              void handleMoveLieu(point);
            },
          },
        ],
      );
      return;
    }
    if (mode === "VISUALISATION") {
      setSelectedExistingLieu(null);
      setEditingLieu(null);
      return;
    }
    if (mode === "BATIMENT") {
      setSelectedExistingLieu(null);
      setEditingLieu(null);
      setBuildingActivePin(point);
      return;
    }
    setSelectedExistingLieu(null);
    setEditingLieu(null);
    addQuartierPin(point);
  };

  const selectQuartierPin = (pin: DraftPin) => {
    setActiveQuartierPinId(pin.id);
    void fetchAddressSuggestions(pin);
  };

  const removeActiveQuartierPin = () => {
    if (!activeQuartierPinId) return;
    setQuartierPins((current) => current.filter((pin) => pin.id !== activeQuartierPinId));
    setActiveQuartierPinId(null);
    setSuggestions([]);
  };

  const handleCreateBatiment = async () => {
    if (!buildingPin || !buildingPin.selectedAddress) {
      Alert.alert("Adresse requise", "Pose un pin puis choisis une adresse avant de creer.");
      return;
    }

    setCreatingLieu(true);
    try {
      const input = createBuildingInput(buildingPin, role, userId);
      const result =
        buildingPin.typeHabitat === "MAISON"
          ? await createMaison(input)
          : await api.immeubles.create(input);

      if (!result) {
        Alert.alert("Creation impossible", "Le lieu n'a pas pu etre cree.");
        return;
      }

      await refetch();
      setBuildingPin(null);
      setSuggestions([]);
      router.push(`/lieu/${result.id}`);
    } finally {
      setCreatingLieu(false);
    }
  };

  const handleCreateQuartier = async () => {
    if (quartierPins.length === 0) {
      Alert.alert("Quartier vide", "Pose au moins un pin pour creer un quartier.");
      return;
    }
    const incomplete = quartierPins.some((pin) => !pin.selectedAddress);
    if (incomplete) {
      Alert.alert("Adresses requises", "Chaque pin du quartier doit avoir une adresse choisie.");
      return;
    }

    setCreatingLieu(true);
    try {
      const points: CreateQuartierPointInput[] = quartierPins.map((pin) => ({
        adresse: pin.selectedAddress!.properties.label,
        latitude: pin.latitude,
        longitude: pin.longitude,
        typeHabitat: pin.typeHabitat,
        // PAVILLON = N maisons (1 foyer chacune) → N étages × 1 porte.
        nbEtages: pin.typeHabitat === "PAVILLON" ? pin.nbMaisonsPrevu : 1,
        nbPortesParEtage: 1,
        nbMaisonsPrevu: pin.typeHabitat === "PAVILLON" ? pin.nbMaisonsPrevu : 1,
      }));

      const result = await api.immeubles.createQuartier({
        commercialId: role === "commercial" ? (userId ?? undefined) : undefined,
        managerId: role === "manager" ? (userId ?? undefined) : undefined,
        points,
      });

      await refetch();
      setQuartierPins([]);
      setActiveQuartierPinId(null);
      setSuggestions([]);
      if (result?.id) {
        router.push(`/quartier/${result.id}`);
      } else if (!embedded) {
        router.back();
      }
    } catch {
      Alert.alert("Creation impossible", "Le quartier n'a pas pu etre cree.");
    } finally {
      setCreatingLieu(false);
    }
  };

  const handleMoveLieu = async (point: TerrainPoint) => {
    if (!movingLieu) return;
    setUpdatingLieu(true);
    try {
      await api.immeubles.update({
        id: movingLieu.id,
        latitude: point.latitude,
        longitude: point.longitude,
      });
      setMovingLieu(null);
      await refetch();
    } catch {
      Alert.alert("Deplacement impossible", "La nouvelle position n'a pas pu etre enregistree.");
    } finally {
      setUpdatingLieu(false);
    }
  };

  const openEditLieu = (immeuble: Immeuble) => {
    setSelectedExistingLieu(null);
    setEditingLieu(immeuble);
    setEditingType(immeuble.typeHabitat ?? "IMMEUBLE");
    setEditingNbMaisons(immeuble.nbMaisonsPrevu ?? immeuble.nbPortesParEtage ?? 1);
  };

  const handleSaveEditLieu = async () => {
    if (!editingLieu) return;
    setUpdatingLieu(true);
    try {
      await api.immeubles.update({
        id: editingLieu.id,
        typeHabitat: editingType,
        nbEtages: editingType === "MAISON" ? 1 : editingLieu.nbEtages,
        nbPortesParEtage: editingType === "PAVILLON" ? editingNbMaisons : editingType === "MAISON" ? 1 : editingLieu.nbPortesParEtage,
        nbMaisonsPrevu: editingType === "PAVILLON" ? editingNbMaisons : editingType === "MAISON" ? 1 : null,
      });
      setEditingLieu(null);
      await refetch();
    } catch {
      Alert.alert("Modification impossible", "Le lieu n'a pas pu etre modifie.");
    } finally {
      setUpdatingLieu(false);
    }
  };

  const handleDeleteLieu = (immeuble: Immeuble) => {
    Alert.alert(
      "Supprimer ce lieu ?",
      "Possible uniquement si aucune porte n'a encore ete prospectee.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setUpdatingLieu(true);
            try {
              await api.immeubles.removeTerrainLieu(immeuble.id);
              setSelectedExistingLieu(null);
              await refetch();
            } catch {
              Alert.alert(
                "Suppression impossible",
                "Ce lieu contient peut-etre deja une prospection ou n'est pas accessible.",
              );
            } finally {
              setUpdatingLieu(false);
            }
          },
        },
      ],
    );
  };

  const creating = creatingMaison || creatingLieu;
  const readyToCreateBatiment = !!buildingPin?.selectedAddress && !creating;
  const readyToCreateQuartier =
    quartierPins.length > 0 && quartierPins.every((pin) => !!pin.selectedAddress) && !creating;

  return {
    cameraRef,
    navigatingRef,
    userId,
    role,
    mode,
    setMode,
    mapCenter,
    buildingPin,
    quartierPins,
    activeQuartierPinId,
    suggestions,
    loadingLocation,
    loadingSuggestions,
    selectedExistingLieu,
    setSelectedExistingLieu,
    movingLieu,
    setMovingLieu,
    editingLieu,
    setEditingLieu,
    editingType,
    setEditingType,
    editingNbMaisons,
    setEditingNbMaisons,
    updatingLieu,
    satellite,
    setSatellite,
    showTeam,
    toggleShowTeam,
    currentUserName,
    setSuggestions,
    activePin,
    immeubles,
    updateActivePin,
    handleMapPress,
    selectQuartierPin,
    removeActiveQuartierPin,
    handleCreateBatiment,
    handleCreateQuartier,
    openEditLieu,
    handleSaveEditLieu,
    handleDeleteLieu,
    centerOnCurrentLocation,
    creating,
    readyToCreateBatiment,
    readyToCreateQuartier,
  };
}
