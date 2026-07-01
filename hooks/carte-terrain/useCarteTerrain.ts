import { useCreateMaison } from "@/hooks/api/use-create-maison";
import { useMapFocus } from "@/hooks/use-map-focus";
import { useQuartiers } from "@/hooks/api/use-quartiers";
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
  // Bâtiment mis en avant (badge agrandi + pulsation) après un "Voir sur la carte".
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const navigatingRef = useRef(false);
  // Garde anti-doublon du téléchargement offline auto (1 pack max par zone).
  const offlineRequestedAreasRef = useRef<Set<string>>(new Set());
  // Remet le garde à zéro dès que le panneau marqueur se ferme.
  useEffect(() => {
    if (selectedExistingLieu === null) navigatingRef.current = false;
  }, [selectedExistingLieu]);

  const { data: profile, refetch } = useWorkspaceProfile(userId, role);
  const { data: quartiers } = useQuartiers();
  const { createMaison, loading: creatingMaison } = useCreateMaison();
  const { focusTarget, clearFocus } = useMapFocus();

  // "Voir sur la carte" : dès qu'une cible arrive, on centre la caméra et on
  // arme le highlight (via highlightedId), puis on CONSOMME la cible (clearFocus)
  // pour ne pas re-déclencher au remontage lazy de l'onglet. L'onglet Carte étant
  // monté de façon lazy par le TabView, `cameraRef.current` peut être null au
  // premier focus ; on retente alors une fois ~300 ms plus tard.
  useEffect(() => {
    if (!focusTarget) return;

    const target = focusTarget;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const ease = () => {
      if (!cameraRef.current) return false;
      cameraRef.current.easeTo({
        center: [target.longitude, target.latitude],
        zoom: 17,
        duration: 600,
      });
      return true;
    };

    if (!ease()) {
      // Caméra pas encore montée : nouvelle tentative unique après un court délai.
      retryTimer = setTimeout(ease, 300);
    }

    setHighlightedId(target.id);
    clearFocus();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [focusTarget, clearFocus]);

  // Retrait automatique du highlight ~3,5 s après son armement. Effet séparé
  // (clé highlightedId) pour que la consommation synchrone de focusTarget
  // ci-dessus ne déclenche pas le nettoyage de ce timer.
  useEffect(() => {
    if (highlightedId == null) return;
    const clearTimer = setTimeout(() => setHighlightedId(null), 3500);
    return () => clearTimeout(clearTimer);
  }, [highlightedId]);

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

  // Recherche d'adresse "en avant" (l'utilisateur tape) — complète le reverse
  // geocoding pour ne jamais rester bloqué quand aucune adresse proche n'est trouvée.
  const searchAddresses = useCallback(async (query: string) => {
    if (query.trim().length < 3) return;
    setLoadingSuggestions(true);
    try {
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6`;
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
      // Repositionnement : on conserve type + structure déjà choisis (l'assistant
      // ne repart pas de zéro), seule l'adresse est réinitialisée car elle change.
      setBuildingPin((current) =>
        current ? { ...current, ...point, selectedAddress: null } : makeDraftPin(point),
      );
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

  const updateActivePin = useCallback(
    (patch: Partial<DraftPin>) => {
      if (mode === "BATIMENT") {
        setBuildingPin((current) => (current ? { ...current, ...patch } : current));
        return;
      }
      setQuartierPins((current) =>
        current.map((pin) => (pin.id === activeQuartierPinId ? { ...pin, ...patch } : pin)),
      );
    },
    [mode, activeQuartierPinId],
  );

  // Sélection d'une adresse : on la mémorise ET on recale le pin sur ses coordonnées
  // (snap au bâtiment réel), qu'elle vienne du reverse geocoding ou de la recherche.
  const applyAddressToActivePin = useCallback(
    (feature: AdresseFeature) => {
      const coords = feature.geometry?.coordinates;
      const patch: Partial<DraftPin> = { selectedAddress: feature };
      if (coords && coords.length === 2) {
        patch.longitude = coords[0];
        patch.latitude = coords[1];
        cameraRef.current?.easeTo({
          center: [coords[0], coords[1]],
          zoom: 17,
          duration: 400,
        });
      }
      updateActivePin(patch);
    },
    [updateActivePin],
  );

  const handleMoveLieu = useCallback(
    async (point: TerrainPoint) => {
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
    },
    [movingLieu, refetch],
  );

  const handleMapPress = useCallback(
    (event: NativeSyntheticEvent<PressEvent>) => {
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
    },
    [movingLieu, mode, handleMoveLieu, setBuildingActivePin, addQuartierPin],
  );

  const selectQuartierPin = useCallback(
    (pin: DraftPin) => {
      setActiveQuartierPinId(pin.id);
      void fetchAddressSuggestions(pin);
    },
    [fetchAddressSuggestions],
  );

  const removeActiveQuartierPin = useCallback(() => {
    if (!activeQuartierPinId) return;
    setQuartierPins((current) => current.filter((pin) => pin.id !== activeQuartierPinId));
    setActiveQuartierPinId(null);
    setSuggestions([]);
  }, [activeQuartierPinId]);

  const handleCreateBatiment = useCallback(async () => {
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
  }, [buildingPin, role, userId, createMaison, refetch]);

  const handleCreateQuartier = useCallback(async () => {
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
  }, [quartierPins, role, userId, refetch, embedded]);

  const openEditLieu = useCallback((immeuble: Immeuble) => {
    setSelectedExistingLieu(null);
    setEditingLieu(immeuble);
    setEditingType(immeuble.typeHabitat ?? "IMMEUBLE");
    setEditingNbMaisons(immeuble.nbMaisonsPrevu ?? immeuble.nbPortesParEtage ?? 1);
  }, []);

  const handleSaveEditLieu = useCallback(async () => {
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
  }, [editingLieu, editingType, editingNbMaisons, refetch]);

  const handleDeleteLieu = useCallback(
    (immeuble: Immeuble) => {
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
    },
    [refetch],
  );

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
    highlightedId,
    quartiers,
    updateActivePin,
    searchAddresses,
    applyAddressToActivePin,
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
