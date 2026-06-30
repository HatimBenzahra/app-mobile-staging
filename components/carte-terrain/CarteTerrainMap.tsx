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
  children?: ReactNode;
};

export function CarteTerrainMap({
  cameraRef,
  mapCenter,
  satellite,
  onPress,
  children,
}: CarteTerrainMapProps) {
  return (
    <MapLibreMap
      style={StyleSheet.absoluteFill}
      mapStyle={MAP_STYLE_URL}
      onPress={onPress}
      logo={false}
      compass
      scaleBar
      attribution
      preferredFramesPerSecond={30}
      androidView="surface"
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
      <UserLocation animated accuracy heading />
      {children}
    </MapLibreMap>
  );
}
