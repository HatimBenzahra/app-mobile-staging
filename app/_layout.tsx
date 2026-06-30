import { OfflineBanner, ToastProvider } from "@/components/ui";
import { configureMapTileCache } from "@/services/offline/map-tile-cache.service";
import { enableOfflineQueueAutoSync } from "@/services/offline/offline-queue.service";
import { enableUploadQueueAutoSync } from "@/services/audio/recordings/upload-queue.service";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

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
