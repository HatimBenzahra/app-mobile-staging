import { colors } from "@/constants/theme";
import type { TypeHabitat } from "@/types/api";
import type { AdresseFeature, DraftPin, TerrainPoint } from "./types";

export function formatSuggestion(feature: AdresseFeature) {
  const p = feature.properties;
  const title = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || p.label;
  const subtitle = [p.postcode, p.city].filter(Boolean).join(" ");
  return { title, subtitle };
}

export function makeDraftPin(point: TerrainPoint): DraftPin {
  return {
    ...point,
    id: `${Date.now()}-${Math.round(point.latitude * 100000)}-${Math.round(point.longitude * 100000)}`,
    selectedAddress: null,
    typeHabitat: "MAISON",
    nbMaisonsPrevu: 2,
  };
}

export function getLieuMarkerColor(type?: TypeHabitat) {
  if (type === "MAISON") return colors.success;
  if (type === "PAVILLON") return "#F97316";
  return colors.primary;
}

export function getHabitatLabel(type?: TypeHabitat) {
  if (type === "MAISON") return "Maison";
  if (type === "PAVILLON") return "Pavillon";
  return "Immeuble";
}

export function createBuildingInput(
  draft: DraftPin,
  role: string | null,
  userId: number | null,
) {
  return {
    adresse: draft.selectedAddress!.properties.label,
    latitude: draft.latitude,
    longitude: draft.longitude,
    nbEtages: draft.typeHabitat === "PAVILLON" ? draft.nbMaisonsPrevu : 1,
    nbPortesParEtage: 1,
    nbMaisonsPrevu: draft.typeHabitat === "PAVILLON" ? draft.nbMaisonsPrevu : 1,
    ascenseurPresent: false,
    digitalCode: null,
    commercialId: role === "commercial" ? (userId ?? undefined) : undefined,
    managerId: role === "manager" ? (userId ?? undefined) : undefined,
    typeHabitat: draft.typeHabitat,
  };
}
