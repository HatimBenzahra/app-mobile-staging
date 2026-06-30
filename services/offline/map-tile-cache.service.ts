import { OfflineManager } from "@maplibre/maplibre-react-native";

const AMBIENT_CACHE_MAX_SIZE_BYTES = 50 * 1024 * 1024;
const TILE_COUNT_LIMIT = 6000;

let configured = false;

export async function configureMapTileCache(): Promise<void> {
  if (configured) return;
  configured = true;

  try {
    OfflineManager.setTileCountLimit(TILE_COUNT_LIMIT);
    await OfflineManager.setMaximumAmbientCacheSize(AMBIENT_CACHE_MAX_SIZE_BYTES);
  } catch (err) {
    configured = false;
    if (__DEV__) {
      console.warn("[MapTileCache] configureMapTileCache failed:", err);
    }
  }
}
