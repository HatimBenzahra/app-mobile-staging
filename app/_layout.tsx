import { OfflineBanner, ToastProvider } from "@/components/ui";
import { configureMapTileCache } from "@/services/offline/map-tile-cache.service";
import { enableOfflineQueueAutoSync } from "@/services/offline/offline-queue.service";
import { enableUploadQueueAutoSync } from "@/services/audio/recordings/upload-queue.service";
// Side-effect import: registers the background LOCATION_TASK in the global
// scope so it is available even when the OS wakes the app headless for a
// location event. Do not remove.
import "@/services/location/location-tracking.service";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

// On tient le splash natif affiché jusqu'à ce que l'app soit prête (auth
// résolue) : c'est le SEUL écran de chargement. Il est masqué depuis app/index.tsx.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    enableOfflineQueueAutoSync();
    void enableUploadQueueAutoSync();
    void configureMapTileCache();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <OfflineBanner />
          </ToastProvider>
          <StatusBar style="light" translucent backgroundColor="transparent" />
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
