import { gql } from "@/services/core/graphql";
import type {
  AssignZoneInput,
  CreateZoneInput,
  Immeuble,
  UserType,
  Zone,
  ZoneEnCours,
} from "@/types/api";
import type { HistoriqueZone } from "@/types/graphql-schema";
import {
  ASSIGN_ZONE_TO_COMMERCIAL,
  ASSIGN_ZONE_TO_USER,
  CREATE_ZONE,
} from "./zone.mutations";
import { USER_ZONE_HISTORY, ZONES_FOR_USER } from "./zone.queries";

/** Immeuble allégé embarqué par `zonesForUser` (compte + points de la zone). */
export type ZoneForUserImmeuble = Pick<
  Immeuble,
  "id" | "adresse" | "latitude" | "longitude"
>;

/** Zone renvoyée par `zonesForUser` : métadonnées + immeubles de la zone. */
export type ZoneForUser = Zone & {
  immeubles?: ZoneForUserImmeuble[] | null;
};

/** Zone allégée embarquée par `userZoneHistory` (géométrie pour le focus carte + créateur). */
export type UserZoneHistoryZone = Pick<
  Zone,
  "id" | "nom" | "polygon" | "xOrigin" | "yOrigin" | "rayon" | "createdByName" | "createdByType"
>;

/** Entrée d'historique d'assignation d'un utilisateur (`userZoneHistory`). */
export type UserZoneHistoryEntry = Pick<
  HistoriqueZone,
  | "id"
  | "zoneId"
  | "userId"
  | "userType"
  | "assignedAt"
  | "unassignedAt"
  | "totalContratsSignes"
  | "totalImmeublesVisites"
  | "totalRendezVousPris"
  | "totalRefus"
  | "totalImmeublesProspectes"
  | "totalPortesProspectes"
> & {
  zone?: UserZoneHistoryZone | null;
};

export const zoneApi = {
  async create(input: CreateZoneInput): Promise<Zone> {
    const response = await gql<
      { createZone: Zone },
      { createZoneInput: CreateZoneInput }
    >(CREATE_ZONE, { createZoneInput: input });
    return response.createZone;
  },

  async assignToCommercial(commercialId: number, zoneId: number): Promise<boolean> {
    const response = await gql<
      { assignZoneToCommercial: boolean },
      { commercialId: number; zoneId: number }
    >(ASSIGN_ZONE_TO_COMMERCIAL, { commercialId, zoneId });
    return response.assignZoneToCommercial;
  },

  // Source de vérité des zones à afficher pour un utilisateur : commercial =
  // ZoneEnCours ; manager = zones possédées OU assignées.
  async getForUser(userId: number, userType: UserType): Promise<ZoneForUser[]> {
    const response = await gql<
      { zonesForUser: ZoneForUser[] },
      { userId: number; userType: UserType }
    >(ZONES_FOR_USER, { userId, userType });
    return response.zonesForUser;
  },

  // Historique des assignations de zones d'un utilisateur (commercial ou
  // manager) : « en cours » + passées, avec dates et totaux. Lecture seule.
  async getUserHistory(
    userId: number,
    userType: UserType,
  ): Promise<UserZoneHistoryEntry[]> {
    const response = await gql<
      { userZoneHistory: UserZoneHistoryEntry[] },
      { userId: number; userType: UserType }
    >(USER_ZONE_HISTORY, { userId, userType });
    return response.userZoneHistory;
  },

  // Assignation générique : permet notamment au manager de s'assigner lui-même
  // (userType MANAGER) à sa propre zone.
  async assignToUser(
    userId: number,
    userType: UserType,
    zoneId: number,
    cascade?: boolean,
  ): Promise<ZoneEnCours> {
    const response = await gql<
      { assignZoneToUser: ZoneEnCours },
      { input: AssignZoneInput }
    >(ASSIGN_ZONE_TO_USER, {
      input: { userId, userType, zoneId, ...(cascade !== undefined ? { cascade } : {}) },
    });
    return response.assignZoneToUser;
  },
};
