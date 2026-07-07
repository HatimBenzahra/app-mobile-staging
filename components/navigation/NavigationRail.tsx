import { authService } from "@/services/auth";
import { Feather } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProwinLogo from "./ProwinLogo";

const COLOR_INACTIVE = "#64748B";
const COLOR_ACTIVE = "#005BFF";
const ICON_ACTIVE = "#FFFFFF";
const PILL_TOP_OFFSET = 8; // padding haut du navItem : place l'indicateur sur la pastille icône

type TabPosition = Animated.AnimatedInterpolation<number>;

type NavItemProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  index: number;
  isActive: boolean;
  /** Position animée du pager ; si absente, rendu statique via isActive. */
  position: TabPosition | null;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

const NavItem = memo(function NavItem({
  icon,
  label,
  index,
  isActive,
  position,
  onPress,
  onLayout,
}: NavItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
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

  return (
    <Animated.View
      style={{ transform: [{ scale: scaleAnim }] }}
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

        {animated ? (
          <View style={styles.labelWrap}>
            <Text style={[styles.navLabel, styles.labelBase]} numberOfLines={1}>
              {label}
            </Text>
            {/* Copie active (bleu/gras) fondue par-dessus selon la proximité. */}
            <Animated.Text
              style={[
                styles.navLabel,
                styles.navLabelActive,
                styles.labelOverlay,
                { opacity: proximity! },
              ]}
              numberOfLines={1}
              pointerEvents="none"
            >
              {label}
            </Animated.Text>
          </View>
        ) : (
          <Text
            style={[styles.navLabel, isActive && styles.navLabelActive]}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
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
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      <View style={styles.logoSection}>
        <ProwinLogo size={56} interactive />
      </View>

      <View style={styles.navSection}>
        {indicatorTranslateY ? (
          <Animated.View
            style={[
              styles.indicatorWrap,
              { transform: [{ translateY: indicatorTranslateY }] },
            ]}
            pointerEvents="none"
          >
            <View style={styles.indicatorPill} />
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
            onPress={() => onNavigate(i)}
            onLayout={(e) => handleItemLayout(i, e.nativeEvent.layout.y)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  navSection: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  indicatorWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  indicatorPill: {
    width: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLOR_ACTIVE,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    paddingVertical: 8,
    borderRadius: 14,
  },
  navIconPill: {
    width: 48,
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
  labelWrap: {
    marginTop: 4,
    alignSelf: "stretch",
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLOR_INACTIVE,
    marginTop: 4,
    textAlign: "center",
  },
  labelBase: {
    marginTop: 0,
  },
  labelOverlay: {
    ...StyleSheet.absoluteFillObject,
    marginTop: 0,
  },
  navLabelActive: {
    color: COLOR_ACTIVE,
    fontWeight: "700",
  },
});
