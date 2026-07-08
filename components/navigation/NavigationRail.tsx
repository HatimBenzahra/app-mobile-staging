import { authService } from "@/services/auth";
import { Feather } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Reanimated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sidebar } from "@/constants/theme";
import ProwinLogo from "./ProwinLogo";

const COLOR_INACTIVE = sidebar.textMuted;
const COLOR_ACTIVE = sidebar.active;
const ICON_ACTIVE = sidebar.activeText;
const PILL_TOP_OFFSET = 8; // padding haut du navItem : place l'indicateur sur la pastille icône

// Collapse : le rail se plie (icônes seules) / se déplie (icône + label à côté).
const COLLAPSED_WIDTH = 72;
const EXPANDED_WIDTH = 220;
const INDICATOR_LEFT = 12; // aligne indicateur ET pastille icône dans les deux modes
const ICON_PILL_WIDTH = 48;
const LABEL_GAP = 12;
const LABEL_TEXT_WIDTH = 132;
const LABEL_SLOT_WIDTH = LABEL_GAP + LABEL_TEXT_WIDTH; // largeur révélée quand déplié
const INDICATOR_EXPANDED_WIDTH = EXPANDED_WIDTH - INDICATOR_LEFT - 12;

type TabPosition = Animated.AnimatedInterpolation<number>;

type NavItemProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  index: number;
  isActive: boolean;
  /** Position animée du pager ; si absente, rendu statique via isActive. */
  position: TabPosition | null;
  /** Progression du collapse (0 = étroit, 1 = large), pour révéler le label. */
  progress: SharedValue<number>;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

const NavItem = memo(function NavItem({
  icon,
  label,
  index,
  isActive,
  position,
  progress,
  onPress,
  onLayout,
}: NavItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // Proximité de cet onglet à la position du pager : 1 au centre, 0 à ±1 onglet.
  // NB : la position du pager est pilotée en native driver → on ne peut animer
  // QUE des props natives (opacity, transform), jamais `color`. On fait donc des
  // fondus d'opacité (icône + label) plutôt qu'une interpolation de couleur.
  const proximity = useMemo(
    () =>
      position?.interpolate({
        inputRange: [index - 1, index, index + 1],
        outputRange: [0, 1, 0],
        extrapolate: "clamp",
      }) ?? null,
    [position, index],
  );

  const animated = position != null && proximity != null;

  // Label révélé par le collapse : largeur + opacité pilotées par `progress`.
  const labelClipStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [0, LABEL_SLOT_WIDTH]),
    opacity: progress.value,
  }));

  return (
    <Animated.View
      style={[styles.navItemOuter, { transform: [{ scale: scaleAnim }] }]}
      onLayout={onLayout}
    >
      <Pressable
        style={styles.navItem}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={[
            styles.navIconPill,
            !animated && isActive && styles.navIconPillActive,
          ]}
        >
          {/* Icône neutre (base). En mode animé, une copie blanche se fond
              par-dessus quand l'indicateur arrive (opacité = proximité). */}
          <Feather
            name={icon}
            size={20}
            color={animated ? COLOR_INACTIVE : isActive ? ICON_ACTIVE : COLOR_INACTIVE}
          />
          {animated ? (
            <Animated.View
              style={[styles.iconOverlay, { opacity: proximity! }]}
              pointerEvents="none"
            >
              <Feather name={icon} size={20} color={ICON_ACTIVE} />
            </Animated.View>
          ) : null}
        </View>

        {/* Label à droite de l'icône, clippé (largeur 0) quand le rail est étroit. */}
        <Reanimated.View
          style={[styles.labelClip, labelClipStyle]}
          pointerEvents="none"
        >
          <View style={styles.labelInner}>
            {animated ? (
              <>
                <Text style={styles.navLabel} numberOfLines={1}>
                  {label}
                </Text>
                {/* Copie active (blanche) fondue par-dessus selon la proximité :
                    le label est au-dessus de l'indicateur orange en mode large. */}
                <Animated.Text
                  style={[
                    styles.navLabel,
                    styles.navLabelActive,
                    styles.labelOverlay,
                    { opacity: proximity! },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Animated.Text>
              </>
            ) : (
              <Text
                style={[styles.navLabel, isActive && styles.navLabelActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            )}
          </View>
        </Reanimated.View>
      </Pressable>
    </Animated.View>
  );
});

type NavigationRailProps = {
  currentIndex: number;
  onNavigate: (index: number) => void;
  /** Position animée continue du pager, pour un indicateur qui suit le swipe. */
  position?: TabPosition | null;
};

export default function NavigationRail({
  currentIndex,
  onNavigate,
  position,
}: NavigationRailProps) {
  const insets = useSafeAreaInsets();
  const [isManager, setIsManager] = useState(false);
  const [itemYs, setItemYs] = useState<number[]>([]);
  const [expanded, setExpanded] = useState(false); // défaut : étroit (icônes)

  // Progression partagée du collapse (thread UI). 0 = étroit, 1 = large.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, { duration: 220 });
  }, [expanded, progress]);

  const railStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [COLLAPSED_WIDTH, EXPANDED_WIDTH]),
  }));
  const indicatorWidthStyle = useAnimatedStyle(() => ({
    width: interpolate(
      progress.value,
      [0, 1],
      [ICON_PILL_WIDTH, INDICATOR_EXPANDED_WIDTH],
    ),
  }));

  useEffect(() => {
    const loadRole = async () => {
      const role = await authService.getUserRole();
      setIsManager(role === "manager");
    };
    void loadRole();
  }, []);

  const navItems = useMemo(
    () => [
      { key: "dashboard", icon: "bar-chart-2" as const, label: "Tableau" },
      { key: "carte", icon: "map" as const, label: "Carte" },
      { key: "immeubles", icon: "map-pin" as const, label: "Lieux" },
      { key: "agenda", icon: "book-open" as const, label: "Agenda" },
      { key: "stats", icon: "trending-up" as const, label: "Stats" },
      { key: "classement", icon: "award" as const, label: "Classement" },
      ...(isManager
        ? [{ key: "equipe", icon: "users" as const, label: "Équipe" }]
        : []),
      { key: "zones", icon: "grid" as const, label: "Zones" },
      { key: "historique", icon: "clock" as const, label: "Historique" },
    ],
    [isManager],
  );

  // La liste change avec le rôle : on remesure depuis zéro.
  useEffect(() => {
    setItemYs([]);
  }, [navItems.length]);

  const handleItemLayout = useCallback((index: number, y: number) => {
    setItemYs((prev) => {
      if (prev[index] === y) return prev;
      const next = [...prev];
      next[index] = y;
      return next;
    });
  }, []);

  const itemsReady =
    itemYs.length === navItems.length && itemYs.every((y) => y != null);
  const animated = position != null && itemsReady;

  // L'indicateur glisse verticalement en suivant la position du pager.
  const indicatorTranslateY = useMemo(() => {
    if (!animated || !position) return null;
    return position.interpolate({
      inputRange: navItems.map((_, i) => i),
      outputRange: navItems.map((_, i) => (itemYs[i] ?? 0) + PILL_TOP_OFFSET),
      extrapolate: "clamp",
    });
  }, [animated, position, itemYs, navItems]);

  return (
    <Reanimated.View
      style={[
        styles.container,
        railStyle,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      <View style={styles.logoSection}>
        <ProwinLogo size={56} interactive />
      </View>

      <ScrollView
        style={styles.navSection}
        contentContainerStyle={styles.navSectionContent}
        showsVerticalScrollIndicator={false}
      >
        {indicatorTranslateY ? (
          <Animated.View
            style={[
              styles.indicatorWrap,
              { transform: [{ translateY: indicatorTranslateY }] },
            ]}
            pointerEvents="none"
          >
            {/* Largeur animée (Reanimated) imbriquée sous le translateY (RN Animated). */}
            <Reanimated.View style={[styles.indicatorPill, indicatorWidthStyle]} />
          </Animated.View>
        ) : null}

        {navItems.map((item, i) => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            index={i}
            isActive={currentIndex === i}
            position={animated ? position : null}
            progress={progress}
            onPress={() => onNavigate(i)}
            onLayout={(e) => handleItemLayout(i, e.nativeEvent.layout.y)}
          />
        ))}
      </ScrollView>

      {/* Toggle plier / déplier. */}
      <Pressable
        style={styles.toggleBtn}
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Réduire le menu" : "Agrandir le menu"}
      >
        <Feather
          name={expanded ? "chevron-left" : "chevron-right"}
          size={22}
          color={COLOR_INACTIVE}
        />
      </Pressable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: sidebar.bg,
    borderRightWidth: 1,
    borderRightColor: sidebar.border,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden", // clippe les labels pendant la transition de largeur
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  navSection: {
    flex: 1,
    alignSelf: "stretch",
  },
  navSectionContent: {
    alignItems: "stretch",
    gap: 4,
  },
  indicatorWrap: {
    position: "absolute",
    top: 0,
    left: INDICATOR_LEFT,
  },
  indicatorPill: {
    width: ICON_PILL_WIDTH,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLOR_ACTIVE,
  },
  navItemOuter: {
    alignSelf: "stretch",
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: INDICATOR_LEFT,
    paddingVertical: 8,
    borderRadius: 14,
  },
  navIconPill: {
    width: ICON_PILL_WIDTH,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconPillActive: {
    backgroundColor: COLOR_ACTIVE,
  },
  iconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  labelClip: {
    overflow: "hidden",
    justifyContent: "center",
  },
  labelInner: {
    width: LABEL_SLOT_WIDTH,
    paddingLeft: LABEL_GAP,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLOR_INACTIVE,
  },
  labelOverlay: {
    position: "absolute",
    left: LABEL_GAP,
    top: 0,
    bottom: 0,
    textAlignVertical: "center",
  },
  navLabelActive: {
    color: ICON_ACTIVE,
    fontWeight: "700",
  },
  toggleBtn: {
    marginTop: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sidebar.surface,
  },
});
