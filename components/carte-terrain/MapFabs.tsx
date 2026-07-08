import { colors } from "@/constants/theme";
import { Icon } from "@/components/ui";
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
  hasZone: boolean;
  onToggleSatellite: () => void;
  onToggleTeam: () => void;
  onRecenter: () => void;
  onFocusMyZone: () => void;
  onOpenZonesHistory: () => void;
};

export function MapFabs({
  embedded,
  insets,
  satellite,
  loadingLocation,
  showTeamToggle,
  showTeam,
  hasZone,
  onToggleSatellite,
  onToggleTeam,
  onRecenter,
  onFocusMyZone,
  onOpenZonesHistory,
}: MapFabsProps) {
  // Pile des FAB, du bas vers le haut. On ne garde que ceux visibles puis on
  // calcule leur position séquentiellement (`bottom`) → aucun trou quand un
  // bouton conditionnel (ex. « Équipe », réservé manager) est absent.
  const FAB_BASE = insets.bottom + 24;
  const FAB_STEP = 60;

  // Chaque entrée reçoit sa position `bottom` calculée et rend son Pressable.
  const fabs: ((bottom: number) => React.ReactElement)[] = [
    // Recentrer GPS (toujours, tout en bas).
    (bottom) => (
      <Pressable
        key="recenter"
        style={[styles.recenterFab, { bottom }]}
        onPress={onRecenter}
        accessibilityRole="button"
        accessibilityLabel="Recentrer sur ma position"
      >
        {loadingLocation ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Icon name="crosshair" size={22} color={colors.primary} />
        )}
      </Pressable>
    ),
    // Satellite.
    (bottom) => (
      <Pressable
        key="satellite"
        style={[styles.recenterFab, { bottom }, satellite && styles.recenterFabActive]}
        onPress={onToggleSatellite}
        accessibilityRole="button"
        accessibilityLabel="Vue satellite"
      >
        <Icon name="layers" size={22} color={satellite ? colors.textOnPrimary : colors.primary} />
      </Pressable>
    ),
    // Équipe (manager uniquement).
    ...(showTeamToggle
      ? [
          (bottom: number) => (
            <Pressable
              key="team"
              style={[styles.recenterFab, { bottom }, showTeam && styles.recenterFabActive]}
              onPress={onToggleTeam}
              accessibilityRole="button"
              accessibilityLabel="Afficher l'équipe"
            >
              <Icon name="users" size={22} color={showTeam ? colors.textOnPrimary : colors.primary} />
            </Pressable>
          ),
        ]
      : []),
    // Recentrer sur ma zone (si l'utilisateur a une zone).
    ...(hasZone
      ? [
          (bottom: number) => (
            <Pressable
              key="my-zone"
              style={[styles.recenterFab, { bottom }]}
              onPress={onFocusMyZone}
              accessibilityRole="button"
              accessibilityLabel="Recentrer sur ma zone"
            >
              <Icon name="map" size={22} color={colors.primary} />
            </Pressable>
          ),
        ]
      : []),
    // « Mes zones » (en cours + historique), commercial ET manager.
    (bottom) => (
      <Pressable
        key="zones-history"
        style={[styles.recenterFab, { bottom }]}
        onPress={onOpenZonesHistory}
        accessibilityRole="button"
        accessibilityLabel="Mes zones"
      >
        <Icon name="clock" size={22} color={colors.primary} />
      </Pressable>
    ),
  ];

  return (
    <>
      {!embedded && (
        <Pressable
          style={[styles.backFab, { top: insets.top + 10 }]}
          onPress={() => router.back()}
        >
          <Icon name="chevron-left" size={22} color={colors.text} />
        </Pressable>
      )}

      {fabs.map((render, index) => render(FAB_BASE + index * FAB_STEP))}
    </>
  );
}
