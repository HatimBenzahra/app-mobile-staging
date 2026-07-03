import { useEffect, useState } from "react";
import { authService } from "@/services/auth";

export type BootTargetRoute = "/(app)" | "/(auth)/login";

/** Durée minimale d'affichage de l'écran de boot, pour éviter un flash. */
const MIN_SPLASH_MS = 1100;

/**
 * Séquence de démarrage de l'app : résout la session d'authentification puis
 * garantit une durée minimale d'affichage de l'écran de boot brandé. Expose la
 * route cible dès que tout est prêt.
 */
export function useAppBootstrap() {
  const [ready, setReady] = useState(false);
  const [targetRoute, setTargetRoute] = useState<BootTargetRoute | null>(null);

  useEffect(() => {
    let mounted = true;
    const startedAt = Date.now();

    const run = async () => {
      let hasSession = false;
      try {
        hasSession = await authService.initializeAuth();
      } catch {
        hasSession = false;
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SPLASH_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS - elapsed));
      }

      if (!mounted) return;
      setTargetRoute(hasSession ? "/(app)" : "/(auth)/login");
      setReady(true);
    };

    void run();
    return () => {
      mounted = false;
    };
  }, []);

  return { ready, targetRoute };
}
