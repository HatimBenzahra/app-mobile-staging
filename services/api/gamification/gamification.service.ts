import { gql } from "@/services/core/graphql";
import type {
  BadgeCategory,
  BadgeDefinitionType,
  CommercialBadgeType,
  ContratValideType,
  Offre,
  RankPeriod,
  RankSnapshotType,
} from "@/types/graphql-schema";
import {
  GET_BADGE_DEFINITIONS,
  GET_COMMERCIAL_BADGES,
  GET_COMMERCIAL_RANKINGS,
  GET_CONTRATS_BY_COMMERCIAL,
  GET_CONTRATS_BY_MANAGER,
  GET_GAMIFICATION_OFFRES,
  GET_MANAGER_BADGES,
  GET_RANKING,
  GET_TEAM_RANKING,
} from "./gamification.queries";

/** Sous-ensemble d'Offre utile à la gamification mobile. */
export type GamificationOffre = Pick<
  Offre,
  "id" | "externalId" | "badgeProductKey" | "categorie"
>;

export const gamificationApi = {
  /** Tous les snapshots de classement d'un commercial (une entrée par période). */
  async getCommercialRankings(commercialId: number): Promise<RankSnapshotType[]> {
    const response = await gql<{ commercialRankings: RankSnapshotType[] }, { commercialId: number }>(
      GET_COMMERCIAL_RANKINGS,
      { commercialId },
    );
    return response.commercialRankings;
  },

  /** Classement complet (leaderboard) pour une période donnée. */
  async getRanking(period: RankPeriod, periodKey: string): Promise<RankSnapshotType[]> {
    const response = await gql<
      { ranking: RankSnapshotType[] },
      { period: RankPeriod; periodKey: string }
    >(GET_RANKING, { period, periodKey });
    return response.ranking;
  },

  /** Classement de l'équipe de l'utilisateur courant (scopé côté serveur via le token). */
  async getTeamRanking(period: RankPeriod, periodKey: string): Promise<RankSnapshotType[]> {
    const response = await gql<
      { teamRanking: RankSnapshotType[] },
      { period: RankPeriod; periodKey: string }
    >(GET_TEAM_RANKING, { period, periodKey });
    return response.teamRanking;
  },

  /** Badges obtenus par un commercial. */
  async getCommercialBadges(commercialId: number): Promise<CommercialBadgeType[]> {
    const response = await gql<{ commercialBadges: CommercialBadgeType[] }, { commercialId: number }>(
      GET_COMMERCIAL_BADGES,
      { commercialId },
    );
    return response.commercialBadges;
  },

  /** Badges obtenus par un manager. */
  async getManagerBadges(managerId: number): Promise<CommercialBadgeType[]> {
    const response = await gql<{ managerBadges: CommercialBadgeType[] }, { managerId: number }>(
      GET_MANAGER_BADGES,
      { managerId },
    );
    return response.managerBadges;
  },

  /** Contrats validés d'un commercial (pour calculer la progression des badges). */
  async getContratsByCommercial(commercialId: number): Promise<ContratValideType[]> {
    const response = await gql<
      { contratsByCommercial: ContratValideType[] },
      { commercialId: number; contractStatuses: string[] }
    >(GET_CONTRATS_BY_COMMERCIAL, { commercialId, contractStatuses: ["VALIDE"] });
    return response.contratsByCommercial;
  },

  /** Contrats validés d'un manager. */
  async getContratsByManager(managerId: number): Promise<ContratValideType[]> {
    const response = await gql<
      { contratsByManager: ContratValideType[] },
      { managerId: number; contractStatuses: string[] }
    >(GET_CONTRATS_BY_MANAGER, { managerId, contractStatuses: ["VALIDE"] });
    return response.contratsByManager;
  },

  /** Offres (externalId → badgeProductKey) pour mapper les contrats aux produits. */
  async getOffres(): Promise<GamificationOffre[]> {
    const response = await gql<{ offres: GamificationOffre[] }>(GET_GAMIFICATION_OFFRES);
    return response.offres;
  },

  /** Catalogue des badges (pour afficher obtenus vs verrouillés). */
  async getBadgeDefinitions(
    category?: BadgeCategory,
    activeOnly = true,
  ): Promise<BadgeDefinitionType[]> {
    const response = await gql<
      { badgeDefinitions: BadgeDefinitionType[] },
      { category?: BadgeCategory; activeOnly: boolean }
    >(GET_BADGE_DEFINITIONS, { category, activeOnly });
    return response.badgeDefinitions;
  },
};
