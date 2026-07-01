export const GET_COMMERCIAL_RANKINGS = `
  query GetCommercialRankings($commercialId: Int!) {
    commercialRankings(commercialId: $commercialId) {
      id
      period
      periodKey
      rank
      points
      contratsSignes
      rankTierKey
      rankTierLabel
      metadata
      computedAt
    }
  }
`;

export const GET_RANKING = `
  query GetRanking($period: RankPeriod!, $periodKey: String!) {
    ranking(period: $period, periodKey: $periodKey) {
      id
      commercialId
      commercialNom
      commercialPrenom
      managerId
      managerNom
      managerPrenom
      rank
      points
      contratsSignes
      rankTierKey
      rankTierLabel
    }
  }
`;

export const GET_TEAM_RANKING = `
  query GetTeamRanking($period: RankPeriod!, $periodKey: String!) {
    teamRanking(period: $period, periodKey: $periodKey) {
      id
      commercialId
      commercialNom
      commercialPrenom
      rank
      points
      contratsSignes
      rankTierKey
      rankTierLabel
    }
  }
`;

export const GET_COMMERCIAL_BADGES = `
  query GetCommercialBadges($commercialId: Int!) {
    commercialBadges(commercialId: $commercialId) {
      id
      commercialId
      badgeDefinitionId
      periodKey
      awardedAt
      metadata
      badgeDefinition {
        id
        code
        nom
        description
        category
        iconUrl
        tier
      }
    }
  }
`;

export const GET_MANAGER_BADGES = `
  query GetManagerBadges($managerId: Int!) {
    managerBadges(managerId: $managerId) {
      id
      managerId
      badgeDefinitionId
      periodKey
      awardedAt
      metadata
      badgeDefinition {
        id
        code
        nom
        description
        category
        iconUrl
        tier
      }
    }
  }
`;

export const GET_CONTRATS_BY_COMMERCIAL = `
  query GetContratsByCommercial($commercialId: Int!, $contractStatuses: [ContractRankingStatus!]) {
    contratsByCommercial(commercialId: $commercialId, contractStatuses: $contractStatuses) {
      id
      offreExternalId
      offreCategorie
      offreNom
      offreFournisseur
      offreLogoUrl
      offrePoints
      dateValidation
      periodDay
      periodWeek
      periodMonth
      periodQuarter
      periodYear
      statutContrat
    }
  }
`;

export const GET_CONTRATS_BY_MANAGER = `
  query GetContratsByManager($managerId: Int!, $contractStatuses: [ContractRankingStatus!]) {
    contratsByManager(managerId: $managerId, contractStatuses: $contractStatuses) {
      id
      offreExternalId
      offreCategorie
      offreNom
      offreFournisseur
      offreLogoUrl
      offrePoints
      dateValidation
      periodDay
      periodWeek
      periodMonth
      periodQuarter
      periodYear
      statutContrat
    }
  }
`;

export const GET_GAMIFICATION_OFFRES = `
  query GetGamificationOffres {
    offres(activeOnly: false) {
      id
      externalId
      badgeProductKey
      categorie
    }
  }
`;

export const GET_BADGE_DEFINITIONS = `
  query GetBadgeDefinitions($category: BadgeCategory, $activeOnly: Boolean) {
    badgeDefinitions(category: $category, activeOnly: $activeOnly) {
      id
      code
      nom
      description
      category
      iconUrl
      tier
      isActive
    }
  }
`;
