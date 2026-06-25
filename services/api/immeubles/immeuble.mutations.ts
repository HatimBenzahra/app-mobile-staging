// V2 : nouvel endpoint qui ne pré-crée pas les portes. Les anciens mobiles
// continuent d'appeler `createImmeuble` (qui reste dispo backend-side).
export const CREATE_IMMEUBLE = `
  mutation CreateImmeubleEmpty($createImmeubleInput: CreateImmeubleInput!) {
    createImmeubleEmpty(createImmeubleInput: $createImmeubleInput) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      typeHabitat
      ascenseurPresent
      digitalCode
      latitude
      longitude
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_MAISON_FROM_IMMEUBLE_INPUT = `
  mutation CreateMaisonFromImmeubleInput($createImmeubleInput: CreateImmeubleInput!) {
    createMaisonFromImmeubleInput(createImmeubleInput: $createImmeubleInput) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      typeHabitat
      ascenseurPresent
      digitalCode
      latitude
      longitude
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_QUARTIER = `
  mutation CreateQuartier($createQuartierInput: CreateQuartierInput!) {
    createQuartier(createQuartierInput: $createQuartierInput) {
      id
      nom
      latitude
      longitude
      commercialId
      managerId
      zoneId
      createdAt
      updatedAt
      immeubles {
        id
        adresse
        nbEtages
        nbPortesParEtage
        typeHabitat
        nbMaisonsPrevu
        latitude
        longitude
        quartierId
        createdAt
        updatedAt
      }
    }
  }
`;

export const UPDATE_IMMEUBLE = `
  mutation UpdateImmeuble($updateImmeubleInput: UpdateImmeubleInput!) {
    updateImmeuble(updateImmeubleInput: $updateImmeubleInput) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      typeHabitat
      nbMaisonsPrevu
      ascenseurPresent
      digitalCode
      latitude
      longitude
      quartierId
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_TERRAIN_LIEU = `
  mutation RemoveTerrainLieu($id: Int!) {
    removeTerrainLieu(id: $id) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      typeHabitat
      nbMaisonsPrevu
      latitude
      longitude
      quartierId
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
