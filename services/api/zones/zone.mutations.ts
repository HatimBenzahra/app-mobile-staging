/**
 * Mutations GraphQL liées aux zones (tracé terrain manager).
 */

// Le backend force managerId pour un manager et calcule xOrigin/yOrigin/rayon
// depuis polygon → on n'envoie QUE `nom` + `polygon`.
export const CREATE_ZONE = `
  mutation CreateZone($createZoneInput: CreateZoneInput!) {
    createZone(createZoneInput: $createZoneInput) {
      id
      nom
      polygon
      xOrigin
      yOrigin
      rayon
    }
  }
`;

export const ASSIGN_ZONE_TO_COMMERCIAL = `
  mutation AssignZoneToCommercial($commercialId: Int!, $zoneId: Int!) {
    assignZoneToCommercial(commercialId: $commercialId, zoneId: $zoneId)
  }
`;
