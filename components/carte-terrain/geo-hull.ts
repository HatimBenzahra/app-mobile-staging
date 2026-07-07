import type { LngLatBounds } from "@maplibre/maplibre-react-native";
import type { Feature, Polygon, Position } from "geojson";
import type { Quartier } from "@/types/api";

/**
 * Helpers géométriques purs (sans dépendance) pour dessiner le contour d'un
 * quartier autour de ses bâtiments. Toutes les coordonnées sont des tuples
 * `[longitude, latitude]` (ordre GeoJSON).
 */

type Point = [number, number];

/** 1° de latitude ≈ 111 320 m (cf. ZoneContour). */
const METERS_PER_DEG_LAT = 111_320;

/** Géométrie minimale d'une zone pour en calculer la bbox. */
export type ZoneBoundsInput = {
  polygon?: number[][] | null;
  xOrigin?: number | null;
  yOrigin?: number | null;
  rayon?: number | null;
};

/**
 * Enveloppe convexe via la chaîne monotone d'Andrew. Renvoie un anneau OUVERT
 * (le premier point n'est pas répété en fin) ; c'est à l'appelant de le fermer.
 */
export function convexHull(points: Point[]): Point[] {
  const unique = dedupe(points);
  if (unique.length <= 2) return unique;

  const sorted = [...unique].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  // On retire le dernier point de chaque moitié (dupliqué avec l'autre moitié).
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Dilate chaque sommet vers l'extérieur depuis le centroïde de l'anneau d'un
 * facteur `scale`, pour que le contour ne colle pas aux marqueurs.
 */
export function padRing(ring: Point[], scale = 1.18): Point[] {
  if (ring.length === 0) return ring;
  const cx = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
  const cy = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
  return ring.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale]);
}

/**
 * Polygone circulaire (anneau ouvert) pour les cas dégénérés (1 ou 2 points).
 * Le rayon en longitude est corrigé par `1/cos(lat)` pour rester visuellement
 * circulaire aux latitudes françaises.
 */
export function circlePolygon(
  center: Point,
  radiusDegLat = 0.00022,
  steps = 24,
): Point[] {
  const [cx, cy] = center;
  const lonScale = 1 / Math.max(Math.cos((cy * Math.PI) / 180), 1e-6);
  const ring: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    ring.push([
      cx + Math.cos(angle) * radiusDegLat * lonScale,
      cy + Math.sin(angle) * radiusDegLat,
    ]);
  }
  return ring;
}

/**
 * Construit une Feature Polygon GeoJSON pour un quartier à partir des
 * coordonnées valides de ses immeubles.
 *
 * Règles :
 *  - 0 coord valide          → null
 *  - 1 ou 2 coords           → cercle autour du centroïde (rayon englobant)
 *  - >= 3 coords             → enveloppe convexe dilatée
 *
 * La géométrie renvoyée est un anneau FERMÉ (premier == dernier point).
 */
export function buildQuartierFeature(
  quartier: Quartier,
): Feature<Polygon, { quartierId: number; nom: string }> | null {
  const coords: Point[] = (quartier.immeubles ?? [])
    .filter((immeuble) => immeuble.latitude != null && immeuble.longitude != null)
    .map((immeuble) => [immeuble.longitude as number, immeuble.latitude as number]);

  if (coords.length === 0) return null;

  const properties = {
    quartierId: quartier.id,
    nom: quartier.nom ?? `Quartier #${quartier.id}`,
  };

  let ring: Point[];
  if (coords.length <= 2) {
    const cx = coords.reduce((sum, p) => sum + p[0], 0) / coords.length;
    const cy = coords.reduce((sum, p) => sum + p[1], 0) / coords.length;
    // Rayon = distance max au centroïde + marge, avec un plancher pour 1 point.
    const maxDist = coords.reduce((max, [x, y]) => {
      const d = Math.hypot(x - cx, y - cy);
      return d > max ? d : max;
    }, 0);
    const radius = Math.max(maxDist, 0) + 0.00022;
    ring = circlePolygon([cx, cy], radius);
  } else {
    ring = padRing(convexHull(coords));
  }

  // Ferme l'anneau.
  const closed: Position[] = [...ring];
  if (closed.length > 0) {
    const first = closed[0];
    const last = closed[closed.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      closed.push([first[0], first[1]]);
    }
  }

  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [closed],
    },
  };
}

/**
 * Boîte englobante d'une zone au format `LngLatBounds` de MapLibre
 * (`[west, south, east, north]` = `[minLng, minLat, maxLng, maxLat]`), prête à
 * passer à `CameraRef.fitBounds`. Dérivée du `polygon` s'il existe (≥ 3 points),
 * sinon du cercle `xOrigin/yOrigin/rayon` (mètres → degrés). `null` si aucune
 * géométrie exploitable.
 */
export function zoneBounds(zone: ZoneBoundsInput): LngLatBounds | null {
  let coords: Point[] = [];

  if (zone.polygon && zone.polygon.length >= 3) {
    coords = zone.polygon.map((p) => [p[0], p[1]]);
  } else if (
    zone.xOrigin != null &&
    zone.yOrigin != null &&
    zone.rayon != null &&
    zone.rayon > 0
  ) {
    const radiusDegLat = zone.rayon / METERS_PER_DEG_LAT;
    // Correction longitude par 1/cos(lat) pour rester géographiquement juste.
    const lonScale = 1 / Math.max(Math.cos((zone.yOrigin * Math.PI) / 180), 1e-6);
    coords = [
      [zone.xOrigin - radiusDegLat * lonScale, zone.yOrigin - radiusDegLat],
      [zone.xOrigin + radiusDegLat * lonScale, zone.yOrigin + radiusDegLat],
    ];
  }

  if (coords.length === 0) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Superficie approximative d'un anneau `[[lng,lat],…]` en km², via la formule du
 * lacet (shoelace) appliquée après projection équirectangulaire locale autour de
 * la latitude moyenne (degrés → mètres). Suffisamment juste aux échelles d'une
 * zone de prospection. Renvoie `0` si l'anneau a moins de 3 sommets.
 */
export function polygonAreaKm2(ring: number[][]): number {
  if (!ring || ring.length < 3) return 0;
  const latMean = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
  const cosLat = Math.cos((latMean * Math.PI) / 180);
  const projected: Point[] = ring.map(([lng, lat]) => [
    lng * METERS_PER_DEG_LAT * cosLat,
    lat * METERS_PER_DEG_LAT,
  ]);
  let doubleArea = 0;
  for (let i = 0; i < projected.length; i++) {
    const [x1, y1] = projected[i];
    const [x2, y2] = projected[(i + 1) % projected.length];
    doubleArea += x1 * y2 - x2 * y1;
  }
  return Math.abs(doubleArea) / 2 / 1_000_000;
}

function dedupe(points: Point[]): Point[] {
  const seen = new Set<string>();
  const out: Point[] = [];
  for (const p of points) {
    const key = `${p[0]},${p[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}
