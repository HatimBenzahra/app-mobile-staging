export const UPDATE_PORTE = `
  mutation UpdatePorte($updatePorteInput: UpdatePorteInput!) {
    updatePorte(updatePorteInput: $updatePorteInput) {
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
      createdAt
      updatedAt
    }
  }
`;

// V2 : utilise l'endpoint capped (check nbPortesParEtage côté backend).
// L'ancien endpoint `createPorte` reste dispo pour les anciens mobiles.
export const CREATE_PORTE = `
  mutation CreatePorteCapped($createPorteInput: CreatePorteInput!) {
    createPorteCapped(createPorteInput: $createPorteInput) {
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
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_PORTE = `
  mutation RemovePorte($id: Int!) {
    removePorte(id: $id) {
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
      createdAt
      updatedAt
    }
  }
`;
