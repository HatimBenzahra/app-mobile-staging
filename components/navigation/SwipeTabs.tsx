import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, StyleSheet, useWindowDimensions, View } from "react-native";
import { TabView } from "react-native-tab-view";
import { colors } from "@/constants/theme";
import AgendaScreen from "@/app/(app)/(tabs)/agenda";
import CarteTerrainScreen from "@/app/(app)/carte-terrain";
import ClassementScreen from "@/app/(app)/(tabs)/classement";
import DashboardScreen from "@/app/(app)/(tabs)/dashboard";
import ImmeublesScreen from "@/app/(app)/(tabs)/immeubles";
import StatistiquesScreen from "@/app/(app)/(tabs)/statistiques";
import EquipeScreen from "@/app/(app)/(tabs)/equipe";
import ZonesScreen from "@/app/(app)/(tabs)/zones";
import HistoriqueScreen from "@/app/(app)/(tabs)/historique";
import { authService } from "@/services/auth";
import { useRouter } from "expo-router";

export type TabRoute = { key: string; title: string; icon: string };

export const buildRoutes = (isManager: boolean): TabRoute[] => {
  const baseRoutes: TabRoute[] = [
    { key: "dashboard", title: "Tableau", icon: "bar-chart-2" },
    { key: "carte", title: "Carte", icon: "map" },
    { key: "immeubles", title: "Lieux", icon: "map-pin" },
    { key: "agenda", title: "Agenda", icon: "book-open" },
    { key: "statistiques", title: "Stats", icon: "trending-up" },
    { key: "classement", title: "Classement", icon: "award" },
  ];
  if (isManager) {
    baseRoutes.push({ key: "equipe", title: "Équipe", icon: "users" });
    baseRoutes.push({ key: "zones", title: "Zones", icon: "grid" });
  }
  baseRoutes.push({ key: "historique", title: "Historique", icon: "clock" });
  return baseRoutes;
};

type SwipeTabsProps = {
  index: number;
  onIndexChange: (index: number) => void;
  headerHeight?: number;
  onHeaderVisibilityChange?: (visible: boolean) => void;
  onRailVisibilityChange?: (visible: boolean) => void;
  /** Remonte la position animée continue du pager (index + fraction du swipe). */
  onPositionChange?: (position: Animated.AnimatedInterpolation<number>) => void;
};

export default function SwipeTabs({
  index,
  onIndexChange,
  headerHeight = 0,
  onHeaderVisibilityChange,
  onRailVisibilityChange,
  onPositionChange,
}: SwipeTabsProps) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [isManager, setIsManager] = useState(false);
  const tabRoutes = useMemo(() => buildRoutes(isManager), [isManager]);
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const activeKeyRef = useRef<string | undefined>(tabRoutes[index]?.key);
  activeKeyRef.current = tabRoutes[index]?.key;

  // Le TabView calcule une position animée continue (0 → N-1) qui suit le geste.
  // On la capture depuis renderTabBar (seul endroit qui la reçoit) dans un ref,
  // puis on la remonte au parent via un effet (jamais pendant le rendu).
  const positionRef = useRef<Animated.AnimatedInterpolation<number> | null>(null);
  const positionSentRef = useRef(false);
  const renderTabBar = useCallback(
    (props: { position: Animated.AnimatedInterpolation<number> }) => {
      positionRef.current = props.position;
      return null;
    },
    [],
  );
  useEffect(() => {
    if (positionSentRef.current || !positionRef.current || !onPositionChange) return;
    positionSentRef.current = true;
    onPositionChange(positionRef.current);
  }, [onPositionChange]);

  const handleNavigateToImmeuble = useCallback(
    (immeubleId: number, porteId?: number) => {
      const path = porteId != null
        ? `/lieu/${immeubleId}?porteId=${porteId}`
        : `/lieu/${immeubleId}`;
      router.push(path as Parameters<typeof router.push>[0]);
    },
    [router],
  );

  useEffect(() => {
    const loadRole = async () => {
      const role = await authService.getUserRole();
      setIsManager(role === "manager");
    };
    void loadRole();
  }, []);

  const handleSwipeLockChange = useCallback((locked: boolean) => {
    setSwipeEnabled(!locked);
  }, []);

  const renderScene = useCallback(
    ({ route }: { route: { key: string } }) => {
      // La Carte est plein écran (le header est un overlay géré au-dessus).
      if (route.key === "carte") {
        return <CarteTerrainScreen embedded />;
      }

      // Les autres scènes sont décalées sous le header d'une hauteur CONSTANTE
      // (paddingTop = hauteur du header). Comme ce padding ne dépend pas de
      // l'onglet actif, aucune scène n'est redimensionnée lors d'un changement
      // d'onglet : le header se contente de fondre par-dessus.
      let scene: ReactNode;
      if (route.key === "immeubles") {
        scene = (
          <ImmeublesScreen
            isActive={route.key === activeKeyRef.current}
            onSwipeLockChange={handleSwipeLockChange}
            onHamburgerVisibilityChange={onRailVisibilityChange}
            onHeaderVisibilityChange={onHeaderVisibilityChange}
          />
        );
      } else if (route.key === "historique") {
        scene = <HistoriqueScreen onNavigateToImmeuble={handleNavigateToImmeuble} />;
      } else if (route.key === "classement") {
        scene = <ClassementScreen />;
      } else if (route.key === "equipe") {
        scene = <EquipeScreen />;
      } else if (route.key === "zones") {
        scene = <ZonesScreen />;
      } else if (route.key === "agenda") {
        scene = <AgendaScreen onNavigateToImmeuble={handleNavigateToImmeuble} />;
      } else if (route.key === "statistiques") {
        scene = <StatistiquesScreen onNavigateToImmeuble={handleNavigateToImmeuble} />;
      } else {
        scene = <DashboardScreen />;
      }

      return <View style={{ flex: 1, paddingTop: headerHeight }}>{scene}</View>;
    },
    // activeKeyRef is read at call time (always current), so `index` and
    // `tabRoutes` don't need to be dependencies here.
    [handleNavigateToImmeuble, handleSwipeLockChange, headerHeight, onHeaderVisibilityChange, onRailVisibilityChange],
  );

  // Écran d'attente thémé pour une scène pas encore montée (au lieu du blanc par
  // défaut). Visible pendant le swipe vers un onglet voisin non encore chargé.
  const renderLazyPlaceholder = useCallback(
    () => (
      <View style={[styles.placeholder, { paddingTop: headerHeight }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ),
    [headerHeight],
  );

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes: tabRoutes }}
        renderScene={renderScene}
        onIndexChange={onIndexChange}
        renderTabBar={renderTabBar}
        // Sans initialLayout, layout.width = 0 au départ : les scènes non-focus
        // (celles vers lesquelles on swipe) ne se montent pas et restent bloquées
        // sur le placeholder jusqu'à un tap. On fournit donc une largeur initiale.
        initialLayout={{ width: windowWidth }}
        swipeEnabled={swipeEnabled && tabRoutes[index]?.key !== "carte"}
        lazy
        lazyPreloadDistance={1}
        renderLazyPlaceholder={renderLazyPlaceholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
