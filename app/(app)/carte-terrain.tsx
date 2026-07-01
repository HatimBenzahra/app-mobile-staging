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
import type { TerrainMode } from "@/hooks/carte-terrain/types";
import type { Immeuble } from "@/types/api";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect } from "react";
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
  } = useCarteTerrain({ embedded });

  // La BuildingSheet est une Card interne à l'écran : sa visibilité dépend
  // uniquement de `selectedExistingLieu`. En allant sur /lieu/[id], la carte est
  // recouverte par l'écran empilé (Stack) puis réapparaît telle quelle au retour,
  // sélection conservée. Cet effet ne sert donc plus qu'à réarmer le garde
  // anti-double-navigation (`navigatingRef`) quand l'écran redevient focalisé.
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) navigatingRef.current = false;
  }, [isFocused, navigatingRef]);

  const handleSelectLieu = useCallback(
    (immeuble: Immeuble) => {
      setSelectedExistingLieu(immeuble);
      setMovingLieu(null);
      setEditingLieu(null);
    },
    [setSelectedExistingLieu, setMovingLieu, setEditingLieu],
  );

  const handleToggleSatellite = useCallback(() => {
    setSatellite((s) => !s);
  }, [setSatellite]);

  const handleSelectMode = useCallback(
    (nextMode: TerrainMode) => {
      setMode(nextMode);
      setSuggestions([]);
      setSelectedExistingLieu(null);
      setEditingLieu(null);
      setMovingLieu(null);
    },
    [setMode, setSuggestions, setSelectedExistingLieu, setEditingLieu, setMovingLieu],
  );

  const handleCloseBuildingSheet = useCallback(() => {
    setSelectedExistingLieu(null);
  }, [setSelectedExistingLieu]);

  const handleProspect = useCallback(
    (immeuble: Immeuble) => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      // On NE vide PAS la sélection : l'écran /lieu/[id] recouvre la carte, puis
      // la Card de consultation réapparaît sur ce bâtiment au retour (état préservé).
      router.push(`/lieu/${immeuble.id}`);
    },
    [navigatingRef],
  );

  const handleMoveFromSheet = useCallback(
    (immeuble: Immeuble) => {
      setMovingLieu(immeuble);
      setSelectedExistingLieu(null);
    },
    [setMovingLieu, setSelectedExistingLieu],
  );

  const handleCloseEditLieuPanel = useCallback(() => {
    setEditingLieu(null);
  }, [setEditingLieu]);

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
          onSelectLieu={handleSelectLieu}
        />
        <DraftPins
          mode={mode}
          buildingPin={buildingPin}
          quartierPins={quartierPins}
          activeQuartierPinId={activeQuartierPinId}
          onSelectQuartierPin={selectQuartierPin}
        />
      </CarteTerrainMap>

      {!selectedExistingLieu && (
        <MapFabs
          embedded={embedded}
          insets={insets}
          satellite={satellite}
          loadingLocation={loadingLocation}
          showTeamToggle={role === "manager"}
          showTeam={showTeam}
          onToggleSatellite={handleToggleSatellite}
          onToggleTeam={toggleShowTeam}
          onRecenter={centerOnCurrentLocation}
        />
      )}

      {mode === "VISUALISATION" && !selectedExistingLieu && <MapLegend insets={insets} role={role} />}

      <ModeSwitch
        insets={insets}
        mode={mode}
        onSelectMode={handleSelectMode}
      />

      <BuildingSheet
        open={!!selectedExistingLieu}
        immeuble={selectedExistingLieu}
        updatingLieu={updatingLieu}
        currentUserName={currentUserName}
        onClose={handleCloseBuildingSheet}
        onProspect={handleProspect}
        onEdit={openEditLieu}
        onMove={handleMoveFromSheet}
        onDelete={handleDeleteLieu}
      />

      {editingLieu ? (
        <EditLieuPanel
          insets={insets}
          editingLieu={editingLieu}
          editingType={editingType}
          editingNbMaisons={editingNbMaisons}
          updatingLieu={updatingLieu}
          onClose={handleCloseEditLieuPanel}
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
          onSearchAddress={searchAddresses}
          onPickAddress={applyAddressToActivePin}
          onCreateBatiment={handleCreateBatiment}
          onCreateQuartier={handleCreateQuartier}
        />
      ) : null}
    </View>
  );
}
