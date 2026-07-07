import type { TypeHabitat } from "@/types/api";

export type AdresseFeature = {
  properties: {
    id?: string;
    label: string;
    name?: string;
    postcode?: string;
    city?: string;
    housenumber?: string;
    street?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

export type TerrainPoint = {
  latitude: number;
  longitude: number;
};

export type TerrainMode = "VISUALISATION" | "BATIMENT" | "QUARTIER";

export type DraftPin = TerrainPoint & {
  id: string;
  selectedAddress: AdresseFeature | null;
  typeHabitat: TypeHabitat;
  nbMaisonsPrevu: number;
  // Structure saisie dès la création (immeuble surtout). Évite la coquille vide.
  nbEtages: number;
  nbPortesParEtage: number;
  ascenseur: boolean;
  digitalCode: string | null;
};

export type CreateStep = "type" | "adresse" | "apercu";
