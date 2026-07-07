import { MapFocusProvider } from "@/hooks/use-map-focus";
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
  return (
    <MapFocusProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MapFocusProvider>
  );
}
