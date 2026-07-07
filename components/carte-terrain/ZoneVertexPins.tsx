import type { DraftPin } from "@/hooks/carte-terrain/types";
import { Marker } from "@maplibre/maplibre-react-native";
import { memo, useMemo } from "react";
import { Text, View } from "react-native";
import { styles } from "./styles";

type ZoneVertexPinsProps = {
  zonePins: DraftPin[];
  activeZonePinId: string | null;
  onSelect: (pin: DraftPin) => void;
};

/**
 * Sommets numérotés de la zone en cours de tracé (accent info, cf. ZoneDraft).
 * Extrait de `DraftPins` pour être monté par la page dédiée `/zone/create`.
 */
export const ZoneVertexPins = memo(function ZoneVertexPins({
  zonePins,
  activeZonePinId,
  onSelect,
}: ZoneVertexPinsProps) {
  const markers = useMemo(
    () =>
      zonePins.map((pin, index) => (
        <Marker
          key={`zone-${pin.id}`}
          id={`zone-pin-${pin.id}`}
          lngLat={[pin.longitude, pin.latitude]}
          anchor="bottom"
          onPress={(event) => {
            event.stopPropagation();
            onSelect(pin);
          }}
        >
          <View
            style={[
              styles.quartierMapMarker,
              styles.zoneMapMarker,
              pin.id === activeZonePinId && styles.quartierMapMarkerActive,
            ]}
          >
            <Text style={styles.quartierMapMarkerText}>{index + 1}</Text>
          </View>
        </Marker>
      )),
    [zonePins, activeZonePinId, onSelect],
  );

  return <>{markers}</>;
});
