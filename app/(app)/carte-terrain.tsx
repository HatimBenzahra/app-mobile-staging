import BuildingSheet from "@/components/carte-terrain/BuildingSheet";
import { CarteTerrainMap } from "@/components/carte-terrain/CarteTerrainMap";
import { DraftPins } from "@/components/carte-terrain/DraftPins";
import { MapFabs } from "@/components/carte-terrain/MapFabs";
import { MapLegend } from "@/components/carte-terrain/MapLegend";
import { ModeSwitch } from "@/components/carte-terrain/ModeSwitch";
import { QuartierContours } from "@/components/carte-terrain/QuartierContours";
import { CreatePanel } from "@/components/carte-terrain/panels/CreatePanel";
import { EditLieuPanel } from "@/components/carte-terrain/panels/EditLieuPanel";
import { styles } from "@/components/carte-terrain/styles";
import { TerrainMarkers } from "@/components/carte-terrain/TerrainMarkers";
import { useCarteTerrain } from "@/hooks/carte-terrain/useCarteTerrain";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CarteTerrainScreenProps = {
  embedded?: boolean;
};

export default function CarteTerrainScreen({
  embedded = false,
}: CarteTerrainScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const {
    cameraRef,
    navigatingRef,
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
  } = useCarteTerrain({ embedded });

  // Préserve l'état au retour de navigation : quand l'écran redevient focalisé
  // (retour depuis /lieu/[id]), on réarme le garde de navigation. La sélection
  // (selectedExistingLieu) n'est volontairement pas effacée à la navigation, donc
  // la BuildingSheet se ré-ouvre automatiquement sur le même bâtiment.
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) navigatingRef.current = false;
  }, [isFocused, navigatingRef]);

  return (
    <View style={styles.container}>
      <CarteTerrainMap
        cameraRef={cameraRef}
        mapCenter={mapCenter}
        satellite={satellite}
        onPress={handleMapPress}
      >
        <QuartierContours quartiers={quartiers ?? []} immeubles={immeubles} mode={mode} />
        <TerrainMarkers
          immeubles={immeubles}
          mode={mode}
          highlightedId={highlightedId}
          onSelectLieu={(immeuble) => {
            setSelectedExistingLieu(immeuble);
            setMovingLieu(null);
            setEditingLieu(null);
          }}
        />
        <DraftPins
          mode={mode}
          buildingPin={buildingPin}
          quartierPins={quartierPins}
          activeQuartierPinId={activeQuartierPinId}
          onSelectQuartierPin={selectQuartierPin}
        />
      </CarteTerrainMap>

      <MapFabs
        embedded={embedded}
        insets={insets}
        satellite={satellite}
        loadingLocation={loadingLocation}
        showTeamToggle={role === "manager"}
        showTeam={showTeam}
        onToggleSatellite={() => setSatellite((s) => !s)}
        onToggleTeam={toggleShowTeam}
        onRecenter={centerOnCurrentLocation}
      />

      {mode === "VISUALISATION" && !selectedExistingLieu && <MapLegend insets={insets} role={role} />}

      <ModeSwitch
        insets={insets}
        mode={mode}
        onSelectMode={(nextMode) => {
          setMode(nextMode);
          setSuggestions([]);
          setSelectedExistingLieu(null);
          setEditingLieu(null);
          setMovingLieu(null);
        }}
      />

      <BuildingSheet
        open={!!selectedExistingLieu}
        immeuble={selectedExistingLieu}
        updatingLieu={updatingLieu}
        currentUserName={currentUserName}
        onClose={() => setSelectedExistingLieu(null)}
        onProspect={(immeuble) => {
          if (navigatingRef.current) return;
          navigatingRef.current = true;
          // On NE vide PAS la sélection : la sheet se masque via le focus puis
          // se ré-ouvre sur ce bâtiment au retour (état préservé).
          router.push(`/lieu/${immeuble.id}`);
        }}
        onEdit={openEditLieu}
        onMove={(immeuble) => {
          setMovingLieu(immeuble);
          setSelectedExistingLieu(null);
        }}
        onDelete={handleDeleteLieu}
      />

      {editingLieu ? (
        <EditLieuPanel
          insets={insets}
          editingLieu={editingLieu}
          editingType={editingType}
          editingNbMaisons={editingNbMaisons}
          updatingLieu={updatingLieu}
          onClose={() => setEditingLieu(null)}
          onSelectType={setEditingType}
          onChangeNbMaisons={setEditingNbMaisons}
          onSave={handleSaveEditLieu}
        />
      ) : mode !== "VISUALISATION" ? (
        <CreatePanel
          insets={insets}
          mode={mode}
          quartierPins={quartierPins}
          activeQuartierPinId={activeQuartierPinId}
          activePin={activePin}
          suggestions={suggestions}
          loadingSuggestions={loadingSuggestions}
          creating={creating}
          readyToCreateBatiment={readyToCreateBatiment}
          readyToCreateQuartier={readyToCreateQuartier}
          onRemoveActiveQuartierPin={removeActiveQuartierPin}
          onSelectQuartierPin={selectQuartierPin}
          onUpdateActivePin={updateActivePin}
          onCreateBatiment={handleCreateBatiment}
          onCreateQuartier={handleCreateQuartier}
        />
      ) : null}
    </View>
  );
}
