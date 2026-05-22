// V2 : nouvel endpoint qui ne pré-crée pas les portes. Les anciens mobiles
// continuent d'appeler `createImmeuble` (qui reste dispo backend-side).
export const CREATE_IMMEUBLE = `
  mutation CreateImmeubleEmpty($createImmeubleInput: CreateImmeubleInput!) {
    createImmeubleEmpty(createImmeubleInput: $createImmeubleInput) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      ascenseurPresent
      digitalCode
      latitude
      longitude
      createdAt
      updatedAt
    }
  }
`;

// V2 : nouvel endpoint qui ne pré-crée pas les portes du nouvel étage.
export const ADD_ETAGE_TO_IMMEUBLE = `
  mutation AddEtageEmpty($immeubleId: Int!) {
    addEtageEmpty(immeubleId: $immeubleId) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      updatedAt
    }
  }
`;

export const REMOVE_ETAGE_FROM_IMMEUBLE = `
  mutation RemoveEtageFromImmeuble($id: Int!) {
    removeEtageFromImmeuble(id: $id) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      updatedAt
    }
  }
`;

// V2 : endpoint capped avec check nbPortesParEtage.
export const ADD_PORTE_TO_ETAGE = `
  mutation AddPorteToEtageCapped($immeubleId: Int!, $etage: Int!) {
    addPorteToEtageCapped(immeubleId: $immeubleId, etage: $etage) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      updatedAt
    }
  }
`;

export const REMOVE_PORTE_FROM_ETAGE = `
  mutation RemovePorteFromEtage($immeubleId: Int!, $etage: Int!) {
    removePorteFromEtage(immeubleId: $immeubleId, etage: $etage) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      updatedAt
    }
  }
`;
