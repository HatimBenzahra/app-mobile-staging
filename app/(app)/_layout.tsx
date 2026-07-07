import { MapFocusProvider } from "@/hooks/use-map-focus";
import { RequestedTabProvider } from "@/hooks/use-requested-tab";
import { ZoneDetailPanelProvider } from "@/hooks/use-zone-detail-panel";
import { ZonesHistoryModalProvider } from "@/hooks/use-zones-history-modal";
import { LocationTrackingService } from "@/services/location/location-tracking.service";
import { Stack } from "expo-router";
import { useEffect } from "react";

export default function AppLayout() {
  // The (app) group is only mounted for an authenticated session, and it
  // unmounts on logout (navigation back to /(auth)/login). Start GPS tracking
  // here (role-gated to commercials inside the service) and stop it on unmount.
  useEffect(() => {
    void LocationTrackingService.start();
    return () => {
      void LocationTrackingService.stop();
    };
  }, []);

  // MapFocusProvider enveloppe TOUTE la pile (index + zone/create + …) : le focus
  // carte (bâtiment ou zone) doit survivre à la navigation entre routes sœurs.
  // C'est pourquoi il vit ici et non plus dans l'écran onglets (index).
  // ZoneDetailPanelProvider vit au même niveau : AppContent (écran onglets) ET
  // les scènes d'onglets (Zones, Carte) partagent le canal d'ouverture du détail
  // zone en panneau embarqué, sans passer par une route empilée plein écran.
  return (
    <MapFocusProvider>
      <RequestedTabProvider>
        <ZoneDetailPanelProvider>
          <ZonesHistoryModalProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </ZonesHistoryModalProvider>
        </ZoneDetailPanelProvider>
      </RequestedTabProvider>
    </MapFocusProvider>
  );
}
