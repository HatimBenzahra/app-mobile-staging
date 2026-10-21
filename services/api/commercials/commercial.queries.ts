export const GET_COMMERCIAL_FULL = `
  query GetCommercialFull($id: Int!) {
    commercial(id: $id) {
      id
      nom
      prenom
      email
      numTel
      managerId
      zones {
        id
        nom
        polygon
        xOrigin
        yOrigin
        rayon
      }
      immeubles {
        id
        adresse
        nbEtages
        nbPortesParEtage
        typeHabitat
        ascenseurPresent
        digitalCode
        latitude
        longitude
        commercialId
        zoneId
        updatedAt
        membres {
          id
          nom
          prenom
          type
        }
        portes {
          id
          numero
          nomPersonnalise
          etage
          statut
          nbRepassages
          nbContrats
          rdvDate
          rdvTime
          commentaire
          derniereVisite
          dernierCommercialId
          dernierManagerId
        }
      }
      statistics {
        id
        commercialId
        contratsSignes
        immeublesVisites
        rendezVousPris
        refus
      }
    }
  }
`;

export const GET_COMMERCIALS = `
  query GetCommercials {
    commercials {
      id
      nom
      prenom
      email
      numTel
      managerId
      directeurId
    }
  }
`;
