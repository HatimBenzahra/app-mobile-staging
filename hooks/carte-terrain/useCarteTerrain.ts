import { useCreateMaison } from "@/hooks/api/use-create-maison";
import { useCreateQuartier } from "@/hooks/api/use-create-quartier";
import { useCurrentAssignment } from "@/hooks/api/use-current-assignment";
import { useMapFocus } from "@/hooks/use-map-focus";
import { useQuartiers } from "@/hooks/api/use-quartiers";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { useZonesForUser } from "@/hooks/api/use-zones-for-user";
import { api } from "@/services/api";
import { authService } from "@/services/auth";
import type {
  CreateQuartierPointInput,
  Immeuble,
  TypeHabitat,
  UserType,
  Zone,
} from "@/types/api";
import { type CameraRef, type PressEvent } from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import { Alert, useWindowDimensions } from "react-native";
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
  const { height: screenHeight } = useWindowDimensions();
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
  // Zone sélectionnée (tap sur son contour en VISUALISATION) → ouvre le ZoneSheet.
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
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
  // Porte mise en avant dans le BuildingSheet (anneau + pulse) après une
  // redirection depuis l'agenda (on cible la porte du RDV/repassage).
  const [highlightedPorteId, setHighlightedPorteId] = useState<number | null>(null);
  // Le highlight courant provient-il d'un focus porte (agenda) ? Détermine la
  // durée du pulse du bâtiment : aligné sur celui de la porte (5 s) pour qu'ils
  // soient mis en avant ensemble, vs 3,5 s pour un focus bâtiment seul (Lieux).
  const highlightWithPorteRef = useRef(false);
  // Ouverture du sheet différée : à l'arrivée d'un focus porte, le bâtiment peut
  // ne pas être encore chargé (profil en cours de fetch, onglet monté en lazy).
  // On mémorise la cible et un effet ouvre le sheet dès que le bâtiment existe.
  const [pendingPorteFocus, setPendingPorteFocus] = useState<{
    immeubleId: number;
    porteId: number;
  } | null>(null);
  const navigatingRef = useRef(false);
  // Garde anti-doublon du téléchargement offline auto (1 pack max par zone).
  const offlineRequestedAreasRef = useRef<Set<string>>(new Set());
  // Jeton de séquence : `suggestions` est partagé entre tous les pins, une réponse
  // arrivée en retard (switch rapide de pin) ne doit pas écraser la liste courante.
  const suggestionsRequestRef = useRef(0);
  // Remet le garde à zéro dès que le panneau marqueur se ferme, et retire tout
  // highlight de porte (le sheet fermé n'a plus rien à mettre en avant).
  useEffect(() => {
    if (selectedExistingLieu === null) {
      navigatingRef.current = false;
      setHighlightedPorteId(null);
    } else {
      // Exclusivité BuildingSheet / ZoneSheet : ouvrir un bâtiment ferme la zone.
      // Couvre tous les points d'entrée (tap marqueur, focus porte agenda).
      setSelectedZone(null);
    }
  }, [selectedExistingLieu]);

  const { data: profile, refetch } = useWorkspaceProfile(userId, role);
  // Zones à afficher : source de vérité `zonesForUser` (commercial = ZoneEnCours ;
  // manager = possédées OU assignées). Le rôle stocké est en minuscules → on le
  // convertit vers l'enum `UserType` attendu par le hook.
  const userType = useMemo<UserType | null>(
    () => (role == null ? null : role === "manager" ? "MANAGER" : "COMMERCIAL"),
    [role],
  );
  const { data: userZones } = useZonesForUser(userId, userType);
  const { data: currentAssignment } = useCurrentAssignment(userId, userType);
  const { data: quartiers } = useQuartiers();
  const { createMaison, loading: creatingMaison } = useCreateMaison();
  const { createQuartier } = useCreateQuartier();
  const { focusTarget, focusOnZone, clearFocus } = useMapFocus();

  // "Voir sur la carte" : dès qu'une cible arrive, on centre la caméra et on
  // arme le highlight (via highlightedId), puis on CONSOMME la cible (clearFocus)
  // pour ne pas re-déclencher au remontage lazy de l'onglet. L'onglet Carte étant
  // monté de façon lazy par le TabView, `cameraRef.current` peut être null au
  // premier focus ; on retente alors une fois ~300 ms plus tard.
  useEffect(() => {
    if (!focusTarget) return;

    const target = focusTarget;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // Focus ZONE (création de zone) : on cadre toute l'emprise via `fitBounds`.
    // Comme le focus point, la caméra peut ne pas être montée au premier rendu
    // (onglet Carte lazy) → même retry unique ~300 ms.
    if (target.kind === "zone") {
      const bounds = target.bounds;
      const fit = () => {
        if (!cameraRef.current) return false;
        cameraRef.current.fitBounds(bounds, {
          padding: { top: 80, right: 60, bottom: 80, left: 60 },
          duration: 650,
        });
        return true;
      };
      if (!fit()) {
        retryTimer = setTimeout(fit, 300);
      }
      clearFocus();
      return () => {
        if (retryTimer) clearTimeout(retryTimer);
      };
    }

    const withPorte = target.porteId != null;

    // Focus porte (agenda) : le BuildingSheet recouvre le bas de l'écran. On donne
    // à la caméra un `padding` bas égal à la zone couverte par le sheet : MapLibre
    // centre alors le bâtiment dans la bande VISIBLE au-dessus du modal (recadrage
    // exact, en points écran — pas de calcul mètres/pixel dépendant des tuiles). Le
    // padding est remis à zéro sur les autres mouvements caméra (recentrage GPS,
    // choix d'adresse) pour ne jamais rester collé.
    const zoom = withPorte ? 18 : 17;
    const sheetPadding = withPorte ? Math.round(screenHeight * 0.58) : 0;

    const ease = () => {
      if (!cameraRef.current) return false;
      cameraRef.current.easeTo({
        center: [target.longitude, target.latitude],
        zoom,
        duration: 650,
        padding: { top: 0, right: 0, bottom: sheetPadding, left: 0 },
      });
      return true;
    };

    if (!ease()) {
      // Caméra pas encore montée : nouvelle tentative unique après un court délai.
      retryTimer = setTimeout(ease, 300);
    }

    highlightWithPorteRef.current = withPorte;
    setHighlightedId(target.id);
    if (withPorte) {
      setPendingPorteFocus({ immeubleId: target.id, porteId: target.porteId! });
    }
    clearFocus();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [focusTarget, clearFocus, screenHeight]);

  // Retrait automatique du highlight ~3,5 s après son armement. Effet séparé
  // (clé highlightedId) pour que la consommation synchrone de focusTarget
  // ci-dessus ne déclenche pas le nettoyage de ce timer.
  useEffect(() => {
    if (highlightedId == null) return;
    const duration = highlightWithPorteRef.current ? 5000 : 3500;
    const clearTimer = setTimeout(() => setHighlightedId(null), duration);
    return () => clearTimeout(clearTimer);
  }, [highlightedId]);

  // Le pulse de la porte ciblée se calme ~5 s après son armement (le sheet, lui,
  // reste ouvert). Effet séparé pour ne pas être remis à zéro par les rendus
  // intermédiaires de l'ouverture du sheet.
  useEffect(() => {
    if (highlightedPorteId == null) return;
    const clearTimer = setTimeout(() => setHighlightedPorteId(null), 5000);
    return () => clearTimeout(clearTimer);
  }, [highlightedPorteId]);

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

  // Ouverture différée du BuildingSheet sur la cible d'un focus porte : on attend
  // que le bâtiment soit présent dans `immeubles` (profil chargé), puis on ouvre
  // le sheet et on arme le highlight de la porte.
  useEffect(() => {
    if (!pendingPorteFocus) return;
    const building = immeubles.find((imm) => imm.id === pendingPorteFocus.immeubleId);
    if (!building) return; // bâtiment pas encore chargé : on retentera au prochain rendu
    setSelectedExistingLieu(building);
    setMovingLieu(null);
    setEditingLieu(null);
    setHighlightedPorteId(pendingPorteFocus.porteId);
    setPendingPorteFocus(null);
  }, [pendingPorteFocus, immeubles]);

  const currentUserName = useMemo(() => {
    const prenom = profile?.prenom?.trim();
    const nom = profile?.nom?.trim();
    const full = [prenom, nom].filter(Boolean).join(" ");
    return full || undefined;
  }, [profile]);

  // Zone(s) à afficher pour l'utilisateur — via `zonesForUser` (cf. userType).
  const zones = useMemo(() => userZones ?? [], [userZones]);

  // « Ma zone » = la zone ACTIVE de l'utilisateur (assignation en cours). À
  // défaut d'assignation active, on retombe sur la plus récente (zones triées
  // `createdAt desc` côté backend → premier élément).
  const myZone = useMemo(() => {
    if (zones.length === 0) return null;
    const activeZoneId = currentAssignment?.zoneId;
    const active =
      activeZoneId != null ? zones.find((zone) => zone.id === activeZoneId) : undefined;
    return active ?? zones[0];
  }, [zones, currentAssignment]);

  // Recentre la carte sur « ma zone » via le focus partagé (fitBounds sur son
  // emprise, réutilise zoneBounds). No-op s'il n'existe aucune zone.
  const focusMyZone = useCallback(() => {
    if (!myZone) return;
    focusOnZone(myZone);
  }, [myZone, focusOnZone]);

  // Tap sur le contour d'une zone (VISUALISATION) : on retrouve la zone dans la
  // liste du profil, on ouvre le ZoneSheet et on ferme le BuildingSheet
  // (exclusivité des deux cartes flottantes).
  const handleSelectZone = useCallback(
    (zoneId: number) => {
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone) return;
      setSelectedExistingLieu(null);
      setSelectedZone(zone);
    },
    [zones],
  );

  const closeZoneSheet = useCallback(() => setSelectedZone(null), []);

  const toggleShowTeam = useCallback(() => setShowTeam((current) => !current), []);

  const fetchAddressSuggestions = useCallback(async (point: TerrainPoint) => {
    const requestId = ++suggestionsRequestRef.current;
    setLoadingSuggestions(true);
    try {
      const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${point.longitude}&lat=${point.latitude}&limit=5`;
      const response = await fetch(url);
      if (suggestionsRequestRef.current !== requestId) return; // réponse périmée
      if (!response.ok) {
        setSuggestions([]);
        return;
      }
      const data = await response.json();
      if (suggestionsRequestRef.current !== requestId) return; // réponse périmée
      setSuggestions((data?.features as AdresseFeature[]) || []);
    } catch {
      if (suggestionsRequestRef.current === requestId) setSuggestions([]);
    } finally {
      if (suggestionsRequestRef.current === requestId) setLoadingSuggestions(false);
    }
  }, []);

  // Recherche d'adresse "en avant" (l'utilisateur tape) — complète le reverse
  // geocoding pour ne jamais rester bloqué quand aucune adresse proche n'est trouvée.
  const searchAddresses = useCallback(async (query: string) => {
    if (query.trim().length < 3) return;
    const requestId = ++suggestionsRequestRef.current;
    setLoadingSuggestions(true);
    try {
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6`;
      const response = await fetch(url);
      if (suggestionsRequestRef.current !== requestId) return; // réponse périmée
      if (!response.ok) {
        setSuggestions([]);
        return;
      }
      const data = await response.json();
      if (suggestionsRequestRef.current !== requestId) return; // réponse périmée
      setSuggestions((data?.features as AdresseFeature[]) || []);
    } catch {
      if (suggestionsRequestRef.current === requestId) setSuggestions([]);
    } finally {
      if (suggestionsRequestRef.current === requestId) setLoadingSuggestions(false);
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
        // Réinitialise tout padding posé par un focus porte précédent.
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
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
          // Réinitialise tout padding posé par un focus porte précédent.
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
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
        setSelectedZone(null);
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
      if (pin.selectedAddress) {
        // Pin déjà adressé : on affiche l'adresse committée (et on invalide toute
        // recherche en vol) au lieu de relancer un reverse-geocoding qui la masquerait.
        suggestionsRequestRef.current += 1;
        setSuggestions([pin.selectedAddress]);
        setLoadingSuggestions(false);
        return;
      }
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
      const points: CreateQuartierPointInput[] = quartierPins.map((pin) => {
        const isImmeuble = pin.typeHabitat === "IMMEUBLE";
        const isPavillon = pin.typeHabitat === "PAVILLON";
        return {
          adresse: pin.selectedAddress!.properties.label,
          latitude: pin.latitude,
          longitude: pin.longitude,
          typeHabitat: pin.typeHabitat,
          // Immeuble : structure réellement saisie par lieu (plus de coquille vide).
          // Pavillon : N maisons (1 foyer chacune) → N étages × 1 porte.
          nbEtages: isImmeuble ? pin.nbEtages : isPavillon ? pin.nbMaisonsPrevu : 1,
          nbPortesParEtage: isImmeuble ? pin.nbPortesParEtage : 1,
          nbMaisonsPrevu: isPavillon ? pin.nbMaisonsPrevu : 1,
        };
      });

      const result = await createQuartier({
        commercialId: role === "commercial" ? (userId ?? undefined) : undefined,
        managerId: role === "manager" ? (userId ?? undefined) : undefined,
        points,
      });

      if (!result) {
        Alert.alert("Creation impossible", "Le quartier n'a pas pu etre cree.");
        return;
      }

      await refetch();
      setQuartierPins([]);
      setActiveQuartierPinId(null);
      setSuggestions([]);
      if (result.id) {
        router.push(`/quartier/${result.id}`);
      } else if (!embedded) {
        router.back();
      }
    } finally {
      setCreatingLieu(false);
    }
  }, [quartierPins, role, userId, createQuartier, refetch, embedded]);

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
    userType,
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
    selectedZone,
    handleSelectZone,
    closeZoneSheet,
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
    highlightedPorteId,
    quartiers,
    zones,
    myZone,
    focusMyZone,
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
