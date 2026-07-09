import { colors } from "@/constants/theme";
import { Icon } from "@/components/ui";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { styles } from "./styles";

type MapFabsProps = {
  embedded: boolean;
  insets: EdgeInsets;
  satellite: boolean;
  loadingLocation: boolean;
  showTeamToggle: boolean;
  showTeam: boolean;
  loadingTeam?: boolean;
  hasZone: boolean;
  /** Afficher le toggle « anciennes zones » (uniquement s'il en existe). */
  showOldZonesToggle: boolean;
  showOldZones: boolean;
  onToggleSatellite: () => void;
  onToggleTeam: () => void;
  onToggleOldZones: () => void;
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
  loadingTeam = false,
  hasZone,
  showOldZonesToggle,
  showOldZones,
  onToggleSatellite,
  onToggleTeam,
  onToggleOldZones,
  onRecenter,
  onFocusMyZone,
  onOpenZonesHistory,
}: MapFabsProps) {
  // Deux blocs distincts, alignés sur le même axe droit (`right:16`) :
  //  - ACTIONS (bas) : FAB ronds individuels, empilés depuis `FAB_BASE`.
  //  - VUE (haut)    : toggles d'affichage groupés dans un conteneur unique,
  //                    posé au-dessus du bloc actions avec un `GROUP_GAP` visible.
  const FAB_BASE = insets.bottom + 24;
  const FAB_STEP = 60;
  const FAB_SIZE = 52;
  const GROUP_GAP = 14;

  // --- Bloc ACTIONS (bas → haut). On ne garde que ceux visibles. ---
  const actions: ((bottom: number) => React.ReactElement)[] = [
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
              <Icon name="target" size={22} color={colors.primary} />
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
        accessibilityLabel="Mes zones (historique)"
      >
        <Icon name="clock" size={22} color={colors.primary} />
      </Pressable>
    ),
  ];

  // --- Bloc VUE (toggles d'affichage), rendus dans un conteneur commun. ---
  const viewToggles: React.ReactElement[] = [
    <Pressable
      key="satellite"
      style={[styles.viewToggleCell, satellite && styles.viewToggleCellActive]}
      onPress={onToggleSatellite}
      accessibilityRole="button"
      accessibilityState={{ selected: satellite }}
      accessibilityLabel="Vue satellite"
    >
      <Icon
        name="satellite"
        size={22}
        color={satellite ? colors.textOnPrimary : colors.primary}
      />
    </Pressable>,
    ...(showOldZonesToggle
      ? [
          <Pressable
            key="old-zones"
            style={[styles.viewToggleCell, showOldZones && styles.viewToggleCellActive]}
            onPress={onToggleOldZones}
            accessibilityRole="button"
            accessibilityState={{ selected: showOldZones }}
            accessibilityLabel="Afficher les anciennes zones"
          >
            <Icon
              name={showOldZones ? "eye" : "eye-off"}
              size={22}
              color={showOldZones ? colors.textOnPrimary : colors.primary}
            />
          </Pressable>,
        ]
      : []),
    ...(showTeamToggle
      ? [
          <Pressable
            key="team"
            style={[styles.viewToggleCell, showTeam && styles.viewToggleCellActive]}
            onPress={onToggleTeam}
            accessibilityRole="button"
            accessibilityState={{ selected: showTeam }}
            accessibilityLabel="Afficher l'équipe"
          >
            {loadingTeam ? (
              <ActivityIndicator
                size="small"
                color={showTeam ? colors.textOnPrimary : colors.primary}
              />
            ) : (
              <Icon
                name="users"
                size={22}
                color={showTeam ? colors.textOnPrimary : colors.primary}
              />
            )}
          </Pressable>,
        ]
      : []),
  ];

  // Le groupe VUE se pose juste au-dessus du sommet du bloc actions.
  const viewGroupBottom =
    FAB_BASE + (actions.length - 1) * FAB_STEP + FAB_SIZE + GROUP_GAP;

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

      {actions.map((render, index) => render(FAB_BASE + index * FAB_STEP))}

      <View style={[styles.viewToggleGroup, { bottom: viewGroupBottom }]}>
        {viewToggles.flatMap((cell, i) =>
          i === 0
            ? [cell]
            : [
                <View key={`divider-${i}`} style={styles.viewToggleDivider} />,
                cell,
              ],
        )}
      </View>
    </>
  );
}
