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
