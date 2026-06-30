import {
  OfflineManager,
  type LngLatBounds,
  type OfflinePackError,
  type OfflinePackStatus,
} from "@maplibre/maplibre-react-native";

import { MAP_STYLE_URL } from "@/hooks/carte-terrain/constants";

// PHASE 2b : téléchargement manuel d'un PACK OFFLINE garanti autour de la zone
// de travail. Contrairement au cache ambiant (qui ne couvre que les tuiles déjà
// visitées), ce pack télécharge explicitement toute la bbox demandée.
//
// IMPORTANT — ToS : on ne pré-télécharge QUE le fond vectoriel OpenFreeMap
// (MAP_STYLE_URL). La couche satellite ESRI (ESRI_SATELLITE_TILE_URL) ne doit
// JAMAIS faire partie d'un pack offline : ses conditions d'utilisation
// interdisent le stockage hors-ligne des tuiles.

const PACK_RADIUS_KM_DEFAULT = 3;
const PACK_MIN_ZOOM = 12;
const PACK_MAX_ZOOM = 16;
const PACK_NAME_PREFIX = "area";

export type OfflinePackArea = {
  latitude: number;
  longitude: number;
};

export type DownloadAreaPackArgs = {
  name: string;
  center: OfflinePackArea;
  radiusKm?: number;
  onProgress?: (percentage: number) => void;
};

/**
 * Construit une bbox [west, south, east, north] (format LngLatBounds attendu
 * par createPack) à partir d'un centre + un rayon en km.
 *
 * Approximations volontairement simples :
 *   - 1° de latitude ≈ 111 km
 *   - 1° de longitude ≈ 111 km × cos(latitude)
 */
function buildBoundsFromCenter(
  center: OfflinePackArea,
  radiusKm: number,
): LngLatBounds {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180));

  const west = center.longitude - lngDelta;
  const south = center.latitude - latDelta;
  const east = center.longitude + lngDelta;
  const north = center.latitude + latDelta;

  return [west, south, east, north];
}

/**
 * Nom stable d'un pack pour une zone donnée : on arrondit le centre à ~3
 * décimales (~110 m) afin qu'une même zone retombe toujours sur le même pack
 * (et soit donc rafraîchie plutôt que dupliquée).
 */
export function getAreaPackName(center: OfflinePackArea): string {
  const lat = center.latitude.toFixed(3);
  const lng = center.longitude.toFixed(3);
  return `${PACK_NAME_PREFIX}_${lat}_${lng}`;
}

/**
 * Le nom logique du pack est stocké dans `metadata.name` (createPack génère un
 * `id` UUID natif et n'accepte pas de nom). On retrouve donc un pack existant
 * en comparant ce champ de métadonnées.
 */
async function findPackIdByName(name: string): Promise<string | null> {
  const packs = await OfflineManager.getPacks();
  for (const pack of packs) {
    if (pack.metadata?.name === name) {
      return pack.id;
    }
  }
  return null;
}

/**
 * Télécharge (ou rafraîchit) un pack offline couvrant la zone autour du centre
 * fourni. Si un pack du même nom existe déjà, il est supprimé d'abord afin que
 * le re-téléchargement reparte d'une version fraîche.
 *
 * En cas d'échec on remonte une erreur claire (le téléchargement étant une
 * action explicite de l'utilisateur) mais on ne fait jamais crasher l'app.
 */
export async function downloadAreaPack({
  name,
  center,
  radiusKm = PACK_RADIUS_KM_DEFAULT,
  onProgress,
}: DownloadAreaPackArgs): Promise<void> {
  const bounds = buildBoundsFromCenter(center, radiusKm);

  const existingId = await findPackIdByName(name);
  if (existingId) {
    await OfflineManager.deletePack(existingId);
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const handleProgress = (
      _pack: unknown,
      status: OfflinePackStatus,
    ): void => {
      onProgress?.(status.percentage);
      if (status.state === "complete" && !settled) {
        settled = true;
        resolve();
      }
    };

    const handleError = (_pack: unknown, error: OfflinePackError): void => {
      if (settled) return;
      settled = true;
      reject(new Error(error.message || "Téléchargement du pack offline échoué"));
    };

    OfflineManager.createPack(
      {
        // Fond VECTORIEL uniquement (OpenFreeMap). Voir note ToS en tête de fichier.
        mapStyle: MAP_STYLE_URL,
        bounds,
        minZoom: PACK_MIN_ZOOM,
        maxZoom: PACK_MAX_ZOOM,
        metadata: { name },
      },
      handleProgress,
      handleError,
    ).catch((err) => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}

/**
 * Liste les packs offline existants (id + nom logique éventuel).
 */
export async function listOfflinePacks(): Promise<
  { id: string; name: string | null }[]
> {
  try {
    const packs = await OfflineManager.getPacks();
    return packs.map((pack) => ({
      id: pack.id,
      name: (pack.metadata?.name as string | undefined) ?? null,
    }));
  } catch (err) {
    if (__DEV__) {
      console.warn("[MapOfflinePack] listOfflinePacks failed:", err);
    }
    return [];
  }
}

/**
 * Supprime un pack offline par son nom logique. Sans-effet si le pack n'existe
 * pas. Ne lève jamais d'erreur.
 */
export async function deleteOfflinePack(name: string): Promise<void> {
  try {
    const existingId = await findPackIdByName(name);
    if (existingId) {
      await OfflineManager.deletePack(existingId);
    }
  } catch (err) {
    if (__DEV__) {
      console.warn("[MapOfflinePack] deleteOfflinePack failed:", err);
    }
  }
}
