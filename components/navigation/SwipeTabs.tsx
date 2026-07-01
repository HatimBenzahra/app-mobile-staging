import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { TabView } from "react-native-tab-view";
import AgendaScreen from "@/app/(app)/(tabs)/agenda";
import CarteTerrainScreen from "@/app/(app)/carte-terrain";
import DashboardScreen from "@/app/(app)/(tabs)/dashboard";
import ImmeublesScreen from "@/app/(app)/(tabs)/immeubles";
import StatistiquesScreen from "@/app/(app)/(tabs)/statistiques";
import EquipeScreen from "@/app/(app)/(tabs)/equipe";
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
  ];
  if (isManager) {
    baseRoutes.push({ key: "equipe", title: "Équipe", icon: "users" });
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
};

export default function SwipeTabs({
  index,
  onIndexChange,
  headerHeight = 0,
  onHeaderVisibilityChange,
  onRailVisibilityChange,
}: SwipeTabsProps) {
  const router = useRouter();
  const [isManager, setIsManager] = useState(false);
  const tabRoutes = useMemo(() => buildRoutes(isManager), [isManager]);
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const activeKeyRef = useRef<string | undefined>(tabRoutes[index]?.key);
  activeKeyRef.current = tabRoutes[index]?.key;

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
        scene = <HistoriqueScreen />;
      } else if (route.key === "equipe") {
        scene = <EquipeScreen />;
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

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes: tabRoutes }}
        renderScene={renderScene}
        onIndexChange={onIndexChange}
        renderTabBar={() => null}
        swipeEnabled={swipeEnabled && tabRoutes[index]?.key !== "carte"}
        lazy
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
