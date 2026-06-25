import { gql } from "@/services/core/graphql";
import type {
  CreateImmeubleInput,
  CreateQuartierInput,
  Immeuble,
  Quartier,
  UpdateImmeubleInput,
} from "@/types/api";
import {
  ADD_ETAGE_TO_IMMEUBLE,
  ADD_PORTE_TO_ETAGE,
  CREATE_IMMEUBLE,
  CREATE_MAISON_FROM_IMMEUBLE_INPUT,
  CREATE_QUARTIER,
  REMOVE_TERRAIN_LIEU,
  REMOVE_ETAGE_FROM_IMMEUBLE,
  REMOVE_PORTE_FROM_ETAGE,
  UPDATE_IMMEUBLE,
} from "./immeuble.mutations";
import { GET_QUARTIERS } from "./immeuble.queries";

export const immeubleApi = {
  async create(input: CreateImmeubleInput): Promise<Immeuble> {
    const response = await gql<
      { createImmeubleEmpty: Immeuble },
      { createImmeubleInput: CreateImmeubleInput }
    >(CREATE_IMMEUBLE, { createImmeubleInput: input });
    return response.createImmeubleEmpty;
  },

  async createMaison(input: CreateImmeubleInput): Promise<Immeuble> {
    const response = await gql<
      { createMaisonFromImmeubleInput: Immeuble },
      { createImmeubleInput: CreateImmeubleInput }
    >(CREATE_MAISON_FROM_IMMEUBLE_INPUT, { createImmeubleInput: input });
    return response.createMaisonFromImmeubleInput;
  },

  async createQuartier(input: CreateQuartierInput): Promise<Quartier> {
    const response = await gql<
      { createQuartier: Quartier },
      { createQuartierInput: CreateQuartierInput }
    >(CREATE_QUARTIER, { createQuartierInput: input });
    return response.createQuartier;
  },

  async update(input: UpdateImmeubleInput): Promise<Immeuble> {
    const response = await gql<
      { updateImmeuble: Immeuble },
      { updateImmeubleInput: UpdateImmeubleInput }
    >(UPDATE_IMMEUBLE, { updateImmeubleInput: input });
    return response.updateImmeuble;
  },

  async removeTerrainLieu(id: number): Promise<Immeuble> {
    const response = await gql<
      { removeTerrainLieu: Immeuble },
      { id: number }
    >(REMOVE_TERRAIN_LIEU, { id });
    return response.removeTerrainLieu;
  },

  async addEtageToImmeuble(id: number): Promise<Immeuble> {
    const response = await gql<
      { addEtageEmpty: Immeuble },
      { immeubleId: number }
    >(ADD_ETAGE_TO_IMMEUBLE, { immeubleId: id });
    return response.addEtageEmpty;
  },

  async addPorteToEtage(immeubleId: number, etage: number): Promise<Immeuble> {
    const response = await gql<
      { addPorteToEtageCapped: Immeuble },
      { immeubleId: number; etage: number }
    >(ADD_PORTE_TO_ETAGE, { immeubleId, etage });
    return response.addPorteToEtageCapped;
  },

  async removeEtageFromImmeuble(id: number): Promise<Immeuble> {
    const response = await gql<
      { removeEtageFromImmeuble: Immeuble },
      { id: number }
    >(REMOVE_ETAGE_FROM_IMMEUBLE, { id });
    return response.removeEtageFromImmeuble;
  },

  async removePorteFromEtage(
    immeubleId: number,
    etage: number,
  ): Promise<Immeuble> {
    const response = await gql<
      { removePorteFromEtage: Immeuble },
      { immeubleId: number; etage: number }
    >(REMOVE_PORTE_FROM_ETAGE, { immeubleId, etage });
    return response.removePorteFromEtage;
  },

  async getQuartiers(): Promise<Quartier[]> {
    const response = await gql<{ quartiers: Quartier[] }, Record<string, never>>(
      GET_QUARTIERS,
      {},
    );
    return response.quartiers;
  },
};
