import { Card } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useCreateMaison } from "@/hooks/api/use-create-maison";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { api } from "@/services/api";
import { authService } from "@/services/auth";
import type { CreateQuartierPointInput, Immeuble, TypeHabitat } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import {
  Camera,
  Map as MapLibreMap,
  Marker,
  UserLocation,
  type CameraRef,
  type PressEvent,
} from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AdresseFeature = {
  properties: {
    id?: string;
    label: string;
    name?: string;
    postcode?: string;
    city?: string;
    housenumber?: string;
    street?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

type TerrainPoint = {
  latitude: number;
  longitude: number;
};

type TerrainMode = "VISUALISATION" | "BATIMENT" | "QUARTIER";

type DraftPin = TerrainPoint & {
  id: string;
  selectedAddress: AdresseFeature | null;
  typeHabitat: TypeHabitat;
  nbMaisonsPrevu: number;
};

const DEFAULT_REGION = {
  latitude: 48.8566,
  longitude: 2.3522,
};

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const habitatOptions: {
  type: TypeHabitat;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { type: "MAISON", label: "Maison", icon: "home" },
  { type: "PAVILLON", label: "Pavillon", icon: "grid" },
  { type: "IMMEUBLE", label: "Immeuble", icon: "layers" },
];

function formatSuggestion(feature: AdresseFeature) {
  const p = feature.properties;
  const title = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || p.label;
  const subtitle = [p.postcode, p.city].filter(Boolean).join(" ");
  return { title, subtitle };
}

function makeDraftPin(point: TerrainPoint): DraftPin {
  return {
    ...point,
    id: `${Date.now()}-${Math.round(point.latitude * 100000)}-${Math.round(point.longitude * 100000)}`,
    selectedAddress: null,
    typeHabitat: "MAISON",
    nbMaisonsPrevu: 2,
  };
}

function getLieuMarkerColor(type?: TypeHabitat) {
  if (type === "MAISON") return colors.success;
  if (type === "PAVILLON") return "#F97316";
  return colors.primary;
}

function getHabitatLabel(type?: TypeHabitat) {
  if (type === "MAISON") return "Maison";
  if (type === "PAVILLON") return "Pavillon";
  return "Immeuble";
}

type CarteTerrainScreenProps = {
  embedded?: boolean;
  onNavigateToLieu?: (immeubleId: number) => void;
};

export default function CarteTerrainScreen({
  embedded = false,
  onNavigateToLieu,
}: CarteTerrainScreenProps = {}) {
  const insets = useSafeAreaInsets();
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
    const ownImmeubles = (profile?.immeubles || []) as Immeuble[];
    const teamImmeubles =
      role === "manager"
        ? ((profile as { commercials?: { immeubles?: Immeuble[] }[] } | null)?.commercials || [])
            .flatMap((commercial) => commercial.immeubles || [])
        : [];

    const byId = new Map<number, Immeuble>();
    [...ownImmeubles, ...teamImmeubles].forEach((immeuble) => {
      if (immeuble.latitude != null && immeuble.longitude != null) {
        byId.set(immeuble.id, immeuble);
      }
    });
    return Array.from(byId.values());
  }, [profile, role]);

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

  const createBuildingInput = (draft: DraftPin) => ({
    adresse: draft.selectedAddress!.properties.label,
    latitude: draft.latitude,
    longitude: draft.longitude,
    nbEtages: 1,
    nbPortesParEtage: draft.typeHabitat === "PAVILLON" ? draft.nbMaisonsPrevu : 1,
    nbMaisonsPrevu: draft.typeHabitat === "PAVILLON" ? draft.nbMaisonsPrevu : 1,
    ascenseurPresent: false,
    digitalCode: null,
    commercialId: role === "commercial" ? (userId ?? undefined) : undefined,
    managerId: role === "manager" ? (userId ?? undefined) : undefined,
    typeHabitat: draft.typeHabitat,
  });

  const handleCreateBatiment = async () => {
    if (!buildingPin || !buildingPin.selectedAddress) {
      Alert.alert("Adresse requise", "Pose un pin puis choisis une adresse avant de creer.");
      return;
    }

    setCreatingLieu(true);
    try {
      const input = createBuildingInput(buildingPin);
      const result =
        buildingPin.typeHabitat === "MAISON"
          ? await createMaison(input)
          : await api.immeubles.create(input);

      if (!result) {
        Alert.alert("Creation impossible", "Le lieu n'a pas pu etre cree.");
        return;
      }

      await refetch();
      if (embedded) {
        setBuildingPin(null);
        setSuggestions([]);
        return;
      }
      router.back();
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
        nbEtages: 1,
        nbPortesParEtage: pin.typeHabitat === "PAVILLON" ? pin.nbMaisonsPrevu : 1,
        nbMaisonsPrevu: pin.typeHabitat === "PAVILLON" ? pin.nbMaisonsPrevu : 1,
      }));

      await api.immeubles.createQuartier({
        commercialId: role === "commercial" ? (userId ?? undefined) : undefined,
        managerId: role === "manager" ? (userId ?? undefined) : undefined,
        points,
      });

      await refetch();
      if (embedded) {
        setQuartierPins([]);
        setActiveQuartierPinId(null);
        setSuggestions([]);
        return;
      }
      router.back();
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

  return (
    <View style={styles.container}>
      <MapLibreMap
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        onPress={handleMapPress}
        logo={false}
        compass
        scaleBar
        attribution
        preferredFramesPerSecond={30}
        androidView="surface"
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [mapCenter.longitude, mapCenter.latitude],
            zoom: 15,
          }}
          minZoom={5}
          maxZoom={20}
        />
        <UserLocation animated accuracy heading />
        {immeubles.map((immeuble) => (
          <Marker
            key={immeuble.id}
            id={`immeuble-${immeuble.id}`}
            lngLat={[immeuble.longitude!, immeuble.latitude!]}
            anchor="bottom"
            onPress={(event) => {
              event.stopPropagation();
              if (mode !== "VISUALISATION") return;
              setSelectedExistingLieu(immeuble);
              setMovingLieu(null);
              setEditingLieu(null);
            }}
          >
            <View
              style={[
                styles.mapMarker,
                {
                  backgroundColor: getLieuMarkerColor(immeuble.typeHabitat),
                },
              ]}
            >
              <Feather name="map-pin" size={18} color={colors.textOnPrimary} />
            </View>
          </Marker>
        ))}
        {buildingPin && mode === "BATIMENT" && (
          <Marker
            id="new-building-pin"
            lngLat={[buildingPin.longitude, buildingPin.latitude]}
            anchor="bottom"
          >
            <View style={[styles.mapMarker, styles.newMapMarker]}>
              <Feather name="map-pin" size={20} color={colors.textOnPrimary} />
            </View>
          </Marker>
        )}
        {quartierPins.map((pin, index) => (
          <Marker
            key={pin.id}
            id={`quartier-pin-${pin.id}`}
            lngLat={[pin.longitude, pin.latitude]}
            anchor="bottom"
            onPress={(event) => {
              event.stopPropagation();
              selectQuartierPin(pin);
            }}
          >
            <View
              style={[
                styles.quartierMapMarker,
                pin.id === activeQuartierPinId && styles.quartierMapMarkerActive,
              ]}
            >
              <Text style={styles.quartierMapMarkerText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapLibreMap>

      {!embedded && (
        <Pressable
          style={[styles.backFab, { top: insets.top + 10 }]}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
      )}

      <Pressable
        style={[styles.recenterFab, { bottom: insets.bottom + 24 }]}
        onPress={centerOnCurrentLocation}
      >
        {loadingLocation ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name="crosshair" size={22} color={colors.primary} />
        )}
      </Pressable>

      <View style={[styles.modeSwitch, { top: insets.top + 10 }]}>
        {(["VISUALISATION", "BATIMENT", "QUARTIER"] as TerrainMode[]).map((nextMode) => {
          const selected = mode === nextMode;
          return (
            <Pressable
              key={nextMode}
              style={[styles.modeButton, selected && styles.modeButtonSelected]}
              onPress={() => {
                setMode(nextMode);
                setSuggestions([]);
                setSelectedExistingLieu(null);
                setEditingLieu(null);
                setMovingLieu(null);
              }}
            >
              <Feather
                name={
                  nextMode === "VISUALISATION"
                    ? "eye"
                    : nextMode === "BATIMENT"
                      ? "map-pin"
                      : "map"
                }
                size={15}
                color={selected ? colors.textOnPrimary : colors.primary}
              />
              <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
                {nextMode === "VISUALISATION"
                  ? "Voir"
                  : nextMode === "BATIMENT"
                    ? "Batiment"
                    : "Quartier"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedExistingLieu ? (
        <Card
          variant="elevated"
          padding="md"
          style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleBlock}>
              <Text style={styles.panelTitle} numberOfLines={1}>
                {getHabitatLabel(selectedExistingLieu.typeHabitat)}
              </Text>
              <Text style={styles.panelHint} numberOfLines={2}>
                {selectedExistingLieu.adresse}
              </Text>
            </View>
            <Pressable style={styles.iconButton} onPress={() => setSelectedExistingLieu(null)}>
              <Feather name="x" size={18} color={colors.textStrong} />
            </Pressable>
          </View>

          <View style={styles.markerActions}>
            <Pressable
              style={styles.markerAction}
              onPress={() => {
                onNavigateToLieu?.(selectedExistingLieu.id);
                setSelectedExistingLieu(null);
              }}
            >
              <Feather name="arrow-right-circle" size={18} color={colors.primary} />
              <Text style={styles.markerActionText}>Voir detail</Text>
            </Pressable>
            <Pressable
              style={styles.markerAction}
              onPress={() => openEditLieu(selectedExistingLieu)}
              disabled={updatingLieu}
            >
              <Feather name="edit-3" size={18} color={colors.primary} />
              <Text style={styles.markerActionText}>Modifier</Text>
            </Pressable>
            <Pressable
              style={[styles.markerAction, movingLieu?.id === selectedExistingLieu.id && styles.markerActionActive]}
              onPress={() => {
                setMovingLieu(selectedExistingLieu);
                setSelectedExistingLieu(null);
              }}
              disabled={updatingLieu}
            >
              <Feather name="move" size={18} color={colors.primary} />
              <Text style={styles.markerActionText}>Deplacer</Text>
            </Pressable>
            <Pressable
              style={[styles.markerAction, styles.markerActionDanger]}
              onPress={() => handleDeleteLieu(selectedExistingLieu)}
              disabled={updatingLieu}
            >
              {updatingLieu ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Feather name="trash-2" size={18} color={colors.danger} />
              )}
              <Text style={[styles.markerActionText, styles.markerActionDangerText]}>Supprimer</Text>
            </Pressable>
          </View>
        </Card>
      ) : editingLieu ? (
        <Card
          variant="elevated"
          padding="md"
          style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <View style={styles.panelHeader}>
            <View style={styles.panelTitleBlock}>
              <Text style={styles.panelTitle} numberOfLines={1}>
                Modifier le lieu
              </Text>
              <Text style={styles.panelHint} numberOfLines={2}>
                {editingLieu.adresse}
              </Text>
            </View>
            <Pressable style={styles.iconButton} onPress={() => setEditingLieu(null)}>
              <Feather name="x" size={18} color={colors.textStrong} />
            </Pressable>
          </View>

          <View style={styles.typeRow}>
            {habitatOptions.map((option) => {
              const selected = editingType === option.type;
              return (
                <Pressable
                  key={option.type}
                  style={[styles.typeButton, selected && styles.typeButtonSelected]}
                  onPress={() => setEditingType(option.type)}
                >
                  <Feather
                    name={option.icon}
                    size={16}
                    color={selected ? colors.textOnPrimary : colors.primary}
                  />
                  <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {editingType === "PAVILLON" && (
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Maisons prevues</Text>
              <View style={styles.stepperControls}>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => setEditingNbMaisons((value) => Math.max(1, value - 1))}
                >
                  <Feather name="minus" size={16} color={colors.primary} />
                </Pressable>
                <Text style={styles.stepperValue}>{editingNbMaisons}</Text>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => setEditingNbMaisons((value) => value + 1)}
                >
                  <Feather name="plus" size={16} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          )}

          <Pressable
            style={[styles.createButton, updatingLieu && styles.createButtonDisabled]}
            onPress={handleSaveEditLieu}
            disabled={updatingLieu}
          >
            {updatingLieu ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <>
                <Text style={styles.createText}>Enregistrer</Text>
                <Feather name="check" size={16} color={colors.textOnPrimary} />
              </>
            )}
          </Pressable>
        </Card>
      ) : mode !== "VISUALISATION" ? (
      <Card
        variant="elevated"
        padding="md"
        style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleBlock}>
            <Text style={styles.panelTitle}>
              {mode === "BATIMENT" ? "Nouveau batiment" : `Quartier (${quartierPins.length})`}
            </Text>
            <Text style={styles.panelHint}>
              {activePin
                ? "Choisis l'adresse puis le type."
                : mode === "BATIMENT"
                  ? "Touche la carte pour poser le repere."
                  : "Touche la carte pour ajouter un pin."}
            </Text>
          </View>
          {mode === "QUARTIER" && activeQuartierPinId ? (
            <Pressable style={styles.pinBadge} onPress={removeActiveQuartierPin}>
              <Feather name="trash-2" size={16} color={colors.danger} />
            </Pressable>
          ) : (
            <View style={styles.pinBadge}>
              <Feather name="map-pin" size={16} color={colors.danger} />
            </View>
          )}
        </View>

        {mode === "QUARTIER" && quartierPins.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pinList}
          >
            {quartierPins.map((pin, index) => {
              const selected = pin.id === activeQuartierPinId;
              return (
                <Pressable
                  key={pin.id}
                  style={[styles.pinChip, selected && styles.pinChipSelected]}
                  onPress={() => selectQuartierPin(pin)}
                >
                  <Text style={[styles.pinChipText, selected && styles.pinChipTextSelected]}>
                    {index + 1}
                  </Text>
                  <Feather
                    name={pin.selectedAddress ? "check" : "alert-circle"}
                    size={13}
                    color={selected ? colors.textOnPrimary : colors.textStrong}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {loadingSuggestions ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helper}>Recherche des adresses proches...</Text>
          </View>
        ) : suggestions.length > 0 ? (
          <FlatList
            horizontal
            data={suggestions}
            keyExtractor={(item, index) => item.properties.id ?? `${item.properties.label}-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsList}
            renderItem={({ item }) => {
              const formatted = formatSuggestion(item);
              const selected = activePin?.selectedAddress?.properties.label === item.properties.label;
              return (
                <Pressable
                  style={[styles.suggestionCard, selected && styles.suggestionCardSelected]}
                  onPress={() => updateActivePin({ selectedAddress: item })}
                >
                  <Text style={styles.suggestionTitle} numberOfLines={1}>
                    {formatted.title}
                  </Text>
                  <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                    {formatted.subtitle || item.properties.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : (
          <Text style={styles.helper}>
            {activePin ? "Aucune adresse proche trouvee. Replace le pin legerement." : "Aucun pin actif."}
          </Text>
        )}

        {activePin && (
          <>
            <View style={styles.typeRow}>
              {habitatOptions.map((option) => {
                const selected = activePin.typeHabitat === option.type;
                return (
                  <Pressable
                    key={option.type}
                    style={[styles.typeButton, selected && styles.typeButtonSelected]}
                    onPress={() => updateActivePin({ typeHabitat: option.type })}
                  >
                    <Feather
                      name={option.icon}
                      size={16}
                      color={selected ? colors.textOnPrimary : colors.primary}
                    />
                    <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {activePin.typeHabitat === "PAVILLON" && (
              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>Maisons prevues</Text>
                <View style={styles.stepperControls}>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() =>
                      updateActivePin({ nbMaisonsPrevu: Math.max(1, activePin.nbMaisonsPrevu - 1) })
                    }
                  >
                    <Feather name="minus" size={16} color={colors.primary} />
                  </Pressable>
                  <Text style={styles.stepperValue}>{activePin.nbMaisonsPrevu}</Text>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => updateActivePin({ nbMaisonsPrevu: activePin.nbMaisonsPrevu + 1 })}
                  >
                    <Feather name="plus" size={16} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}

        <Pressable
          style={[
            styles.createButton,
            (mode === "BATIMENT" ? !readyToCreateBatiment : !readyToCreateQuartier) &&
              styles.createButtonDisabled,
          ]}
          onPress={mode === "BATIMENT" ? handleCreateBatiment : handleCreateQuartier}
          disabled={mode === "BATIMENT" ? !readyToCreateBatiment : !readyToCreateQuartier}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <>
              <Text style={styles.createText}>
                {mode === "BATIMENT" ? "Creer le lieu" : "Creer le quartier"}
              </Text>
              <Feather name="arrow-right" size={16} color={colors.textOnPrimary} />
            </>
          )}
        </Pressable>
      </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backFab: {
    position: "absolute",
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  recenterFab: {
    position: "absolute",
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeSwitch: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 8,
    padding: 4,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeButton: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modeButtonSelected: {
    backgroundColor: colors.primary,
  },
  modeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },
  modeTextSelected: {
    color: colors.textOnPrimary,
  },
  panel: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    gap: 12,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  panelTitleBlock: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  panelHint: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textStrong,
  },
  pinBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
  },
  mapMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  newMapMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.danger,
  },
  quartierMapMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: "#F97316",
    elevation: 4,
  },
  quartierMapMarkerActive: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger,
  },
  quartierMapMarkerText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  pinList: {
    gap: 8,
  },
  pinChip: {
    minWidth: 48,
    height: 34,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: colors.surfaceMuted,
  },
  pinChipSelected: {
    backgroundColor: colors.primary,
  },
  pinChipText: {
    color: colors.textStrong,
    fontSize: 12,
    fontWeight: "900",
  },
  pinChipTextSelected: {
    color: colors.textOnPrimary,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  helper: {
    fontSize: 12,
    color: colors.textStrong,
  },
  suggestionsList: {
    gap: 8,
    paddingVertical: 2,
  },
  suggestionCard: {
    width: 190,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.surface,
  },
  suggestionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  suggestionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: colors.textStrong,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.surface,
  },
  typeButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
  },
  typeLabelSelected: {
    color: colors.textOnPrimary,
  },
  stepperRow: {
    minHeight: 44,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceMuted,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.text,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperValue: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "900",
    color: colors.text,
  },
  markerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  markerAction: {
    flexGrow: 1,
    flexBasis: "22%",
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.surface,
  },
  markerActionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  markerActionDanger: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  markerActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
  },
  markerActionDangerText: {
    color: colors.danger,
  },
  createButton: {
    height: 50,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
  },
  createButtonDisabled: {
    opacity: 0.55,
  },
  createText: {
    color: colors.textOnPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
});
