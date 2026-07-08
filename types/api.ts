import type {
  Commercial as SchemaCommercial,
  CommercialInfo as SchemaCommercialInfo,
  CreateImmeubleInput as SchemaCreateImmeubleInput,
  CreatePorteInput as SchemaCreatePorteInput,
  Immeuble as SchemaImmeuble,
  Manager as SchemaManager,
  ManagerInfo as SchemaManagerInfo,
  Porte as SchemaPorte,
  PorteInfo as SchemaPorteInfo,
  Statistic as SchemaStatistic,
  StatusHistorique as SchemaStatusHistorique,
  TeamRanking as SchemaTeamRanking,
  UpdatePorteInput as SchemaUpdatePorteInput,
  Zone as SchemaZone,
  ZoneEnCours as SchemaZoneEnCours,
} from './graphql-schema';

export type { AssignZoneInput, InputMaybe, Maybe, Scalars, StatutPorte, UserStatus, UserType } from './graphql-schema';

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: Array<string | number>;
  }>;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}

export class ApiException extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errors?: ApiError[]
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

export type Statistic = {
  id: SchemaStatistic['id'];
  commercialId?: SchemaStatistic['commercialId'];
  managerId?: SchemaStatistic['managerId'];
  directeurId?: SchemaStatistic['directeurId'];
  immeubleId?: SchemaStatistic['immeubleId'];
  zoneId?: SchemaStatistic['zoneId'];
  contratsSignes: SchemaStatistic['contratsSignes'];
  immeublesVisites: SchemaStatistic['immeublesVisites'];
  rendezVousPris: SchemaStatistic['rendezVousPris'];
  refus: SchemaStatistic['refus'];
  absents?: SchemaStatistic['absents'];
  argumentes?: SchemaStatistic['argumentes'];
  nbImmeublesProspectes?: SchemaStatistic['nbImmeublesProspectes'];
  nbPortesProspectes?: SchemaStatistic['nbPortesProspectes'];
  createdAt?: SchemaStatistic['createdAt'];
  updatedAt?: SchemaStatistic['updatedAt'];
};

export type TimelinePoint = {
  date: string;
  rdvPris: number;
  portesProspectees: number;
  contratsSignes: number;
  refus: number;
  absents: number;
  argumentes: number;
};

export type Zone = {
  id: SchemaZone['id'];
  nom: SchemaZone['nom'];
  xOrigin: SchemaZone['xOrigin'];
  yOrigin: SchemaZone['yOrigin'];
  rayon: SchemaZone['rayon'];
  // Anneau fermé [[lng,lat],…] (JSON scalar côté schéma). Nullable.
  polygon?: number[][] | null;
  // Date de création (tri « Récent »). Optionnel : certaines sources de zones
  // (profil manager) ne la remontent pas.
  createdAt?: SchemaZone['createdAt'];
  // Date d'assignation de l'utilisateur à la zone (filtre « Date d'assignation »).
  // Nullable : une zone peut n'avoir jamais été assignée.
  assignedAt?: SchemaZone['assignedAt'];
  // Créateur de la zone (affiché en lecture seule dans le modal « Mes zones »).
  // Optionnel : seules les requêtes qui le sélectionnent le remontent.
  createdByName?: SchemaZone['createdByName'];
  createdByType?: SchemaZone['createdByType'];
};

export type ZoneEnCours = {
  id: SchemaZoneEnCours['id'];
  zoneId: SchemaZoneEnCours['zoneId'];
  userId: SchemaZoneEnCours['userId'];
  userType: SchemaZoneEnCours['userType'];
  assignedAt: SchemaZoneEnCours['assignedAt'];
};

// Création d'une zone (tracé terrain manager). Le backend force managerId et
// calcule xOrigin/yOrigin/rayon depuis polygon → on n'envoie QUE nom + polygon.
export type CreateZoneInput = {
  nom: string;
  polygon: number[][];
};

export type Porte = {
  id: SchemaPorte['id'];
  numero: SchemaPorte['numero'];
  nomPersonnalise?: SchemaPorte['nomPersonnalise'];
  etage: SchemaPorte['etage'];
  immeubleId: SchemaPorte['immeubleId'];
  statut: SchemaPorte['statut'] | string;
  nbRepassages?: SchemaPorte['nbRepassages'] | null;
  nbContrats?: SchemaPorte['nbContrats'] | null;
  rdvDate?: SchemaPorte['rdvDate'];
  rdvTime?: SchemaPorte['rdvTime'];
  commentaire?: SchemaPorte['commentaire'];
  derniereVisite?: SchemaPorte['derniereVisite'];
  duree?: SchemaPorte['duree'];
};

export type CreatePorteInput = {
  numero: SchemaCreatePorteInput['numero'];
  nomPersonnalise?: SchemaCreatePorteInput['nomPersonnalise'];
  etage: SchemaCreatePorteInput['etage'];
  immeubleId: SchemaCreatePorteInput['immeubleId'];
  statut?: SchemaCreatePorteInput['statut'] | string;
  nbRepassages?: SchemaCreatePorteInput['nbRepassages'] | null;
  nbContrats?: SchemaCreatePorteInput['nbContrats'] | null;
  rdvDate?: SchemaCreatePorteInput['rdvDate'];
  rdvTime?: SchemaCreatePorteInput['rdvTime'];
  commentaire?: SchemaCreatePorteInput['commentaire'];
  derniereVisite?: SchemaCreatePorteInput['derniereVisite'];
};

export type Immeuble = {
  id: SchemaImmeuble['id'];
  adresse: SchemaImmeuble['adresse'];
  nbEtages: SchemaImmeuble['nbEtages'];
  nbPortesParEtage: SchemaImmeuble['nbPortesParEtage'];
  typeHabitat?: TypeHabitat;
  quartierId?: number | null;
  nbMaisonsPrevu?: number | null;
  latitude?: SchemaImmeuble['latitude'];
  longitude?: SchemaImmeuble['longitude'];
  updatedAt?: SchemaImmeuble['updatedAt'];
  ascenseurPresent?: SchemaImmeuble['ascenseurPresent'] | null;
  digitalCode?: SchemaImmeuble['digitalCode'];
  commercialId?: SchemaImmeuble['commercialId'];
  managerId?: SchemaImmeuble['managerId'];
  zoneId?: SchemaImmeuble['zoneId'];
  portes?: Porte[];
  /** Stamped client-side: who owns this building on the field map. */
  ownership?: "MINE" | "TEAM";
  /** Stamped client-side for TEAM buildings: parent commercial display name. */
  creatorName?: string;
};

export type ImmeubleProgressFilter =
  | "ALL"
  | "INCOMPLETE"
  | "LOW"
  | "MID"
  | "HIGH"
  | "COMPLETE";

export type ImmeublesPageInput = {
  cursor?: string | null;
  limit?: number;
  search?: string | null;
  typeHabitat?: TypeHabitat | null;
  progress?: ImmeubleProgressFilter;
};

export type ImmeublesPageSummary = {
  coveragePercent: number;
  standaloneCount: number;
};

export type ImmeublesPage = {
  items: Immeuble[];
  nextCursor?: string | null;
  hasMore: boolean;
  totalCount: number;
  summary: ImmeublesPageSummary;
};

export type CommercialInfo = {
  id: SchemaCommercialInfo['id'];
  nom: SchemaCommercialInfo['nom'];
  prenom: SchemaCommercialInfo['prenom'];
};

export type ManagerInfo = {
  id: SchemaManagerInfo['id'];
  nom: SchemaManagerInfo['nom'];
  prenom: SchemaManagerInfo['prenom'];
};

export type PorteInfo = {
  id: SchemaPorteInfo['id'];
  numero: SchemaPorteInfo['numero'];
  etage: SchemaPorteInfo['etage'];
};

export type StatusHistorique = {
  id: SchemaStatusHistorique['id'];
  porteId: SchemaStatusHistorique['porteId'];
  commercialId?: SchemaStatusHistorique['commercialId'];
  managerId?: SchemaStatusHistorique['managerId'];
  statut: SchemaStatusHistorique['statut'] | string;
  commentaire?: SchemaStatusHistorique['commentaire'];
  rdvDate?: SchemaStatusHistorique['rdvDate'];
  rdvTime?: SchemaStatusHistorique['rdvTime'];
  createdAt: SchemaStatusHistorique['createdAt'];
  porte?: PorteInfo | null;
  commercial?: CommercialInfo | null;
  manager?: ManagerInfo | null;
};

export type CreateImmeubleInput = {
  adresse: SchemaCreateImmeubleInput['adresse'];
  nbEtages: SchemaCreateImmeubleInput['nbEtages'];
  nbPortesParEtage: SchemaCreateImmeubleInput['nbPortesParEtage'];
  typeHabitat?: TypeHabitat;
  quartierId?: number | null;
  nbMaisonsPrevu?: number | null;
  commercialId?: SchemaCreateImmeubleInput['commercialId'];
  managerId?: SchemaCreateImmeubleInput['managerId'];
  zoneId?: SchemaCreateImmeubleInput['zoneId'];
  ascenseurPresent?: SchemaCreateImmeubleInput['ascenseurPresent'] | null;
  digitalCode?: SchemaCreateImmeubleInput['digitalCode'];
  latitude?: SchemaCreateImmeubleInput['latitude'];
  longitude?: SchemaCreateImmeubleInput['longitude'];
};

export type TypeHabitat = "IMMEUBLE" | "MAISON" | "PAVILLON";

export type UpdateImmeubleInput = {
  id: number;
  adresse?: string;
  latitude?: number | null;
  longitude?: number | null;
  typeHabitat?: TypeHabitat;
  nbEtages?: number;
  nbPortesParEtage?: number;
  quartierId?: number | null;
  nbMaisonsPrevu?: number | null;
  ascenseurPresent?: boolean | null;
  digitalCode?: string | null;
  commercialId?: number | null;
  managerId?: number | null;
  zoneId?: number | null;
};

export type Quartier = {
  id: number;
  nom: string;
  latitude?: number | null;
  longitude?: number | null;
  commercialId?: number | null;
  managerId?: number | null;
  zoneId?: number | null;
  immeubles?: Immeuble[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateQuartierPointInput = {
  adresse: string;
  latitude: number;
  longitude: number;
  typeHabitat: TypeHabitat;
  nbEtages?: number;
  nbPortesParEtage?: number;
  nbMaisonsPrevu?: number;
};

export type CreateQuartierInput = {
  nom?: string;
  commercialId?: number;
  managerId?: number;
  zoneId?: number;
  points: CreateQuartierPointInput[];
};

export type Commercial = {
  id: SchemaCommercial['id'];
  nom: SchemaCommercial['nom'];
  prenom: SchemaCommercial['prenom'];
  email?: SchemaCommercial['email'] | null;
  numTel?: SchemaCommercial['numTel'];
  managerId?: SchemaCommercial['managerId'];
  immeubles?: Immeuble[];
  statistics?: Statistic[];
  zones?: Zone[];
};

export type Manager = {
  id: SchemaManager['id'];
  nom: SchemaManager['nom'];
  prenom: SchemaManager['prenom'];
  email?: SchemaManager['email'];
  numTelephone?: SchemaManager['numTelephone'];
  immeubles?: Immeuble[];
  statistics?: Statistic[];
  personalStatistics?: Statistic[];
  commercials?: Commercial[];
  teamStatistics?: Statistic[];
  zones?: Zone[];
};

export type CommercialTeamRanking = {
  position: SchemaTeamRanking['position'];
  total: SchemaTeamRanking['total'];
  points: SchemaTeamRanking['points'];
  trend?: SchemaTeamRanking['trend'];
  managerNom?: SchemaTeamRanking['managerNom'];
  managerPrenom?: SchemaTeamRanking['managerPrenom'];
  managerEmail?: SchemaTeamRanking['managerEmail'];
  managerNumTel?: SchemaTeamRanking['managerNumTel'];
};

// GPS position reporting. Not present in the generated schema yet (codegen is
// types-only against the current SDL); typed manually to match the fixed
// backend contract: input ReportPositionInput / mutation reportMyPositions.
export type ReportPositionInput = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  batteryLevel?: number | null;
  // ISO-8601 string (GraphQL DateTime scalar).
  recordedAt?: string | null;
};

export type UpdatePorteInput = {
  id: SchemaUpdatePorteInput['id'];
  numero?: SchemaUpdatePorteInput['numero'];
  nomPersonnalise?: SchemaUpdatePorteInput['nomPersonnalise'];
  etage?: SchemaUpdatePorteInput['etage'];
  statut?: SchemaUpdatePorteInput['statut'] | string;
  nbRepassages?: SchemaUpdatePorteInput['nbRepassages'] | null;
  nbContrats?: SchemaUpdatePorteInput['nbContrats'] | null;
  rdvDate?: SchemaUpdatePorteInput['rdvDate'];
  rdvTime?: SchemaUpdatePorteInput['rdvTime'];
  commentaire?: SchemaUpdatePorteInput['commentaire'];
  derniereVisite?: SchemaUpdatePorteInput['derniereVisite'];
  duree?: SchemaUpdatePorteInput['duree'];
};
