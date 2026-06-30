import type { TypeHabitat } from "@/types/api";

export const DEFAULT_REGION = {
  latitude: 48.8566,
  longitude: 2.3522,
};

export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const ESRI_SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export const habitatOptions: {
  type: TypeHabitat;
  label: string;
}[] = [
  { type: "MAISON", label: "Maison" },
  { type: "PAVILLON", label: "Pavillon" },
  { type: "IMMEUBLE", label: "Immeuble" },
];
