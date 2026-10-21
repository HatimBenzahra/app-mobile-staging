import { useEffect, useRef } from "react";
import { AppState } from "react-native";

const POLL_INTERVAL_MS = 15_000;

/**
 * Immeuble partagé : pas de temps réel côté backend, on rafraîchit donc la
 * fiche toutes les 15 s pour voir les portes des coéquipiers. Actif seulement
 * si `enabled` et app au premier plan ; coupé en arrière-plan et au démontage.
 * Au retour au premier plan, un rafraîchissement immédiat rattrape le retard.
 */
export function useSharedImmeublePolling(
  enabled: boolean,
  refresh: () => void | Promise<void>,
): void {
  // Dernier callback sans relancer l'intervalle à chaque nouvelle identité.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer !== null) return;
      timer = setInterval(() => {
        void refreshRef.current();
      }, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState === "active") start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshRef.current();
        start();
        return;
      }
      stop();
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [enabled]);
}
