import { colors } from "@/constants/theme";
import type { DraftPin, TerrainMode } from "@/hooks/carte-terrain/types";
import { Feather } from "@expo/vector-icons";
import { Marker } from "@maplibre/maplibre-react-native";
import { memo, useMemo } from "react";
import { Text, View } from "react-native";
import { styles } from "./styles";

type DraftPinsProps = {
  mode: TerrainMode;
  buildingPin: DraftPin | null;
  quartierPins: DraftPin[];
  activeQuartierPinId: string | null;
  onSelectQuartierPin: (pin: DraftPin) => void;
};

export const DraftPins = memo(function DraftPins({
  mode,
  buildingPin,
  quartierPins,
  activeQuartierPinId,
  onSelectQuartierPin,
}: DraftPinsProps) {
  const quartierMarkers = useMemo(
    () =>
      quartierPins.map((pin, index) => (
        <Marker
          key={pin.id}
          id={`quartier-pin-${pin.id}`}
          lngLat={[pin.longitude, pin.latitude]}
          anchor="bottom"
          onPress={(event) => {
            event.stopPropagation();
            onSelectQuartierPin(pin);
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
      )),
    [quartierPins, activeQuartierPinId, onSelectQuartierPin],
  );

  return (
    <>
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
      {quartierMarkers}
    </>
  );
});
