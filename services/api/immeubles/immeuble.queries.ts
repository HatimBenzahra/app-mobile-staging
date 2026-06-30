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
