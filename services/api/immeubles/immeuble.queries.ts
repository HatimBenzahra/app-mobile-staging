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

export const GET_MOBILE_MANAGER_MAP_PLACES = `
  query GetMobileManagerMapPlaces($includeTeam: Boolean!) {
    mobileManagerMapPlaces(includeTeam: $includeTeam) {
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
      managerId
      ownership
      creatorName
      updatedAt
    }
  }
`;

export const GET_MOBILE_MAP_QUARTIERS = `
  query GetMobileMapQuartiers {
    mobileMapQuartiers {
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
        quartierId
        zoneId
        commercialId
        managerId
        updatedAt
      }
    }
  }
`;

export const GET_MOBILE_IMMEUBLE_DETAIL = `
  query GetMobileImmeubleDetail($id: Int!) {
    mobileImmeubleDetail(id: $id) {
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
      managerId
      ascenseurPresent
      digitalCode
      updatedAt
      portes {
        id
        numero
        nomPersonnalise
        etage
        immeubleId
        statut
        nbRepassages
        nbContrats
        rdvDate
        rdvTime
        commentaire
        derniereVisite
        duree
      }
    }
  }
`;
