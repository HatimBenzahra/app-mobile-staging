export const GET_ZONE_DETAIL = `
  query GetZoneDetail($id: Int!) {
    zone(id: $id) {
      id
      nom
      polygon
      xOrigin
      yOrigin
      rayon
      immeubles {
        id
        adresse
        latitude
        longitude
        typeHabitat
        portes {
          id
          numero
          etage
          statut
        }
      }
    }
  }
`;

export const ZONES_FOR_USER = `
  query ZonesForUser($userId: Int!, $userType: UserType!) {
    zonesForUser(userId: $userId, userType: $userType) {
      id
      nom
      polygon
      xOrigin
      yOrigin
      rayon
      createdAt
      assignedAt
      createdByName
      createdByType
      immeubles {
        id
        adresse
        latitude
        longitude
      }
    }
  }
`;

export const USER_ZONE_HISTORY = `
  query UserZoneHistory($userId: Int!, $userType: UserType!) {
    userZoneHistory(userId: $userId, userType: $userType) {
      id
      zoneId
      userId
      userType
      assignedAt
      unassignedAt
      totalContratsSignes
      totalImmeublesVisites
      totalRendezVousPris
      totalRefus
      totalImmeublesProspectes
      totalPortesProspectes
      zone {
        id
        nom
        polygon
        xOrigin
        yOrigin
        rayon
        createdByName
        createdByType
      }
    }
  }
`;

export const GET_ZONE_STATISTICS = `
  query GetZoneStatistics {
    zoneStatistics {
      zoneId
      zoneName
      totalContratsSignes
      totalImmeublesVisites
      totalRendezVousPris
      totalRefus
      totalImmeublesProspectes
      totalPortesProspectes
      tauxConversion
      tauxSuccesRdv
      nombreCommerciaux
      performanceGlobale
    }
  }
`;

export const CURRENT_USER_ASSIGNMENT = `
  query CurrentUserAssignment($userId: Int!, $userType: UserType!) {
    currentUserAssignment(userId: $userId, userType: $userType) {
      zoneId
      assignedAt
      zone {
        id
        nom
        xOrigin
        yOrigin
        rayon
        polygon
        createdByName
      }
    }
  }
`;

export const GET_ZONE_CURRENT_ASSIGNMENTS = `
  query GetZoneCurrentAssignments($zoneId: Int!) {
    zoneCurrentAssignments(zoneId: $zoneId) {
      id
      userId
      userType
      zoneId
      assignedAt
    }
  }
`;

export const GET_ZONE_PROSPECTIONS = `
  query GetZoneProspections($zoneId: Int!) {
    zoneProspections(zoneId: $zoneId) {
      immeubleId
      immeubleAdresse
      porteId
      porteNumero
      commercialId
      commercialNom
      managerId
      managerNom
      statut
      date
      dureeSec
    }
  }
`;
