import { colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { styles } from "./styles";

type MapFabsProps = {
  embedded: boolean;
  insets: EdgeInsets;
  satellite: boolean;
  loadingLocation: boolean;
  showTeamToggle: boolean;
  showTeam: boolean;
  onToggleSatellite: () => void;
  onToggleTeam: () => void;
  onRecenter: () => void;
};

export function MapFabs({
  embedded,
  insets,
  satellite,
  loadingLocation,
  showTeamToggle,
  showTeam,
  onToggleSatellite,
  onToggleTeam,
  onRecenter,
}: MapFabsProps) {
  return (
    <>
      {!embedded && (
        <Pressable
          style={[styles.backFab, { top: insets.top + 10 }]}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
      )}

      {showTeamToggle && (
        <Pressable
          style={[styles.recenterFab, { bottom: insets.bottom + 144 }, showTeam && styles.recenterFabActive]}
          onPress={onToggleTeam}
          accessibilityRole="button"
          accessibilityLabel="Afficher l'équipe"
        >
          <Feather name="users" size={22} color={showTeam ? colors.textOnPrimary : colors.primary} />
        </Pressable>
      )}

      <Pressable
        style={[styles.recenterFab, { bottom: insets.bottom + 84 }, satellite && styles.recenterFabActive]}
        onPress={onToggleSatellite}
      >
        <Feather name="layers" size={22} color={satellite ? colors.textOnPrimary : colors.primary} />
      </Pressable>

      <Pressable
        style={[styles.recenterFab, { bottom: insets.bottom + 24 }]}
        onPress={onRecenter}
      >
        {loadingLocation ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name="crosshair" size={22} color={colors.primary} />
        )}
      </Pressable>
    </>
  );
}
