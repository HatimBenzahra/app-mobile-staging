import AnimatedHeader from "@/components/navigation/AnimatedHeader";
import NavigationRail from "@/components/navigation/NavigationRail";
import SwipeTabs, { buildRoutes } from "@/components/navigation/SwipeTabs";
import ProfileSheet from "@/components/ProfileSheet";
import {
  ProfileSheetProvider,
  useProfileSheet,
} from "@/hooks/use-profile-sheet";
import { MapFocusProvider, useMapFocus } from "@/hooks/use-map-focus";
import {
  TerrainModeRequestProvider,
  useTerrainModeRequest,
} from "@/hooks/use-terrain-mode-request";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { sendOperator } from "@/modules/kiosk-bridge";
import { authService } from "@/services/auth";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function AppContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [tabPosition, setTabPosition] =
    useState<Animated.AnimatedInterpolation<number> | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [showHeader, setShowHeader] = useState(true);
  const [showRail, setShowRail] = useState(true);
  const { sheetRef } = useProfileSheet();
  const { focusTarget } = useMapFocus();
  const { requestedMode } = useTerrainModeRequest();
  const didSetInitialTab = useRef(false);
  const currentIndexRef = useRef(0);
  const fromIndexRef = useRef(0);
  const settlingRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentIndexRef.current = index;
  }, [index]);

  useEffect(
    () => () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    },
    [],
  );

  // Navigation volontaire (rail, focus carte). react-native-pager-view peut
  // émettre un onPageSelected parasite avec l'ANCIEN index juste après (montage
  // de la scène / bascule scrollEnabled en quittant la Carte) → l'onglet de
  // départ « flashe ». On arme une garde qui n'ignore QUE ce cas précis, et qui
  // s'AUTO-EXPIRE : contrairement à l'ancienne version, elle ne peut pas rester
  // bloquée et faire échouer les swipes (qui restaient en chargement infini).
  const goToTab = useCallback((next: number) => {
    const prev = currentIndexRef.current;
    if (prev === next) return;
    fromIndexRef.current = prev;
    settlingRef.current = true;
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      settlingRef.current = false;
    }, 400);
    setIndex(next);
  }, []);

  const handleIndexChange = useCallback((next: number) => {
    // Parasite : retour à l'index de départ pendant la stabilisation → ignoré.
    // Tout le reste (swipe utilisateur inclus) met à jour l'index normalement,
    // exactement comme un tap depuis la sidebar → la scène se charge.
    if (settlingRef.current && next === fromIndexRef.current) return;
    settlingRef.current = false;
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    setIndex(next);
  }, []);

  const isManager = role === "manager";
  const isCommercial = role != null && !isManager;
  const routes = useMemo(() => buildRoutes(isManager), [isManager]);
  const activeKey = routes[index]?.key;
  const isCarte = activeKey === "carte";

  // Header rendu en OVERLAY absolu (voir le rendu plus bas) : sa présence ne
  // participe plus au flux, donc entrer/sortir de la Carte ne redimensionne plus
  // les scènes (fini le reflow de la map). On l'anime en opacité (fondu) au lieu
  // de le monter/démonter, et les scènes non-carte reçoivent un paddingTop égal
  // à sa hauteur (mesurée) pour rester exactement à la même place qu'avant.
  const headerShown = showHeader && !isCarte;
  const [headerHeight, setHeaderHeight] = useState(insets.top + 64);
  const headerAnim = useRef(new Animated.Value(headerShown ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: headerShown ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [headerShown, headerAnim]);

  // Le commercial atterrit directement sur la carte plein écran.
  useEffect(() => {
    if (didSetInitialTab.current || role == null) return;
    didSetInitialTab.current = true;
    if (isCommercial) {
      const carteIdx = routes.findIndex((r) => r.key === "carte");
      if (carteIdx >= 0) goToTab(carteIdx);
    }
  }, [role, isCommercial, routes, goToTab]);

  // "Voir sur la carte" : dès qu'une cible de focus est posée (depuis l'onglet
  // Lieux), on bascule sur l'onglet Carte. On NE vide PAS focusTarget ici : la
  // carte le consomme (centrage + highlight) puis le réinitialise elle-même.
  useEffect(() => {
    if (!focusTarget) return;
    const carteIdx = routes.findIndex((r) => r.key === "carte");
    if (carteIdx >= 0) goToTab(carteIdx);
  }, [focusTarget, routes, goToTab]);

  // Demande de tracé (« Créer une zone » depuis l'onglet Zones) : on bascule sur
  // l'onglet Carte. On NE consomme PAS la demande ici : useCarteTerrain applique
  // le mode puis l'efface (même contrat que focusTarget ci-dessus).
  useEffect(() => {
    if (!requestedMode) return;
    const carteIdx = routes.findIndex((r) => r.key === "carte");
    if (carteIdx >= 0) goToTab(carteIdx);
  }, [requestedMode, routes, goToTab]);

  useEffect(() => {
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
  }, []);

  // App-start / session-restore: once the commercial profile is known, tell the
  // companion kiosk app (com.prowin.kiosk) who is logged in, with the real name.
  // Shares useWorkspaceProfile's cache with ProfileSheet (no extra network call).
  const { data: profile } = useWorkspaceProfile(userId, role);
  useEffect(() => {
    if (!userId || !profile) return;
    const fullName = `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim();
    sendOperator(String(userId), fullName);
  }, [userId, profile]);

  useEffect(() => {
    let cancelled = false;
    let consecutiveFailures = 0;
    const MAX_FAILURES_BEFORE_REDIRECT = 3;

    const keepSessionAlive = async () => {
      try {
        const valid = await authService.ensureValidSession(120);
        if (valid) {
          consecutiveFailures = 0;
          return;
        }

        consecutiveFailures++;

        // Only redirect after multiple consecutive failures
        // AND only if we have no saved credentials (true logout needed)
        if (!cancelled && consecutiveFailures >= MAX_FAILURES_BEFORE_REDIRECT) {
          const hasCreds = await authService.getSavedCredentials();
          if (!hasCreds) {
            router.replace("/(auth)/login");
          }
          // If we have creds, keep trying -- next interval will retry
        }
      } catch {
        // Network error or similar -- do NOT redirect, just wait
        consecutiveFailures++;
      }
    };

    void keepSessionAlive();
    const intervalId = setInterval(() => {
      void keepSessionAlive();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [router]);

  // Navigation via la rail gauche (reco tablette : plus ergonomique en paysage,
  // 2 mains, qu'une barre en bas). Sur la Carte on masque juste le header pour
  // une carte immersive ; la rail reste pour naviguer (et sortir de la carte).
  const railVisible = showRail;

  return (
    <>
      <View style={styles.appLayout}>
        {railVisible ? (
          <NavigationRail
            currentIndex={index}
            onNavigate={goToTab}
            position={tabPosition}
          />
        ) : null}
        <View style={styles.mainContent}>
          <SwipeTabs
            index={index}
            onIndexChange={handleIndexChange}
            headerHeight={headerHeight}
            onHeaderVisibilityChange={setShowHeader}
            onRailVisibilityChange={setShowRail}
            onPositionChange={setTabPosition}
          />
          {/* Overlay header : hors flux, animé en fondu. Ne redimensionne jamais
              les scènes -> pas de reflow de la map à l'ouverture de la Carte. */}
          <Animated.View
            pointerEvents={headerShown ? "auto" : "none"}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0) setHeaderHeight(h);
            }}
            style={[
              styles.headerOverlay,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <AnimatedHeader currentIndex={index} />
          </Animated.View>
        </View>
      </View>
      <ProfileSheet ref={sheetRef} userId={userId} role={role} />
    </>
  );
}

export default function AppIndex() {
  return (
    <ProfileSheetProvider>
      <MapFocusProvider>
        <TerrainModeRequestProvider>
          <View style={styles.container}>
            <AppContent />
          </View>
        </TerrainModeRequestProvider>
      </MapFocusProvider>
    </ProfileSheetProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  appLayout: {
    flex: 1,
    flexDirection: "row",
  },
  mainContent: {
    flex: 1,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
