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

  return <Stack screenOptions={{ headerShown: false }} />;
}
