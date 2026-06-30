import { Platform, requireOptionalNativeModule } from "expo-modules-core";

type KioskBridgeNativeModule = {
  sendOperator(id: string, name: string): void;
  clearOperator(): void;
};

// `requireOptionalNativeModule` returns null when the native module is absent
// (iOS builds, Expo Go, or any build where the module isn't linked).
const KioskBridge = requireOptionalNativeModule<KioskBridgeNativeModule>("KioskBridge");

/**
 * Tell the companion kiosk app (com.prowin.kiosk) which commercial is logged in.
 * No-ops on iOS / when the native module is unavailable. Never throws.
 */
export function sendOperator(id: string, name: string): void {
  if (Platform.OS !== "android" || !KioskBridge) return;
  try {
    KioskBridge.sendOperator(id, name);
  } catch {
    // Broadcasting to an absent kiosk app is harmless; swallow any failure.
  }
}

/**
 * Tell the companion kiosk app that no commercial is logged in anymore.
 * No-ops on iOS / when the native module is unavailable. Never throws.
 */
export function clearOperator(): void {
  if (Platform.OS !== "android" || !KioskBridge) return;
  try {
    KioskBridge.clearOperator();
  } catch {
    // Harmless if the kiosk app isn't installed; swallow any failure.
  }
}
