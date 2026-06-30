import AnimatedHeader from "@/components/navigation/AnimatedHeader";
import NavigationRail from "@/components/navigation/NavigationRail";
import SwipeTabs, { buildRoutes } from "@/components/navigation/SwipeTabs";
import ProfileSheet from "@/components/ProfileSheet";
import {
  ProfileSheetProvider,
  useProfileSheet,
} from "@/hooks/use-profile-sheet";
import { MapFocusProvider, useMapFocus } from "@/hooks/use-map-focus";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { sendOperator } from "@/modules/kiosk-bridge";
import { authService } from "@/services/auth";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

function AppContent() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [showHeader, setShowHeader] = useState(true);
  const [showRail, setShowRail] = useState(true);
  const { sheetRef } = useProfileSheet();
  const { focusTarget } = useMapFocus();
  const didSetInitialTab = useRef(false);

  const isManager = role === "manager";
  const isCommercial = role != null && !isManager;
  const routes = useMemo(() => buildRoutes(isManager), [isManager]);
  const activeKey = routes[index]?.key;
  const isCarte = activeKey === "carte";

  // Le commercial atterrit directement sur la carte plein écran.
  useEffect(() => {
    if (didSetInitialTab.current || role == null) return;
    didSetInitialTab.current = true;
    if (isCommercial) {
      const carteIdx = routes.findIndex((r) => r.key === "carte");
      if (carteIdx >= 0) setIndex(carteIdx);
    }
  }, [role, isCommercial, routes]);

  // "Voir sur la carte" : dès qu'une cible de focus est posée (depuis l'onglet
  // Lieux), on bascule sur l'onglet Carte. On NE vide PAS focusTarget ici : la
  // carte le consomme (centrage + highlight) puis le réinitialise elle-même.
  useEffect(() => {
    if (!focusTarget) return;
    const carteIdx = routes.findIndex((r) => r.key === "carte");
    if (carteIdx >= 0) setIndex(carteIdx);
  }, [focusTarget, routes]);

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
  const headerVisible = showHeader && !isCarte;

  return (
    <>
      <View style={styles.appLayout}>
        {railVisible ? (
          <NavigationRail currentIndex={index} onNavigate={setIndex} />
        ) : null}
        <View style={styles.mainContent}>
          {headerVisible ? <AnimatedHeader currentIndex={index} /> : null}
          <SwipeTabs
            index={index}
            onIndexChange={setIndex}
            onHeaderVisibilityChange={setShowHeader}
            onRailVisibilityChange={setShowRail}
          />
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
        <View style={styles.container}>
          <AppContent />
        </View>
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
});
