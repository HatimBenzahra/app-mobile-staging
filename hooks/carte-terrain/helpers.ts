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
    // Valeurs par défaut sensées : l'utilisateur ajuste, il ne part pas de zéro.
    nbEtages: 3,
    nbPortesParEtage: 4,
    ascenseur: false,
    digitalCode: null,
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
  const isImmeuble = draft.typeHabitat === "IMMEUBLE";
  const isPavillon = draft.typeHabitat === "PAVILLON";
  const code = draft.digitalCode?.trim();
  return {
    adresse: draft.selectedAddress!.properties.label,
    latitude: draft.latitude,
    longitude: draft.longitude,
    // Immeuble : structure réellement saisie. Pavillon : N maisons = N étages × 1 porte.
    nbEtages: isImmeuble ? draft.nbEtages : isPavillon ? draft.nbMaisonsPrevu : 1,
    nbPortesParEtage: isImmeuble ? draft.nbPortesParEtage : 1,
    nbMaisonsPrevu: isPavillon ? draft.nbMaisonsPrevu : 1,
    ascenseurPresent: isImmeuble ? draft.ascenseur : false,
    digitalCode: isImmeuble && code ? code : null,
    commercialId: role === "commercial" ? (userId ?? undefined) : undefined,
    managerId: role === "manager" ? (userId ?? undefined) : undefined,
    typeHabitat: draft.typeHabitat,
  };
}
