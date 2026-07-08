import { colors } from "@/constants/theme";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Text, View } from "react-native";
import { styles } from "./styles";

type MapLocatingOverlayProps = {
  /** Acquisition GPS initiale en cours (voir `useCarteTerrain.initialLocating`). */
  visible: boolean;
};

/**
 * Overlay léger affiché pendant l'acquisition GPS INITIALE de la carte : signale
 * au commercial que la carte se centre sur sa position. Purement informatif
 * (`pointerEvents="none"`) — il n'intercepte pas les gestes carte. Fondu à
 * l'apparition/disparition ; démonté une fois invisible.
 */
export function MapLocatingOverlay({ visible }: MapLocatingOverlayProps) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, opacity]);

  if (!mounted) return null;

  return (
    <Animated.View style={[styles.locatingOverlay, { opacity }]} pointerEvents="none">
      <View style={styles.locatingCard}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.locatingText}>Localisation en cours…</Text>
      </View>
    </Animated.View>
  );
}
