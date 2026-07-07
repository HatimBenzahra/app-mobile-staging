import { ESRI_SATELLITE_TILE_URL, MAP_STYLE_URL } from "@/hooks/carte-terrain/constants";
import type { TerrainPoint } from "@/hooks/carte-terrain/types";
import {
  Camera,
  Layer,
  Map as MapLibreMap,
  RasterSource,
  UserLocation,
  type CameraRef,
  type PressEvent,
} from "@maplibre/maplibre-react-native";
import type { ReactNode, RefObject } from "react";
import type { NativeSyntheticEvent } from "react-native";
import { StyleSheet } from "react-native";

type CarteTerrainMapProps = {
  cameraRef: RefObject<CameraRef | null>;
  mapCenter: TerrainPoint;
  satellite: boolean;
  onPress: (event: NativeSyntheticEvent<PressEvent>) => void;
  /** Affiche le marqueur de position utilisateur (défaut : true). */
  showUserLocation?: boolean;
  /** Active les gestes zoom/scroll/rotation/pitch (défaut : true). */
  interactive?: boolean;
  /** Notifié une fois la carte chargée (ex : cadrage `fitBounds` initial). */
  onDidFinishLoadingMap?: () => void;
  children?: ReactNode;
};

export function CarteTerrainMap({
  cameraRef,
  mapCenter,
  satellite,
  onPress,
  showUserLocation = true,
  interactive = true,
  onDidFinishLoadingMap,
  children,
}: CarteTerrainMapProps) {
  return (
    <MapLibreMap
      style={StyleSheet.absoluteFill}
      mapStyle={MAP_STYLE_URL}
      onPress={onPress}
      onDidFinishLoadingMap={onDidFinishLoadingMap}
      logo={false}
      compass
      scaleBar
      attribution
      preferredFramesPerSecond={30}
      androidView="surface"
      dragPan={interactive}
      touchZoom={interactive}
      doubleTapZoom={interactive}
      doubleTapHoldZoom={interactive}
      touchRotate={interactive}
      touchPitch={interactive}
    >
      {satellite && (
        <RasterSource
          id="esri-satellite"
          tiles={[ESRI_SATELLITE_TILE_URL]}
          tileSize={256}
          maxzoom={19}
        >
          <Layer id="esri-satellite-layer" type="raster" source="esri-satellite" />
        </RasterSource>
      )}
      <Camera
        ref={cameraRef}
        initialViewState={{
          center: [mapCenter.longitude, mapCenter.latitude],
          zoom: 15,
        }}
        minZoom={5}
        maxZoom={20}
      />
      {showUserLocation && <UserLocation animated accuracy heading />}
      {children}
    </MapLibreMap>
  );
}
