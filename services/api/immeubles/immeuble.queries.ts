export const GET_IMMEUBLES_PAGE = `
  query GetImmeublesPage($input: ImmeublesPageInput!) {
    immeublesPage(input: $input) {
      items {
        id
        adresse
        latitude
        longitude
        typeHabitat
        nbEtages
        nbPortesParEtage
        nbMaisonsPrevu
        quartierId
        zoneId
        commercialId
        updatedAt
        portes {
          id
          statut
          etage
        }
      }
      nextCursor
      hasMore
      totalCount
      summary {
        coveragePercent
        standaloneCount
      }
    }
  }
`;

export const GET_QUARTIERS = `
  query GetQuartiers {
    quartiers {
      id
      nom
      latitude
      longitude
      createdAt
      immeubles {
        id
        adresse
        latitude
        longitude
        typeHabitat
        nbEtages
        nbPortesParEtage
        nbMaisonsPrevu
        portes {
          id
          statut
          etage
        }
      }
    }
  }
`;
