import BuildingSheet from "@/components/carte-terrain/BuildingSheet";
import { CarteTerrainMap } from "@/components/carte-terrain/CarteTerrainMap";
import { DraftPins } from "@/components/carte-terrain/DraftPins";
import { MapFabs } from "@/components/carte-terrain/MapFabs";
import { MapLegend } from "@/components/carte-terrain/MapLegend";
import { MapLocatingOverlay } from "@/components/carte-terrain/MapLocatingOverlay";
import { ModeSwitch } from "@/components/carte-terrain/ModeSwitch";
import { MyZoneChip } from "@/components/carte-terrain/MyZoneChip";
import { QuartierContours } from "@/components/carte-terrain/QuartierContours";
import { ZoneContour } from "@/components/carte-terrain/ZoneContour";
import ZoneSheet from "@/components/carte-terrain/ZoneSheet";
import ZonesHistoryModal from "@/components/carte-terrain/ZonesHistoryModal";
import { CreatePanel } from "@/components/carte-terrain/panels/CreatePanel";
import { EditLieuPanel } from "@/components/carte-terrain/panels/EditLieuPanel";
import { styles } from "@/components/carte-terrain/styles";
import { TerrainMarkers } from "@/components/carte-terrain/TerrainMarkers";
import { useCarteTerrain } from "@/hooks/carte-terrain/useCarteTerrain";
import type { TerrainMode } from "@/hooks/carte-terrain/types";
import { useMapFocus } from "@/hooks/use-map-focus";
import { useZoneDetailPanel } from "@/hooks/use-zone-detail-panel";
import { useZonesHistoryModal } from "@/hooks/use-zones-history-modal";
import type { Immeuble } from "@/types/api";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CarteTerrainScreenProps = {
  embedded?: boolean;
};

export default function CarteTerrainScreen({
  embedded = false,
}: CarteTerrainScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const { openZoneDetail } = useZoneDetailPanel();
  const {
    open: zonesHistoryOpen,
    openZonesHistory,
    closeZonesHistory,
  } = useZonesHistoryModal();
  const { focusOnZone } = useMapFocus();
  const {
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
    initialLocating,
    loadingSuggestions,
    selectedExistingLieu,
    setSelectedExistingLieu,
    selectedLieuLoading,
    selectedLieuError,
    retrySelectedLieuDetail,
    selectedZone,
    handleSelectZone,
    closeZoneSheet,
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
    loadingManagerMapPlaces,
    managerMapPlacesError,
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
    openExistingLieu,
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

  // Anciennes zones : masquées par défaut (focus sur ma zone en cours). Le toggle
  // n'apparaît que s'il existe au moins une zone autre que l'active.
  const [showOldZones, setShowOldZones] = useState(false);
  const hasOldZones = useMemo(
    () => (zones ?? []).some((z) => z.id !== myZone?.id),
    [zones, myZone],
  );

  // La BuildingSheet est une Card interne à l'écran : sa visibilité dépend
  // uniquement de `selectedExistingLieu`. En allant sur /lieu/[id], la carte est
  // recouverte par l'écran empilé (Stack) puis réapparaît telle quelle au retour,
  // sélection conservée. Cet effet ne sert donc plus qu'à réarmer le garde
  // anti-double-navigation (`navigatingRef`) quand l'écran redevient focalisé.
  const isFocused = useIsFocused();
  const lastTeamErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (isFocused) navigatingRef.current = false;
  }, [isFocused, navigatingRef]);

  useEffect(() => {
    if (!showTeam || !managerMapPlacesError) {
      lastTeamErrorRef.current = null;
      return;
    }
    if (lastTeamErrorRef.current === managerMapPlacesError) return;
    lastTeamErrorRef.current = managerMapPlacesError;
    Alert.alert(
      "Équipe indisponible",
      "Impossible de charger les lieux de l'équipe pour le moment.",
    );
  }, [managerMapPlacesError, showTeam]);

  const handleSelectLieu = useCallback(
    (immeuble: Immeuble) => {
      openExistingLieu(immeuble);
    },
    [openExistingLieu],
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

  if (initialLocating) {
    return (
      <View style={styles.container}>
        <MapLocatingOverlay visible />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CarteTerrainMap
        cameraRef={cameraRef}
        mapCenter={mapCenter}
        satellite={satellite}
        onPress={handleMapPress}
      >
        <ZoneContour
          zones={zones ?? []}
          mode={mode}
          onSelectZone={handleSelectZone}
          activeZoneId={myZone?.id}
          showOldZones={showOldZones}
        />
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
          loadingTeam={loadingManagerMapPlaces}
          hasZone={!!myZone}
          showOldZonesToggle={hasOldZones}
          showOldZones={showOldZones}
          onToggleSatellite={handleToggleSatellite}
          onToggleTeam={toggleShowTeam}
          onToggleOldZones={() => setShowOldZones((v) => !v)}
          onRecenter={centerOnCurrentLocation}
          onFocusMyZone={focusMyZone}
          onOpenZonesHistory={openZonesHistory}
        />
      )}

      {mode === "VISUALISATION" && !selectedExistingLieu && <MapLegend insets={insets} role={role} />}

      {myZone && mode === "VISUALISATION" && !selectedExistingLieu && (
        <MyZoneChip
          insets={insets}
          zoneName={myZone.nom}
          onPress={focusMyZone}
        />
      )}

      <ModeSwitch
        insets={insets}
        mode={mode}
        onSelectMode={handleSelectMode}
        embedded={embedded}
      />

      <BuildingSheet
        open={!!selectedExistingLieu}
        immeuble={selectedExistingLieu}
        highlightedPorteId={highlightedPorteId}
        updatingLieu={updatingLieu}
        currentUserName={currentUserName}
        loadingDetail={selectedLieuLoading}
        detailError={selectedLieuError}
        onRetryDetail={retrySelectedLieuDetail}
        onClose={handleCloseBuildingSheet}
        onProspect={handleProspect}
        onEdit={openEditLieu}
        onMove={handleMoveFromSheet}
        onDelete={handleDeleteLieu}
      />

      <ZoneSheet
        open={!!selectedZone}
        zone={selectedZone}
        onClose={closeZoneSheet}
        onViewDetail={(id) => openZoneDetail(id)}
      />

      <ZonesHistoryModal
        open={zonesHistoryOpen}
        onClose={closeZonesHistory}
        userId={userId}
        userType={userType}
        onFocusZone={focusOnZone}
        onViewDetail={openZoneDetail}
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
