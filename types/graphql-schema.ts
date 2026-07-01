export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
};

export type AcquiscanAddress = {
  __typename?: 'AcquiscanAddress';
  addrNomCommune?: Maybe<Scalars['String']['output']>;
  addrNomVoie?: Maybe<Scalars['String']['output']>;
  addrNumero?: Maybe<Scalars['String']['output']>;
  anneeFt?: Maybe<Scalars['String']['output']>;
  codeInsee?: Maybe<Scalars['String']['output']>;
  coordinates?: Maybe<AcquiscanCoordinate>;
  eligFo?: Maybe<Scalars['String']['output']>;
  fermetureComAddr?: Maybe<Scalars['String']['output']>;
  fermetureComZone?: Maybe<Scalars['String']['output']>;
  fermetureTechnique?: Maybe<Scalars['String']['output']>;
  hasCoordinates: Scalars['Boolean']['output'];
  imbCode?: Maybe<Scalars['String']['output']>;
  immeubleId: Scalars['String']['output'];
  nbrLogements?: Maybe<Scalars['String']['output']>;
  sites4g?: Maybe<Scalars['Int']['output']>;
  sites5g?: Maybe<Scalars['Int']['output']>;
  sitesTotal?: Maybe<Scalars['Int']['output']>;
};

export type AcquiscanAddressSearchInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};

export type AcquiscanAddressSuggestion = {
  __typename?: 'AcquiscanAddressSuggestion';
  city?: Maybe<Scalars['String']['output']>;
  codeInsee?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  postcode?: Maybe<Scalars['String']['output']>;
  score?: Maybe<Scalars['Float']['output']>;
};

export type AcquiscanAddressesInput = {
  annee?: InputMaybe<Scalars['String']['input']>;
  commune?: InputMaybe<Scalars['String']['input']>;
  coverage4g?: InputMaybe<Scalars['String']['input']>;
  coverage5g?: InputMaybe<Scalars['String']['input']>;
  dept: Scalars['String']['input'];
  enrichCoordinates?: InputMaybe<Scalars['Boolean']['input']>;
  fiber?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  segment?: InputMaybe<Scalars['String']['input']>;
};

export type AcquiscanAddressesPage = {
  __typename?: 'AcquiscanAddressesPage';
  enrichedCount: Scalars['Int']['output'];
  importStatus: AcquiscanImportStatus;
  rows: Array<AcquiscanAddress>;
  total: Scalars['Int']['output'];
};

export type AcquiscanBoundsInput = {
  east: Scalars['Float']['input'];
  north: Scalars['Float']['input'];
  south: Scalars['Float']['input'];
  west: Scalars['Float']['input'];
};

export type AcquiscanCommuneOpportunitiesInput = {
  dept: Scalars['String']['input'];
};

export type AcquiscanCommuneOpportunitiesPage = {
  __typename?: 'AcquiscanCommuneOpportunitiesPage';
  rows: Array<AcquiscanCommuneOpportunity>;
  summary: AcquiscanOpportunitySummary;
};

export type AcquiscanCommuneOpportunity = {
  __typename?: 'AcquiscanCommuneOpportunity';
  codeDept: Scalars['String']['output'];
  codeInsee: Scalars['String']['output'];
  nomCommune?: Maybe<Scalars['String']['output']>;
  summary: AcquiscanOpportunitySummary;
};

export type AcquiscanCoordinate = {
  __typename?: 'AcquiscanCoordinate';
  imbX?: Maybe<Scalars['Float']['output']>;
  imbY?: Maybe<Scalars['Float']['output']>;
  latitude?: Maybe<Scalars['Float']['output']>;
  longitude?: Maybe<Scalars['Float']['output']>;
  matchKey?: Maybe<Scalars['String']['output']>;
  source?: Maybe<Scalars['String']['output']>;
};

export type AcquiscanCopperBuildingOpportunity = {
  __typename?: 'AcquiscanCopperBuildingOpportunity';
  addrNomCommune?: Maybe<Scalars['String']['output']>;
  addrNomVoie?: Maybe<Scalars['String']['output']>;
  addrNumero?: Maybe<Scalars['String']['output']>;
  anneeFt?: Maybe<Scalars['String']['output']>;
  codeInsee?: Maybe<Scalars['String']['output']>;
  coordinates?: Maybe<AcquiscanCoordinate>;
  eligFo?: Maybe<Scalars['String']['output']>;
  fermetureComAddr?: Maybe<Scalars['String']['output']>;
  fermetureComZone?: Maybe<Scalars['String']['output']>;
  fermetureTechnique?: Maybe<Scalars['String']['output']>;
  hasCoordinates: Scalars['Boolean']['output'];
  imbCode?: Maybe<Scalars['String']['output']>;
  immeubleId: Scalars['String']['output'];
  nbrLogements?: Maybe<Scalars['String']['output']>;
  opportunityLabel: Scalars['String']['output'];
  opportunityScore: Scalars['Int']['output'];
  sites4g?: Maybe<Scalars['Int']['output']>;
  sites5g?: Maybe<Scalars['Int']['output']>;
  sitesTotal?: Maybe<Scalars['Int']['output']>;
};

export type AcquiscanCopperBuildingsInput = {
  annee?: InputMaybe<Scalars['String']['input']>;
  commune?: InputMaybe<Scalars['String']['input']>;
  coverage4g?: InputMaybe<Scalars['String']['input']>;
  coverage5g?: InputMaybe<Scalars['String']['input']>;
  dept: Scalars['String']['input'];
  fiber?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  segment?: InputMaybe<Scalars['String']['input']>;
};

export type AcquiscanCopperBuildingsPage = {
  __typename?: 'AcquiscanCopperBuildingsPage';
  limit: Scalars['Int']['output'];
  offset: Scalars['Int']['output'];
  rows: Array<AcquiscanCopperBuildingOpportunity>;
  total: Scalars['Int']['output'];
};

export type AcquiscanDepartmentCoverage = {
  __typename?: 'AcquiscanDepartmentCoverage';
  dept: Scalars['String']['output'];
  importedAt?: Maybe<Scalars['DateTime']['output']>;
  importedCount: Scalars['Int']['output'];
};

export type AcquiscanDepartmentOpportunitiesPage = {
  __typename?: 'AcquiscanDepartmentOpportunitiesPage';
  rows: Array<AcquiscanDepartmentOpportunity>;
  summary: AcquiscanOpportunitySummary;
};

export type AcquiscanDepartmentOpportunity = {
  __typename?: 'AcquiscanDepartmentOpportunity';
  codeDept: Scalars['String']['output'];
  summary: AcquiscanOpportunitySummary;
};

export type AcquiscanImportStatus = {
  __typename?: 'AcquiscanImportStatus';
  dept: Scalars['String']['output'];
  importedAt?: Maybe<Scalars['DateTime']['output']>;
  importedCount: Scalars['Float']['output'];
  isImported: Scalars['Boolean']['output'];
};

export type AcquiscanMapCluster = {
  __typename?: 'AcquiscanMapCluster';
  count: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
};

export type AcquiscanMapInput = {
  annee?: InputMaybe<Scalars['String']['input']>;
  bounds: AcquiscanBoundsInput;
  cluster?: InputMaybe<Scalars['Boolean']['input']>;
  commune?: InputMaybe<Scalars['String']['input']>;
  coverage4g?: InputMaybe<Scalars['String']['input']>;
  coverage5g?: InputMaybe<Scalars['String']['input']>;
  dept?: InputMaybe<Scalars['String']['input']>;
  fiber?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  segment?: InputMaybe<Scalars['String']['input']>;
  zoom: Scalars['Float']['input'];
};

export type AcquiscanMapPoint = {
  __typename?: 'AcquiscanMapPoint';
  addrNomCommune?: Maybe<Scalars['String']['output']>;
  addrNomVoie?: Maybe<Scalars['String']['output']>;
  addrNumero?: Maybe<Scalars['String']['output']>;
  anneeFt?: Maybe<Scalars['String']['output']>;
  codeInsee?: Maybe<Scalars['String']['output']>;
  dept: Scalars['String']['output'];
  eligFo?: Maybe<Scalars['String']['output']>;
  fermetureComAddr?: Maybe<Scalars['String']['output']>;
  fermetureComZone?: Maybe<Scalars['String']['output']>;
  fermetureTechnique?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  imbCode?: Maybe<Scalars['String']['output']>;
  immeubleId: Scalars['String']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  nbrLogements?: Maybe<Scalars['String']['output']>;
  sites4g?: Maybe<Scalars['Int']['output']>;
  sites5g?: Maybe<Scalars['Int']['output']>;
  sitesTotal?: Maybe<Scalars['Int']['output']>;
};

export type AcquiscanMapResult = {
  __typename?: 'AcquiscanMapResult';
  clustered: Scalars['Boolean']['output'];
  clusters: Array<AcquiscanMapCluster>;
  coverage: Array<AcquiscanDepartmentCoverage>;
  points: Array<AcquiscanMapPoint>;
  returnedCount: Scalars['Int']['output'];
  tooManyResults: Scalars['Boolean']['output'];
  totalInBounds: Scalars['Int']['output'];
};

export type AcquiscanOpportunitySummary = {
  __typename?: 'AcquiscanOpportunitySummary';
  closestShutdownYear?: Maybe<Scalars['Int']['output']>;
  copperBuildings: Scalars['Int']['output'];
  copperShutdown: Scalars['Int']['output'];
  copperShutdownRate: Scalars['Float']['output'];
  fiberBuildings: Scalars['Int']['output'];
  fiberRate: Scalars['Float']['output'];
  opportunityScore: Scalars['Int']['output'];
  sites4g: Scalars['Int']['output'];
  sites5g: Scalars['Int']['output'];
  sitesTotal: Scalars['Int']['output'];
  totalBuildings: Scalars['Int']['output'];
};

export type AcquiscanTerritoryGeoJsonInput = {
  dept?: InputMaybe<Scalars['String']['input']>;
  deptName?: InputMaybe<Scalars['String']['input']>;
  level: Scalars['String']['input'];
};

export type AcquiscanZonePreviewInput = {
  annee?: InputMaybe<Scalars['String']['input']>;
  commune?: InputMaybe<Scalars['String']['input']>;
  coverage4g?: InputMaybe<Scalars['String']['input']>;
  coverage5g?: InputMaybe<Scalars['String']['input']>;
  dept?: InputMaybe<Scalars['String']['input']>;
  fiber?: InputMaybe<Scalars['String']['input']>;
  latitude: Scalars['Float']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  longitude: Scalars['Float']['input'];
  radiusMeters: Scalars['Float']['input'];
  segment?: InputMaybe<Scalars['String']['input']>;
};

export type AcquiscanZonePreviewResult = {
  __typename?: 'AcquiscanZonePreviewResult';
  summary: AcquiscanZonePreviewSummary;
  targets: Array<AcquiscanZoneTargetPreview>;
  tooManyResults: Scalars['Boolean']['output'];
  totalInCircle: Scalars['Int']['output'];
};

export type AcquiscanZonePreviewSummary = {
  __typename?: 'AcquiscanZonePreviewSummary';
  averageOpportunityScore: Scalars['Int']['output'];
  copperClosureTargets: Scalars['Int']['output'];
  fiberTargets: Scalars['Int']['output'];
  noFiberTargets: Scalars['Int']['output'];
  strong4gTargets: Scalars['Int']['output'];
  strong5gTargets: Scalars['Int']['output'];
  totalLogements: Scalars['Int']['output'];
  totalTargets: Scalars['Int']['output'];
};

export type AcquiscanZoneTargetPreview = {
  __typename?: 'AcquiscanZoneTargetPreview';
  addrNomCommune?: Maybe<Scalars['String']['output']>;
  addrNomVoie?: Maybe<Scalars['String']['output']>;
  addrNumero?: Maybe<Scalars['String']['output']>;
  anneeFt?: Maybe<Scalars['String']['output']>;
  codeInsee?: Maybe<Scalars['String']['output']>;
  dept: Scalars['String']['output'];
  distanceMeters: Scalars['Float']['output'];
  eligFo?: Maybe<Scalars['String']['output']>;
  fermetureComAddr?: Maybe<Scalars['String']['output']>;
  fermetureComZone?: Maybe<Scalars['String']['output']>;
  fermetureTechnique?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  imbCode?: Maybe<Scalars['String']['output']>;
  immeubleId: Scalars['String']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  nbrLogements?: Maybe<Scalars['String']['output']>;
  opportunityScore: Scalars['Int']['output'];
  sites4g?: Maybe<Scalars['Int']['output']>;
  sites5g?: Maybe<Scalars['Int']['output']>;
  sitesTotal?: Maybe<Scalars['Int']['output']>;
};

export type ActiveRoom = {
  __typename?: 'ActiveRoom';
  createdAt: Scalars['DateTime']['output'];
  numParticipants: Scalars['Int']['output'];
  participantNames: Array<Scalars['String']['output']>;
  roomName: Scalars['String']['output'];
};

export type AssignZoneInput = {
  userId: Scalars['Int']['input'];
  userType: UserType;
  zoneId: Scalars['Int']['input'];
};

export type AuthResponse = {
  __typename?: 'AuthResponse';
  access_token: Scalars['String']['output'];
  email?: Maybe<Scalars['String']['output']>;
  expires_in: Scalars['Float']['output'];
  groups: Array<Scalars['String']['output']>;
  refresh_token: Scalars['String']['output'];
  role: Scalars['String']['output'];
  scope?: Maybe<Scalars['String']['output']>;
  token_type?: Maybe<Scalars['String']['output']>;
  userId: Scalars['Float']['output'];
};

export type AwardBadgeInput = {
  badgeDefinitionId: Scalars['Int']['input'];
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  metadata?: InputMaybe<Scalars['String']['input']>;
  periodKey: Scalars['String']['input'];
};

export type AwardBadgesResult = {
  __typename?: 'AwardBadgesResult';
  awarded: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  skipped: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
};

export type BackfillRecordingsInput = {
  maxObjects?: InputMaybe<Scalars['Int']['input']>;
};

export type BackfillRecordingsResult = {
  __typename?: 'BackfillRecordingsResult';
  indexed: Scalars['Int']['output'];
  scannedObjects: Scalars['Int']['output'];
  scannedRooms: Scalars['Int']['output'];
  skipped: Scalars['Int']['output'];
};

/** Catégorie de badge gamification */
export type BadgeCategory =
  | 'PERFORMANCE'
  | 'PRODUIT'
  | 'PROGRESSION'
  | 'TROPHEE';

export type BadgeDefinitionType = {
  __typename?: 'BadgeDefinitionType';
  category: BadgeCategory;
  code: Scalars['String']['output'];
  condition?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  iconUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  isActive: Scalars['Boolean']['output'];
  nom: Scalars['String']['output'];
  tier: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type BatchAwardBadgesInput = {
  awards: Array<AwardBadgeInput>;
};

export type BatchUpdateOffreBadgeProductKeyInput = {
  offres: Array<UpdateOffreBadgeProductKeyInput>;
};

export type BatchUpdateOffrePointsInput = {
  offres: Array<UpdateOffrePointsInput>;
};

export type Commercial = {
  __typename?: 'Commercial';
  age?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  directeurId?: Maybe<Scalars['Int']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  immeubles: Array<Immeuble>;
  managerId?: Maybe<Scalars['Int']['output']>;
  nom: Scalars['String']['output'];
  numTel?: Maybe<Scalars['String']['output']>;
  prenom: Scalars['String']['output'];
  statistics: Array<Statistic>;
  status: UserStatus;
  updatedAt: Scalars['DateTime']['output'];
  zones: Array<Zone>;
};

export type CommercialBadgeType = {
  __typename?: 'CommercialBadgeType';
  awardedAt: Scalars['DateTime']['output'];
  badgeDefinition?: Maybe<BadgeDefinitionType>;
  badgeDefinitionId: Scalars['Int']['output'];
  commercialId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  managerId?: Maybe<Scalars['Int']['output']>;
  metadata?: Maybe<Scalars['String']['output']>;
  periodKey: Scalars['String']['output'];
};

export type CommercialInfo = {
  __typename?: 'CommercialInfo';
  id: Scalars['Int']['output'];
  nom: Scalars['String']['output'];
  prenom: Scalars['String']['output'];
};

export type ComputeRankingInput = {
  period: RankPeriod;
  periodKey: Scalars['String']['input'];
};

export type ConfirmMappingInput = {
  mappings: Array<MappingEntry>;
};

export type ConfirmRecordingUploadInput = {
  doorSegments?: InputMaybe<Array<DoorSegmentInput>>;
  duration?: InputMaybe<Scalars['Float']['input']>;
  s3Key: Scalars['String']['input'];
};

/** Statuts de contrat inclus dans le classement ou le détail */
export type ContractRankingStatus =
  | 'RETRACTE'
  | 'SIGNE'
  | 'VALIDE';

export type ContratValideType = {
  __typename?: 'ContratValideType';
  commercialId?: Maybe<Scalars['Int']['output']>;
  commercialWinleadPlusId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  dateSignature?: Maybe<Scalars['DateTime']['output']>;
  dateValidation?: Maybe<Scalars['DateTime']['output']>;
  externalContratId: Scalars['Int']['output'];
  externalProspectId: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  managerId?: Maybe<Scalars['Int']['output']>;
  metadata?: Maybe<Scalars['String']['output']>;
  offreCategorie?: Maybe<Scalars['String']['output']>;
  offreExternalId?: Maybe<Scalars['Int']['output']>;
  offreFournisseur?: Maybe<Scalars['String']['output']>;
  offreId?: Maybe<Scalars['Int']['output']>;
  offreLogoUrl?: Maybe<Scalars['String']['output']>;
  offreNom?: Maybe<Scalars['String']['output']>;
  offrePoints?: Maybe<Scalars['Int']['output']>;
  periodDay: Scalars['String']['output'];
  periodMonth: Scalars['String']['output'];
  periodQuarter: Scalars['String']['output'];
  periodWeek: Scalars['String']['output'];
  periodYear: Scalars['String']['output'];
  statutContrat?: Maybe<Scalars['String']['output']>;
  syncedAt: Scalars['DateTime']['output'];
};

export type CreateAcquiscanZoneInput = {
  annee?: InputMaybe<Scalars['String']['input']>;
  commune?: InputMaybe<Scalars['String']['input']>;
  coverage4g?: InputMaybe<Scalars['String']['input']>;
  coverage5g?: InputMaybe<Scalars['String']['input']>;
  dept?: InputMaybe<Scalars['String']['input']>;
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  fiber?: InputMaybe<Scalars['String']['input']>;
  latitude: Scalars['Float']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  longitude: Scalars['Float']['input'];
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nom: Scalars['String']['input'];
  radiusMeters: Scalars['Float']['input'];
  segment?: InputMaybe<Scalars['String']['input']>;
  selectedImmeubleIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateBadgeDefinitionInput = {
  category: BadgeCategory;
  code: Scalars['String']['input'];
  condition?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  nom: Scalars['String']['input'];
  tier?: Scalars['Int']['input'];
};

export type CreateCommercialInput = {
  age: Scalars['Int']['input'];
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  email: Scalars['String']['input'];
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nom: Scalars['String']['input'];
  numTel: Scalars['String']['input'];
  prenom: Scalars['String']['input'];
  status?: InputMaybe<UserStatus>;
};

export type CreateDirecteurInput = {
  adresse: Scalars['String']['input'];
  email: Scalars['String']['input'];
  nom: Scalars['String']['input'];
  numTelephone: Scalars['String']['input'];
  prenom: Scalars['String']['input'];
  status?: InputMaybe<UserStatus>;
};

export type CreateImmeubleInput = {
  adresse: Scalars['String']['input'];
  ascenseurPresent: Scalars['Boolean']['input'];
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  digitalCode?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nbEtages: Scalars['Int']['input'];
  nbMaisonsPrevu?: InputMaybe<Scalars['Int']['input']>;
  nbPortesParEtage: Scalars['Int']['input'];
  quartierId?: InputMaybe<Scalars['Int']['input']>;
  typeHabitat?: InputMaybe<TypeHabitat>;
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateManagerInput = {
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  email: Scalars['String']['input'];
  nom: Scalars['String']['input'];
  numTelephone?: InputMaybe<Scalars['String']['input']>;
  prenom: Scalars['String']['input'];
  status?: InputMaybe<UserStatus>;
};

export type CreatePorteInput = {
  commentaire?: InputMaybe<Scalars['String']['input']>;
  derniereVisite?: InputMaybe<Scalars['DateTime']['input']>;
  etage: Scalars['Int']['input'];
  immeubleId: Scalars['Int']['input'];
  nbContrats?: Scalars['Int']['input'];
  nbRepassages?: Scalars['Int']['input'];
  nomPersonnalise?: InputMaybe<Scalars['String']['input']>;
  numero: Scalars['String']['input'];
  rdvDate?: InputMaybe<Scalars['DateTime']['input']>;
  rdvTime?: InputMaybe<Scalars['String']['input']>;
  statut?: StatutPorte;
};

export type CreateQuartierInput = {
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nom?: InputMaybe<Scalars['String']['input']>;
  points: Array<CreateQuartierPointInput>;
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateQuartierPointInput = {
  adresse: Scalars['String']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  nbEtages?: InputMaybe<Scalars['Int']['input']>;
  nbMaisonsPrevu?: InputMaybe<Scalars['Int']['input']>;
  nbPortesParEtage?: InputMaybe<Scalars['Int']['input']>;
  typeHabitat: TypeHabitat;
};

export type CreateStatisticInput = {
  absents: Scalars['Int']['input'];
  argumentes: Scalars['Int']['input'];
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  contratsSignes: Scalars['Int']['input'];
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  immeubleId?: InputMaybe<Scalars['Int']['input']>;
  immeublesVisites: Scalars['Int']['input'];
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nbImmeublesProspectes: Scalars['Int']['input'];
  nbPortesProspectes: Scalars['Int']['input'];
  refus: Scalars['Int']['input'];
  rendezVousPris: Scalars['Int']['input'];
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateZoneInput = {
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nom: Scalars['String']['input'];
  rayon: Scalars['Float']['input'];
  xOrigin: Scalars['Float']['input'];
  yOrigin: Scalars['Float']['input'];
};

export type CreerUtilisateurInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  nom: Scalars['String']['input'];
  prenom: Scalars['String']['input'];
  role: RoleUtilisateur;
};

export type Directeur = {
  __typename?: 'Directeur';
  adresse?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  nom: Scalars['String']['output'];
  numTelephone?: Maybe<Scalars['String']['output']>;
  prenom: Scalars['String']['output'];
  statistics?: Maybe<Array<Statistic>>;
  status: UserStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type DoorSegmentInput = {
  endTime: Scalars['Float']['input'];
  etage: Scalars['Int']['input'];
  numero: Scalars['String']['input'];
  porteId: Scalars['Int']['input'];
  startTime: Scalars['Float']['input'];
  statut?: InputMaybe<Scalars['String']['input']>;
};

export type EgressState = {
  __typename?: 'EgressState';
  egressId: Scalars['String']['output'];
  error?: Maybe<Scalars['String']['output']>;
  roomName?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type EtageInStatistics = {
  __typename?: 'EtageInStatistics';
  count: Scalars['Int']['output'];
  etage: Scalars['Int']['output'];
};

export type ExtractionProgressDto = {
  __typename?: 'ExtractionProgressDto';
  current: Scalars['Int']['output'];
  step: Scalars['String']['output'];
  total: Scalars['Int']['output'];
};

export type ExtractionQueueItemDto = {
  __typename?: 'ExtractionQueueItemDto';
  current: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  step: Scalars['String']['output'];
  total: Scalars['Int']['output'];
};

export type GlobalSearchResult = {
  __typename?: 'GlobalSearchResult';
  groups: Array<SearchResultGroup>;
  totalCount: Scalars['Int']['output'];
};

export type GpsHistoryResponse = {
  __typename?: 'GpsHistoryResponse';
  positions: Array<GpsPosition>;
  total: Scalars['Int']['output'];
};

export type GpsPosition = {
  __typename?: 'GpsPosition';
  accuracy?: Maybe<Scalars['Float']['output']>;
  batteryLevel?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deviceId: Scalars['String']['output'];
  deviceName?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  isOnline: Scalars['Boolean']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  recordedAt: Scalars['DateTime']['output'];
};

export type GpsPositionInput = {
  accuracy?: InputMaybe<Scalars['Float']['input']>;
  batteryLevel?: InputMaybe<Scalars['Int']['input']>;
  deviceId: Scalars['String']['input'];
  deviceName?: InputMaybe<Scalars['String']['input']>;
  isOnline?: InputMaybe<Scalars['Boolean']['input']>;
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
};

export type HistoriqueZone = {
  __typename?: 'HistoriqueZone';
  assignedAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  totalContratsSignes: Scalars['Int']['output'];
  totalImmeublesProspectes: Scalars['Int']['output'];
  totalImmeublesVisites: Scalars['Int']['output'];
  totalPortesProspectes: Scalars['Int']['output'];
  totalRefus: Scalars['Int']['output'];
  totalRendezVousPris: Scalars['Int']['output'];
  unassignedAt: Scalars['DateTime']['output'];
  userId: Scalars['Int']['output'];
  userType: UserType;
  zone?: Maybe<Zone>;
  zoneId: Scalars['Int']['output'];
};

export type Immeuble = {
  __typename?: 'Immeuble';
  adresse: Scalars['String']['output'];
  ascenseurPresent: Scalars['Boolean']['output'];
  commercialId?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  digitalCode?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  latitude?: Maybe<Scalars['Float']['output']>;
  longitude?: Maybe<Scalars['Float']['output']>;
  managerId?: Maybe<Scalars['Int']['output']>;
  nbEtages: Scalars['Int']['output'];
  nbMaisonsPrevu?: Maybe<Scalars['Int']['output']>;
  nbPortesParEtage: Scalars['Int']['output'];
  portes?: Maybe<Array<Porte>>;
  quartierId?: Maybe<Scalars['Int']['output']>;
  typeHabitat: TypeHabitat;
  updatedAt: Scalars['DateTime']['output'];
  zoneId?: Maybe<Scalars['Int']['output']>;
};

export type ListRecentRecordingsInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type LiveKitConnectionDetails = {
  __typename?: 'LiveKitConnectionDetails';
  participantName: Scalars['String']['output'];
  participantToken: Scalars['String']['output'];
  roomName: Scalars['String']['output'];
  serverUrl: Scalars['String']['output'];
};

export type LoginInput = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type Manager = {
  __typename?: 'Manager';
  commercials?: Maybe<Array<Commercial>>;
  createdAt: Scalars['DateTime']['output'];
  directeur?: Maybe<Directeur>;
  directeurId?: Maybe<Scalars['Int']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  immeubles?: Maybe<Array<Immeuble>>;
  nom: Scalars['String']['output'];
  numTelephone?: Maybe<Scalars['String']['output']>;
  personalStatistics?: Maybe<Array<Statistic>>;
  prenom: Scalars['String']['output'];
  statistics?: Maybe<Array<Statistic>>;
  status: UserStatus;
  teamStatistics?: Maybe<Array<Statistic>>;
  updatedAt: Scalars['DateTime']['output'];
  zones?: Maybe<Array<Zone>>;
};

export type ManagerInfo = {
  __typename?: 'ManagerInfo';
  id: Scalars['Int']['output'];
  nom: Scalars['String']['output'];
  prenom: Scalars['String']['output'];
};

export type MappingEntry = {
  prowinId: Scalars['Int']['input'];
  type: Scalars['String']['input'];
  winleadPlusId: Scalars['String']['input'];
};

export type MappingResult = {
  __typename?: 'MappingResult';
  mapped: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  skipped: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type MappingSuggestion = {
  __typename?: 'MappingSuggestion';
  alreadyMapped: Scalars['Boolean']['output'];
  confidence?: Maybe<Scalars['Int']['output']>;
  prowinEmail?: Maybe<Scalars['String']['output']>;
  prowinId: Scalars['Int']['output'];
  prowinNom: Scalars['String']['output'];
  prowinPrenom: Scalars['String']['output'];
  prowinType: Scalars['String']['output'];
  winleadPlusEmail?: Maybe<Scalars['String']['output']>;
  winleadPlusId?: Maybe<Scalars['String']['output']>;
  winleadPlusNom?: Maybe<Scalars['String']['output']>;
  winleadPlusPrenom?: Maybe<Scalars['String']['output']>;
};

export type ModifierUtilisateurInput = {
  email: Scalars['String']['input'];
  nouveauMotDePasse: Scalars['String']['input'];
};

export type MonitoringSession = {
  __typename?: 'MonitoringSession';
  endedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  participantToken?: Maybe<Scalars['String']['output']>;
  roomName: Scalars['String']['output'];
  startedAt: Scalars['DateTime']['output'];
  status: MonitoringStatus;
  supervisorId: Scalars['Int']['output'];
  userId: Scalars['Int']['output'];
  userType: Scalars['String']['output'];
};

export type MonitoringStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'STOPPED';

export type Mutation = {
  __typename?: 'Mutation';
  addEtageEmpty: Immeuble;
  addEtageToImmeuble: Immeuble;
  addPorteToEtage: Immeuble;
  addPorteToEtageCapped: Immeuble;
  assignZoneToCommercial: Scalars['Boolean']['output'];
  assignZoneToDirecteur: Scalars['Boolean']['output'];
  assignZoneToManager: Scalars['Boolean']['output'];
  assignZoneToUser: ZoneEnCours;
  awardBadge: AwardBadgesResult;
  backfillRecordingsIndex: BackfillRecordingsResult;
  batchAwardBadges: AwardBadgesResult;
  batchUpdateOffreBadgeProductKey: MappingResult;
  batchUpdateOffrePoints: MappingResult;
  computeRanking: MappingResult;
  confirmMapping: MappingResult;
  confirmRecordingUpload: RecordingItem;
  createAcquiscanZone: Zone;
  createBadgeDefinition: BadgeDefinitionType;
  createCommercial: Commercial;
  createDirecteur: Directeur;
  createImmeuble: Immeuble;
  createImmeubleEmpty: Immeuble;
  createMaisonFromImmeubleInput: Immeuble;
  createManager: Manager;
  createPorte: Porte;
  createPorteCapped: Porte;
  createPortesForImmeuble: Scalars['Boolean']['output'];
  createQuartier: Quartier;
  createStatistic: Statistic;
  createZone: Zone;
  creerUtilisateurProWin: ReponseCreationUtilisateur;
  evaluateBadges: AwardBadgesResult;
  evaluateConversionRanking: AwardBadgesResult;
  evaluatePerformanceRanking: AwardBadgesResult;
  evaluateTransformationRanking: AwardBadgesResult;
  evaluateTrophees: AwardBadgesResult;
  generateCommercialToken: LiveKitConnectionDetails;
  generateManagerToken: LiveKitConnectionDetails;
  logAudioEvent: Scalars['Boolean']['output'];
  login: AuthResponse;
  modifierUtilisateur: ReponseModifierUtilisateur;
  recalculateAllStats: Scalars['String']['output'];
  refreshToken: AuthResponse;
  removeCommercial: Commercial;
  removeDirecteur: Directeur;
  removeEtageFromImmeuble: Immeuble;
  removeImmeuble: Immeuble;
  removeManager: Manager;
  removeMapping: MappingResult;
  removePorte: Porte;
  removePorteFromEtage: Immeuble;
  removeRecordingSegmentsToday: Scalars['Int']['output'];
  removeStatistic: Statistic;
  removeTerrainLieu: Immeuble;
  removeZone: Zone;
  requestRecordingUpload: RecordingUploadDetails;
  resetS3Diagnostics: S3DiagnosticsSnapshot;
  revokeBadge: MappingResult;
  saveGpsPositions: SaveGpsPositionsResponse;
  seedBadges: SeedBadgesResult;
  startMonitoring: LiveKitConnectionDetails;
  startRecording: RecordingResult;
  stopMonitoring: Scalars['Boolean']['output'];
  stopRecording: Scalars['Boolean']['output'];
  supprimerUtilisateur: ReponseSupprimerUtilisateur;
  syncCommercialStats: Scalars['String']['output'];
  syncContrats: SyncContratsResult;
  syncManagerStats: Scalars['String']['output'];
  syncOffres: SyncOffresResult;
  triggerBatchExtraction: Scalars['Int']['output'];
  triggerConversationExtraction: Scalars['Boolean']['output'];
  unassignUser: Scalars['Boolean']['output'];
  unassignZoneFromCommercial: Scalars['Boolean']['output'];
  updateBadgeDefinition: BadgeDefinitionType;
  updateCommercial: Commercial;
  updateDirecteur: Directeur;
  updateImmeuble: Immeuble;
  updateManager: Manager;
  updateOffreBadgeProductKey: Offre;
  updateOffrePoints: Offre;
  updatePorte: Porte;
  updateStatistic: Statistic;
  updateZone: Zone;
};


export type MutationAddEtageEmptyArgs = {
  immeubleId: Scalars['Int']['input'];
};


export type MutationAddEtageToImmeubleArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAddPorteToEtageArgs = {
  etage: Scalars['Int']['input'];
  immeubleId: Scalars['Int']['input'];
};


export type MutationAddPorteToEtageCappedArgs = {
  etage: Scalars['Int']['input'];
  immeubleId: Scalars['Int']['input'];
};


export type MutationAssignZoneToCommercialArgs = {
  commercialId: Scalars['Int']['input'];
  zoneId: Scalars['Int']['input'];
};


export type MutationAssignZoneToDirecteurArgs = {
  directeurId: Scalars['Int']['input'];
  zoneId: Scalars['Int']['input'];
};


export type MutationAssignZoneToManagerArgs = {
  managerId: Scalars['Int']['input'];
  zoneId: Scalars['Int']['input'];
};


export type MutationAssignZoneToUserArgs = {
  input: AssignZoneInput;
};


export type MutationAwardBadgeArgs = {
  input: AwardBadgeInput;
};


export type MutationBackfillRecordingsIndexArgs = {
  input: BackfillRecordingsInput;
};


export type MutationBatchAwardBadgesArgs = {
  input: BatchAwardBadgesInput;
};


export type MutationBatchUpdateOffreBadgeProductKeyArgs = {
  input: BatchUpdateOffreBadgeProductKeyInput;
};


export type MutationBatchUpdateOffrePointsArgs = {
  input: BatchUpdateOffrePointsInput;
};


export type MutationComputeRankingArgs = {
  input: ComputeRankingInput;
};


export type MutationConfirmMappingArgs = {
  input: ConfirmMappingInput;
};


export type MutationConfirmRecordingUploadArgs = {
  input: ConfirmRecordingUploadInput;
};


export type MutationCreateAcquiscanZoneArgs = {
  input: CreateAcquiscanZoneInput;
};


export type MutationCreateBadgeDefinitionArgs = {
  input: CreateBadgeDefinitionInput;
};


export type MutationCreateCommercialArgs = {
  createCommercialInput: CreateCommercialInput;
};


export type MutationCreateDirecteurArgs = {
  createDirecteurInput: CreateDirecteurInput;
};


export type MutationCreateImmeubleArgs = {
  createImmeubleInput: CreateImmeubleInput;
};


export type MutationCreateImmeubleEmptyArgs = {
  createImmeubleInput: CreateImmeubleInput;
};


export type MutationCreateMaisonFromImmeubleInputArgs = {
  createImmeubleInput: CreateImmeubleInput;
};


export type MutationCreateManagerArgs = {
  createManagerInput: CreateManagerInput;
};


export type MutationCreatePorteArgs = {
  createPorteInput: CreatePorteInput;
};


export type MutationCreatePorteCappedArgs = {
  createPorteInput: CreatePorteInput;
};


export type MutationCreatePortesForImmeubleArgs = {
  immeubleId: Scalars['Int']['input'];
  nbEtages: Scalars['Int']['input'];
  nbPortesParEtage: Scalars['Int']['input'];
};


export type MutationCreateQuartierArgs = {
  createQuartierInput: CreateQuartierInput;
};


export type MutationCreateStatisticArgs = {
  createStatisticInput: CreateStatisticInput;
};


export type MutationCreateZoneArgs = {
  createZoneInput: CreateZoneInput;
};


export type MutationCreerUtilisateurProWinArgs = {
  input: CreerUtilisateurInput;
};


export type MutationEvaluateConversionRankingArgs = {
  weekKey: Scalars['String']['input'];
};


export type MutationEvaluatePerformanceRankingArgs = {
  month: Scalars['String']['input'];
};


export type MutationEvaluateTransformationRankingArgs = {
  month: Scalars['String']['input'];
};


export type MutationEvaluateTropheesArgs = {
  quarter: Scalars['String']['input'];
};


export type MutationGenerateCommercialTokenArgs = {
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  roomName?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGenerateManagerTokenArgs = {
  managerId?: InputMaybe<Scalars['Int']['input']>;
  roomName?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLogAudioEventArgs = {
  details?: InputMaybe<Scalars['String']['input']>;
  eventType: Scalars['String']['input'];
  message: Scalars['String']['input'];
};


export type MutationLoginArgs = {
  loginInput: LoginInput;
};


export type MutationModifierUtilisateurArgs = {
  input: ModifierUtilisateurInput;
};


export type MutationRefreshTokenArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationRemoveCommercialArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveDirecteurArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveEtageFromImmeubleArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveImmeubleArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveManagerArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveMappingArgs = {
  input: RemoveMappingInput;
};


export type MutationRemovePorteArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemovePorteFromEtageArgs = {
  etage: Scalars['Int']['input'];
  immeubleId: Scalars['Int']['input'];
};


export type MutationRemoveRecordingSegmentsTodayArgs = {
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  limit?: Scalars['Int']['input'];
  segmentIds?: InputMaybe<Array<Scalars['Int']['input']>>;
  statut?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRemoveStatisticArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveTerrainLieuArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveZoneArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRequestRecordingUploadArgs = {
  input: RequestRecordingUploadInput;
};


export type MutationRevokeBadgeArgs = {
  id: Scalars['Int']['input'];
};


export type MutationSaveGpsPositionsArgs = {
  input: SaveGpsPositionsInput;
};


export type MutationStartMonitoringArgs = {
  input: StartMonitoringInput;
};


export type MutationStartRecordingArgs = {
  input: StartRecordingInput;
};


export type MutationStopMonitoringArgs = {
  input: StopMonitoringInput;
};


export type MutationStopRecordingArgs = {
  input: StopRecordingInput;
};


export type MutationSupprimerUtilisateurArgs = {
  input: SupprimerUtilisateurInput;
};


export type MutationSyncCommercialStatsArgs = {
  immeubleId: Scalars['Int']['input'];
};


export type MutationSyncManagerStatsArgs = {
  managerId: Scalars['Int']['input'];
};


export type MutationTriggerBatchExtractionArgs = {
  keys: Array<Scalars['String']['input']>;
};


export type MutationTriggerConversationExtractionArgs = {
  key: Scalars['String']['input'];
};


export type MutationUnassignUserArgs = {
  userId: Scalars['Int']['input'];
  userType: UserType;
};


export type MutationUnassignZoneFromCommercialArgs = {
  commercialId: Scalars['Int']['input'];
  zoneId: Scalars['Int']['input'];
};


export type MutationUpdateBadgeDefinitionArgs = {
  id: Scalars['Int']['input'];
  input: UpdateBadgeDefinitionInput;
};


export type MutationUpdateCommercialArgs = {
  updateCommercialInput: UpdateCommercialInput;
};


export type MutationUpdateDirecteurArgs = {
  updateDirecteurInput: UpdateDirecteurInput;
};


export type MutationUpdateImmeubleArgs = {
  updateImmeubleInput: UpdateImmeubleInput;
};


export type MutationUpdateManagerArgs = {
  updateManagerInput: UpdateManagerInput;
};


export type MutationUpdateOffreBadgeProductKeyArgs = {
  badgeProductKey?: InputMaybe<Scalars['String']['input']>;
  offreId: Scalars['Int']['input'];
};


export type MutationUpdateOffrePointsArgs = {
  offreId: Scalars['Int']['input'];
  points: Scalars['Int']['input'];
};


export type MutationUpdatePorteArgs = {
  updatePorteInput: UpdatePorteInput;
};


export type MutationUpdateStatisticArgs = {
  updateStatisticInput: UpdateStatisticInput;
};


export type MutationUpdateZoneArgs = {
  updateZoneInput: UpdateZoneInput;
};

export type Offre = {
  __typename?: 'Offre';
  badgeProductKey?: Maybe<Scalars['String']['output']>;
  categorie: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  externalId: Scalars['Int']['output'];
  features?: Maybe<Scalars['String']['output']>;
  fournisseur: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  isActive: Scalars['Boolean']['output'];
  logoUrl?: Maybe<Scalars['String']['output']>;
  nom: Scalars['String']['output'];
  points: Scalars['Int']['output'];
  popular: Scalars['Boolean']['output'];
  prixBase?: Maybe<Scalars['Float']['output']>;
  rating?: Maybe<Scalars['Float']['output']>;
  syncedAt: Scalars['DateTime']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type OffreDistributionEntry = {
  __typename?: 'OffreDistributionEntry';
  categorie: Scalars['String']['output'];
  count: Scalars['Int']['output'];
  fournisseur: Scalars['String']['output'];
  logoUrl?: Maybe<Scalars['String']['output']>;
  nom: Scalars['String']['output'];
  offreId: Scalars['Int']['output'];
};

export type OwnerActivityStatistic = {
  __typename?: 'OwnerActivityStatistic';
  absents: Scalars['Int']['output'];
  argumentes: Scalars['Int']['output'];
  contratsSignes: Scalars['Int']['output'];
  lastActivityAt?: Maybe<Scalars['DateTime']['output']>;
  nbPortesProspectes: Scalars['Int']['output'];
  points: Scalars['Int']['output'];
  refus: Scalars['Int']['output'];
  rendezVousPris: Scalars['Int']['output'];
  repassages: Scalars['Int']['output'];
  tauxConversion: Scalars['Float']['output'];
  userId: Scalars['Int']['output'];
  userName: Scalars['String']['output'];
  userType: Scalars['String']['output'];
};

export type PaginatedRecordingsResult = {
  __typename?: 'PaginatedRecordingsResult';
  items: Array<RecordingItem>;
  totalCount: Scalars['Int']['output'];
};

export type Porte = {
  __typename?: 'Porte';
  commentaire?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  derniereVisite?: Maybe<Scalars['DateTime']['output']>;
  etage: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  immeubleId: Scalars['Int']['output'];
  nbContrats: Scalars['Int']['output'];
  nbRepassages: Scalars['Int']['output'];
  nomPersonnalise?: Maybe<Scalars['String']['output']>;
  numero: Scalars['String']['output'];
  rdvDate?: Maybe<Scalars['DateTime']['output']>;
  rdvTime?: Maybe<Scalars['String']['output']>;
  statut: StatutPorte;
  updatedAt: Scalars['DateTime']['output'];
};

export type PorteInfo = {
  __typename?: 'PorteInfo';
  etage: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  numero: Scalars['String']['output'];
};

export type PorteStatistics = {
  __typename?: 'PorteStatistics';
  absent: Scalars['Int']['output'];
  argumente: Scalars['Int']['output'];
  contratsSigne: Scalars['Int']['output'];
  necessiteRepassage: Scalars['Int']['output'];
  nonVisitees: Scalars['Int']['output'];
  portesParEtage: Array<EtageInStatistics>;
  portesVisitees: Scalars['Int']['output'];
  rdvPris: Scalars['Int']['output'];
  refus: Scalars['Int']['output'];
  tauxConversion: Scalars['String']['output'];
  totalPortes: Scalars['Int']['output'];
};

export type Quartier = {
  __typename?: 'Quartier';
  commercialId?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  immeubles?: Maybe<Array<Immeuble>>;
  latitude?: Maybe<Scalars['Float']['output']>;
  longitude?: Maybe<Scalars['Float']['output']>;
  managerId?: Maybe<Scalars['Int']['output']>;
  nom: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  zoneId?: Maybe<Scalars['Int']['output']>;
};

export type Query = {
  __typename?: 'Query';
  acquiscanAddressSuggestions: Array<AcquiscanAddressSuggestion>;
  acquiscanAddresses: AcquiscanAddressesPage;
  acquiscanCommuneOpportunities: AcquiscanCommuneOpportunitiesPage;
  acquiscanCopperBuildings: AcquiscanCopperBuildingsPage;
  acquiscanDepartmentOpportunities: AcquiscanDepartmentOpportunitiesPage;
  acquiscanMapAddresses: AcquiscanMapResult;
  acquiscanTerritoryGeoJson: Scalars['String']['output'];
  acquiscanZonePreview: AcquiscanZonePreviewResult;
  allCurrentAssignments: Array<ZoneEnCours>;
  allZoneHistory: Array<HistoriqueZone>;
  badgeDefinition?: Maybe<BadgeDefinitionType>;
  badgeDefinitions: Array<BadgeDefinitionType>;
  commercial: Commercial;
  commercialBadges: Array<CommercialBadgeType>;
  commercialRankings: Array<RankSnapshotType>;
  commercialTeamRanking: TeamRanking;
  commercials: Array<Commercial>;
  contratsByCommercial: Array<ContratValideType>;
  contratsByManager: Array<ContratValideType>;
  currentUserAssignment?: Maybe<ZoneEnCours>;
  directeur: Directeur;
  directeurs: Array<Directeur>;
  egressState: EgressState;
  getActiveRooms: Array<ActiveRoom>;
  getActiveSessions: Array<MonitoringSession>;
  getConversationStreamingUrl?: Maybe<Scalars['String']['output']>;
  getExtractionProgress?: Maybe<ExtractionProgressDto>;
  getExtractionQueue: Array<ExtractionQueueItemDto>;
  getProcessedKeys: Array<Scalars['String']['output']>;
  getRecordingSpeechScores: Array<SpeechScoreDto>;
  getStreamingUrl: Scalars['String']['output'];
  globalSearch: GlobalSearchResult;
  gpsAllPositions: GpsHistoryResponse;
  gpsDailyRoute: GpsHistoryResponse;
  gpsDevices: Array<GpsPosition>;
  gpsHistory: GpsHistoryResponse;
  gpsLatestPositions: Array<GpsPosition>;
  immeuble: Immeuble;
  immeubles: Array<Immeuble>;
  listAllRecordings: PaginatedRecordingsResult;
  listRecentRecordings: PaginatedRecordingsResult;
  listRecordings: Array<RecordingItem>;
  manager: Manager;
  managerBadges: Array<CommercialBadgeType>;
  managerFull?: Maybe<Manager>;
  managerPersonal?: Maybe<Manager>;
  managers: Array<Manager>;
  mappingSuggestions: Array<MappingSuggestion>;
  me: UserInfo;
  offreDistribution: Array<OffreDistributionEntry>;
  offres: Array<Offre>;
  porte: Porte;
  porteStatistics: PorteStatistics;
  portes: Array<Porte>;
  portesByImmeuble: Array<Porte>;
  portesModifiedToday: Array<Porte>;
  portesRdvToday: Array<Porte>;
  quartiers: Array<Quartier>;
  ranking: Array<RankSnapshotType>;
  recordingSegmentsByCommercial: Array<RecordingSegmentDto>;
  recordingSegmentsByImmeuble: Array<RecordingSegmentDto>;
  recordingSegmentsByKey: Array<RecordingSegmentDto>;
  recordingSegmentsByManager: Array<RecordingSegmentDto>;
  recordingSegmentsByPorte: Array<RecordingSegmentDto>;
  recordingSegmentsToday: Array<RecordingSegmentDto>;
  s3Diagnostics: S3DiagnosticsSnapshot;
  statistic: Statistic;
  statistics: Array<Statistic>;
  statsActivityByOwner: Array<OwnerActivityStatistic>;
  statsTimeline: Array<TimelinePoint>;
  statsTimelineByCommercial: Array<TimelinePoint>;
  statusHistoriqueByImmeuble: Array<StatusHistorique>;
  statusHistoriqueByPorte: Array<StatusHistorique>;
  teamLastStatusActivities: Array<TeamLastStatusActivity>;
  teamRanking: Array<RankSnapshotType>;
  userZoneHistory: Array<HistoriqueZone>;
  validateStatsCoherence: Scalars['String']['output'];
  winleadPlusUsers: Array<WinleadPlusUser>;
  zone: Zone;
  zoneCurrentAssignments: Array<ZoneEnCours>;
  zoneHistory: Array<HistoriqueZone>;
  zoneStatistics: Array<ZoneStatistic>;
  zones: Array<Zone>;
};


export type QueryAcquiscanAddressSuggestionsArgs = {
  input: AcquiscanAddressSearchInput;
};


export type QueryAcquiscanAddressesArgs = {
  input: AcquiscanAddressesInput;
};


export type QueryAcquiscanCommuneOpportunitiesArgs = {
  input: AcquiscanCommuneOpportunitiesInput;
};


export type QueryAcquiscanCopperBuildingsArgs = {
  input: AcquiscanCopperBuildingsInput;
};


export type QueryAcquiscanMapAddressesArgs = {
  input: AcquiscanMapInput;
};


export type QueryAcquiscanTerritoryGeoJsonArgs = {
  input: AcquiscanTerritoryGeoJsonInput;
};


export type QueryAcquiscanZonePreviewArgs = {
  input: AcquiscanZonePreviewInput;
};


export type QueryBadgeDefinitionArgs = {
  id: Scalars['Int']['input'];
};


export type QueryBadgeDefinitionsArgs = {
  activeOnly?: Scalars['Boolean']['input'];
  category?: InputMaybe<BadgeCategory>;
};


export type QueryCommercialArgs = {
  id: Scalars['Int']['input'];
};


export type QueryCommercialBadgesArgs = {
  commercialId: Scalars['Int']['input'];
};


export type QueryCommercialRankingsArgs = {
  commercialId: Scalars['Int']['input'];
};


export type QueryCommercialTeamRankingArgs = {
  commercialId: Scalars['Int']['input'];
};


export type QueryContratsByCommercialArgs = {
  commercialId: Scalars['Int']['input'];
  contractStatuses?: InputMaybe<Array<ContractRankingStatus>>;
};


export type QueryContratsByManagerArgs = {
  contractStatuses?: InputMaybe<Array<ContractRankingStatus>>;
  managerId: Scalars['Int']['input'];
};


export type QueryCurrentUserAssignmentArgs = {
  userId: Scalars['Int']['input'];
  userType: UserType;
};


export type QueryDirecteurArgs = {
  id: Scalars['Int']['input'];
};


export type QueryEgressStateArgs = {
  egressId: Scalars['String']['input'];
};


export type QueryGetConversationStreamingUrlArgs = {
  key: Scalars['String']['input'];
};


export type QueryGetExtractionProgressArgs = {
  key: Scalars['String']['input'];
};


export type QueryGetProcessedKeysArgs = {
  keys: Array<Scalars['String']['input']>;
};


export type QueryGetRecordingSpeechScoresArgs = {
  keys: Array<Scalars['String']['input']>;
};


export type QueryGetStreamingUrlArgs = {
  key: Scalars['String']['input'];
};


export type QueryGlobalSearchArgs = {
  limit?: Scalars['Int']['input'];
  query: Scalars['String']['input'];
};


export type QueryGpsAllPositionsArgs = {
  deviceId?: InputMaybe<Scalars['String']['input']>;
  from: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  to: Scalars['String']['input'];
};


export type QueryGpsDailyRouteArgs = {
  date: Scalars['String']['input'];
  deviceId: Scalars['String']['input'];
};


export type QueryGpsHistoryArgs = {
  deviceId: Scalars['String']['input'];
  from?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
};


export type QueryImmeubleArgs = {
  id: Scalars['Int']['input'];
};


export type QueryListAllRecordingsArgs = {
  roomNames: Array<Scalars['String']['input']>;
};


export type QueryListRecentRecordingsArgs = {
  input: ListRecentRecordingsInput;
};


export type QueryListRecordingsArgs = {
  roomName: Scalars['String']['input'];
};


export type QueryManagerArgs = {
  id: Scalars['Int']['input'];
};


export type QueryManagerBadgesArgs = {
  managerId: Scalars['Int']['input'];
};


export type QueryManagerFullArgs = {
  id: Scalars['Int']['input'];
};


export type QueryManagerPersonalArgs = {
  id: Scalars['Int']['input'];
};


export type QueryOffreDistributionArgs = {
  periodMonth: Scalars['String']['input'];
};


export type QueryOffresArgs = {
  activeOnly?: Scalars['Boolean']['input'];
};


export type QueryPorteArgs = {
  id: Scalars['Int']['input'];
};


export type QueryPorteStatisticsArgs = {
  immeubleId: Scalars['Int']['input'];
};


export type QueryPortesByImmeubleArgs = {
  etage?: InputMaybe<Scalars['Int']['input']>;
  immeubleId: Scalars['Int']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPortesModifiedTodayArgs = {
  immeubleId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRankingArgs = {
  contractStatuses?: InputMaybe<Array<ContractRankingStatus>>;
  includeContratFinie?: Scalars['Boolean']['input'];
  period: RankPeriod;
  periodKey: Scalars['String']['input'];
};


export type QueryRecordingSegmentsByCommercialArgs = {
  commercialId: Scalars['Int']['input'];
};


export type QueryRecordingSegmentsByImmeubleArgs = {
  immeubleId: Scalars['Int']['input'];
};


export type QueryRecordingSegmentsByKeyArgs = {
  s3Key: Scalars['String']['input'];
};


export type QueryRecordingSegmentsByManagerArgs = {
  managerId: Scalars['Int']['input'];
};


export type QueryRecordingSegmentsByPorteArgs = {
  porteId: Scalars['Int']['input'];
};


export type QueryRecordingSegmentsTodayArgs = {
  limit?: Scalars['Int']['input'];
  statut?: InputMaybe<Scalars['String']['input']>;
};


export type QueryStatisticArgs = {
  id: Scalars['Int']['input'];
};


export type QueryStatisticsArgs = {
  commercialId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryStatsActivityByOwnerArgs = {
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  ownerId?: InputMaybe<Scalars['Int']['input']>;
  ownerType?: InputMaybe<Scalars['String']['input']>;
  scopeType?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryStatsTimelineArgs = {
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  ownerId?: InputMaybe<Scalars['Int']['input']>;
  ownerType?: InputMaybe<Scalars['String']['input']>;
  scopeType?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryStatsTimelineByCommercialArgs = {
  commercialId: Scalars['Int']['input'];
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryStatusHistoriqueByImmeubleArgs = {
  immeubleId: Scalars['Int']['input'];
};


export type QueryStatusHistoriqueByPorteArgs = {
  porteId: Scalars['Int']['input'];
};


export type QueryTeamRankingArgs = {
  period: RankPeriod;
  periodKey: Scalars['String']['input'];
};


export type QueryUserZoneHistoryArgs = {
  userId: Scalars['Int']['input'];
  userType: UserType;
};


export type QueryZoneArgs = {
  id: Scalars['Int']['input'];
};


export type QueryZoneCurrentAssignmentsArgs = {
  zoneId: Scalars['Int']['input'];
};


export type QueryZoneHistoryArgs = {
  zoneId: Scalars['Int']['input'];
};

/** Période de classement (jour, semaine, mois, trimestre, année) */
export type RankPeriod =
  | 'DAILY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'WEEKLY'
  | 'YEARLY';

export type RankSnapshotType = {
  __typename?: 'RankSnapshotType';
  commercialId?: Maybe<Scalars['Int']['output']>;
  commercialNom?: Maybe<Scalars['String']['output']>;
  commercialPrenom?: Maybe<Scalars['String']['output']>;
  computedAt: Scalars['DateTime']['output'];
  contratsSignes: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  managerId?: Maybe<Scalars['Int']['output']>;
  managerNom?: Maybe<Scalars['String']['output']>;
  managerPrenom?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Scalars['String']['output']>;
  period: RankPeriod;
  periodKey: Scalars['String']['output'];
  points: Scalars['Int']['output'];
  rank: Scalars['Int']['output'];
  rankTierKey: Scalars['String']['output'];
  rankTierLabel: Scalars['String']['output'];
};

export type RecordingItem = {
  __typename?: 'RecordingItem';
  hasConversation?: Maybe<Scalars['Boolean']['output']>;
  key: Scalars['String']['output'];
  lastModified?: Maybe<Scalars['DateTime']['output']>;
  size?: Maybe<Scalars['Float']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type RecordingResult = {
  __typename?: 'RecordingResult';
  egressId: Scalars['String']['output'];
  roomName: Scalars['String']['output'];
  s3Key: Scalars['String']['output'];
  status: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

export type RecordingSegmentDto = {
  __typename?: 'RecordingSegmentDto';
  commercialId?: Maybe<Scalars['Int']['output']>;
  commercialNom?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  durationSec: Scalars['Float']['output'];
  endTime: Scalars['Float']['output'];
  id: Scalars['Int']['output'];
  immeubleAdresse?: Maybe<Scalars['String']['output']>;
  immeubleId?: Maybe<Scalars['Int']['output']>;
  managerId?: Maybe<Scalars['Int']['output']>;
  porteEtage?: Maybe<Scalars['Int']['output']>;
  porteId: Scalars['Int']['output'];
  porteNumero?: Maybe<Scalars['String']['output']>;
  s3KeyOriginal?: Maybe<Scalars['String']['output']>;
  s3KeySegment?: Maybe<Scalars['String']['output']>;
  speechScore?: Maybe<Scalars['Int']['output']>;
  startTime: Scalars['Float']['output'];
  status: Scalars['String']['output'];
  statut?: Maybe<Scalars['String']['output']>;
  streamingUrl?: Maybe<Scalars['String']['output']>;
  transcription?: Maybe<Scalars['String']['output']>;
};

export type RecordingUploadDetails = {
  __typename?: 'RecordingUploadDetails';
  expiresIn: Scalars['Float']['output'];
  s3Key: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type RemoveMappingInput = {
  prowinId: Scalars['Int']['input'];
  type: Scalars['String']['input'];
};

export type ReponseCreationUtilisateur = {
  __typename?: 'ReponseCreationUtilisateur';
  email?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  password?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  userId?: Maybe<Scalars['String']['output']>;
};

export type ReponseModifierUtilisateur = {
  __typename?: 'ReponseModifierUtilisateur';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ReponseSupprimerUtilisateur = {
  __typename?: 'ReponseSupprimerUtilisateur';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type RequestRecordingUploadInput = {
  duration?: InputMaybe<Scalars['Float']['input']>;
  fileSize?: InputMaybe<Scalars['Float']['input']>;
  immeubleId?: InputMaybe<Scalars['Float']['input']>;
  mimeType?: InputMaybe<Scalars['String']['input']>;
  participantIdentity?: InputMaybe<Scalars['String']['input']>;
  roomName: Scalars['String']['input'];
};

/** Rôle de l'utilisateur dans Pro Win */
export type RoleUtilisateur =
  | 'COMMERCIAL'
  | 'DIRECTEUR'
  | 'MANAGER';

export type S3DiagnosticOperation = {
  __typename?: 'S3DiagnosticOperation';
  command: Scalars['String']['output'];
  failed: Scalars['Int']['output'];
  lastAt?: Maybe<Scalars['DateTime']['output']>;
  lastDurationMs?: Maybe<Scalars['Int']['output']>;
  operation: Scalars['String']['output'];
  source: Scalars['String']['output'];
  succeeded: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type S3DiagnosticsSnapshot = {
  __typename?: 'S3DiagnosticsSnapshot';
  failed: Scalars['Int']['output'];
  operations: Array<S3DiagnosticOperation>;
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  succeeded: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type SaveGpsPositionsInput = {
  positions: Array<GpsPositionInput>;
};

export type SaveGpsPositionsResponse = {
  __typename?: 'SaveGpsPositionsResponse';
  saved: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type SearchResultGroup = {
  __typename?: 'SearchResultGroup';
  category: Scalars['String']['output'];
  items: Array<SearchResultItem>;
};

export type SearchResultItem = {
  __typename?: 'SearchResultItem';
  id: Scalars['Int']['output'];
  label: Scalars['String']['output'];
  sublabel?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type SeedBadgesResult = {
  __typename?: 'SeedBadgesResult';
  created: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  skipped: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
};

export type SpeechScoreDto = {
  __typename?: 'SpeechScoreDto';
  key: Scalars['String']['output'];
  score?: Maybe<Scalars['Int']['output']>;
  speechDurationSec?: Maybe<Scalars['Float']['output']>;
  status: Scalars['String']['output'];
  totalDurationSec?: Maybe<Scalars['Float']['output']>;
};

export type StartMonitoringInput = {
  roomName?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['Int']['input'];
  userType: Scalars['String']['input'];
};

export type StartRecordingInput = {
  audioOnly?: InputMaybe<Scalars['Boolean']['input']>;
  immeubleId?: InputMaybe<Scalars['Float']['input']>;
  participantIdentity?: InputMaybe<Scalars['String']['input']>;
  roomName: Scalars['String']['input'];
};

export type Statistic = {
  __typename?: 'Statistic';
  absents: Scalars['Int']['output'];
  argumentes: Scalars['Int']['output'];
  commercialId?: Maybe<Scalars['Int']['output']>;
  contratsSignes: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  directeurId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  immeubleId?: Maybe<Scalars['Int']['output']>;
  immeublesVisites: Scalars['Int']['output'];
  managerId?: Maybe<Scalars['Int']['output']>;
  nbImmeublesProspectes: Scalars['Int']['output'];
  nbPortesProspectes: Scalars['Int']['output'];
  refus: Scalars['Int']['output'];
  rendezVousPris: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  zoneId?: Maybe<Scalars['Int']['output']>;
};

export type StatusHistorique = {
  __typename?: 'StatusHistorique';
  commentaire?: Maybe<Scalars['String']['output']>;
  commercial?: Maybe<CommercialInfo>;
  commercialId?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  manager?: Maybe<ManagerInfo>;
  managerId?: Maybe<Scalars['Int']['output']>;
  porte?: Maybe<PorteInfo>;
  porteId: Scalars['Int']['output'];
  rdvDate?: Maybe<Scalars['DateTime']['output']>;
  rdvTime?: Maybe<Scalars['String']['output']>;
  statut: StatutPorte;
};

/** Statut possible pour une porte */
export type StatutPorte =
  | 'ABSENT'
  | 'ARGUMENTE'
  | 'CONTRAT_SIGNE'
  | 'NECESSITE_REPASSAGE'
  | 'NON_VISITE'
  | 'REFUS'
  | 'RENDEZ_VOUS_PRIS';

export type StopMonitoringInput = {
  sessionId: Scalars['ID']['input'];
};

export type StopRecordingInput = {
  egressId: Scalars['String']['input'];
};

export type SupprimerUtilisateurInput = {
  email: Scalars['String']['input'];
};

export type SyncContratsResult = {
  __typename?: 'SyncContratsResult';
  created: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  skipped: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
  updated: Scalars['Int']['output'];
};

export type SyncOffresResult = {
  __typename?: 'SyncOffresResult';
  created: Scalars['Int']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
  updated: Scalars['Int']['output'];
};

export type TeamLastStatusActivity = {
  __typename?: 'TeamLastStatusActivity';
  changedAt: Scalars['DateTime']['output'];
  immeubleAdresse?: Maybe<Scalars['String']['output']>;
  immeubleId?: Maybe<Scalars['Int']['output']>;
  porteId: Scalars['Int']['output'];
  porteNumero: Scalars['String']['output'];
  statut: Scalars['String']['output'];
  userId: Scalars['Int']['output'];
  userName: Scalars['String']['output'];
  userType: Scalars['String']['output'];
};

export type TeamRanking = {
  __typename?: 'TeamRanking';
  managerEmail?: Maybe<Scalars['String']['output']>;
  managerNom?: Maybe<Scalars['String']['output']>;
  managerNumTel?: Maybe<Scalars['String']['output']>;
  managerPrenom?: Maybe<Scalars['String']['output']>;
  points: Scalars['Int']['output'];
  position: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  trend?: Maybe<Scalars['String']['output']>;
};

export type TimelinePoint = {
  __typename?: 'TimelinePoint';
  absents: Scalars['Int']['output'];
  argumentes: Scalars['Int']['output'];
  contratsSignes: Scalars['Int']['output'];
  date: Scalars['DateTime']['output'];
  portesProspectees: Scalars['Int']['output'];
  rdvPris: Scalars['Int']['output'];
  refus: Scalars['Int']['output'];
  repassages: Scalars['Int']['output'];
};

/** Type de lieu terrain prospecte */
export type TypeHabitat =
  | 'IMMEUBLE'
  | 'MAISON'
  | 'PAVILLON';

export type UpdateBadgeDefinitionInput = {
  category?: InputMaybe<BadgeCategory>;
  condition?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  nom?: InputMaybe<Scalars['String']['input']>;
  tier?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateCommercialInput = {
  age?: InputMaybe<Scalars['Int']['input']>;
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nom?: InputMaybe<Scalars['String']['input']>;
  numTel?: InputMaybe<Scalars['String']['input']>;
  prenom?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UserStatus>;
};

export type UpdateDirecteurInput = {
  adresse?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  nom?: InputMaybe<Scalars['String']['input']>;
  numTelephone?: InputMaybe<Scalars['String']['input']>;
  prenom?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UserStatus>;
};

export type UpdateImmeubleInput = {
  adresse?: InputMaybe<Scalars['String']['input']>;
  ascenseurPresent?: InputMaybe<Scalars['Boolean']['input']>;
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  digitalCode?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nbEtages?: InputMaybe<Scalars['Int']['input']>;
  nbMaisonsPrevu?: InputMaybe<Scalars['Int']['input']>;
  nbPortesParEtage?: InputMaybe<Scalars['Int']['input']>;
  quartierId?: InputMaybe<Scalars['Int']['input']>;
  typeHabitat?: InputMaybe<TypeHabitat>;
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateManagerInput = {
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  nom?: InputMaybe<Scalars['String']['input']>;
  numTelephone?: InputMaybe<Scalars['String']['input']>;
  prenom?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UserStatus>;
};

export type UpdateOffreBadgeProductKeyInput = {
  badgeProductKey?: InputMaybe<Scalars['String']['input']>;
  offreId: Scalars['Int']['input'];
};

export type UpdateOffrePointsInput = {
  offreId: Scalars['Int']['input'];
  points: Scalars['Int']['input'];
};

export type UpdatePorteInput = {
  commentaire?: InputMaybe<Scalars['String']['input']>;
  derniereVisite?: InputMaybe<Scalars['DateTime']['input']>;
  etage?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['Int']['input'];
  nbContrats?: InputMaybe<Scalars['Int']['input']>;
  nbRepassages?: InputMaybe<Scalars['Int']['input']>;
  nomPersonnalise?: InputMaybe<Scalars['String']['input']>;
  numero?: InputMaybe<Scalars['String']['input']>;
  rdvDate?: InputMaybe<Scalars['DateTime']['input']>;
  rdvTime?: InputMaybe<Scalars['String']['input']>;
  statut?: InputMaybe<StatutPorte>;
};

export type UpdateStatisticInput = {
  absents?: InputMaybe<Scalars['Int']['input']>;
  argumentes?: InputMaybe<Scalars['Int']['input']>;
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  contratsSignes?: InputMaybe<Scalars['Int']['input']>;
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['Int']['input'];
  immeubleId?: InputMaybe<Scalars['Int']['input']>;
  immeublesVisites?: InputMaybe<Scalars['Int']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nbImmeublesProspectes?: InputMaybe<Scalars['Int']['input']>;
  nbPortesProspectes?: InputMaybe<Scalars['Int']['input']>;
  refus?: InputMaybe<Scalars['Int']['input']>;
  rendezVousPris?: InputMaybe<Scalars['Int']['input']>;
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateZoneInput = {
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['Int']['input'];
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nom?: InputMaybe<Scalars['String']['input']>;
  rayon?: InputMaybe<Scalars['Float']['input']>;
  xOrigin?: InputMaybe<Scalars['Float']['input']>;
  yOrigin?: InputMaybe<Scalars['Float']['input']>;
};

export type UserInfo = {
  __typename?: 'UserInfo';
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  role: Scalars['String']['output'];
};

/** Statut d’un utilisateur (commercial, manager ou directeur) */
export type UserStatus =
  | 'ACTIF'
  | 'CONTRAT_FINIE'
  | 'UTILISATEUR_TEST';

/** Type d'utilisateur pouvant être assigné à une zone */
export type UserType =
  | 'COMMERCIAL'
  | 'DIRECTEUR'
  | 'MANAGER';

export type WinleadPlusUser = {
  __typename?: 'WinleadPlusUser';
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  managerId?: Maybe<Scalars['String']['output']>;
  nom: Scalars['String']['output'];
  prenom: Scalars['String']['output'];
  role: Scalars['String']['output'];
  username?: Maybe<Scalars['String']['output']>;
};

export type Zone = {
  __typename?: 'Zone';
  createdAt: Scalars['DateTime']['output'];
  directeurId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  immeubles?: Maybe<Array<Immeuble>>;
  managerId?: Maybe<Scalars['Int']['output']>;
  nom: Scalars['String']['output'];
  rayon: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  xOrigin: Scalars['Float']['output'];
  yOrigin: Scalars['Float']['output'];
};

export type ZoneEnCours = {
  __typename?: 'ZoneEnCours';
  assignedAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  userId: Scalars['Int']['output'];
  userType: UserType;
  zone?: Maybe<Zone>;
  zoneId: Scalars['Int']['output'];
};

export type ZoneStatistic = {
  __typename?: 'ZoneStatistic';
  nombreCommerciaux: Scalars['Int']['output'];
  performanceGlobale: Scalars['Float']['output'];
  tauxConversion: Scalars['Float']['output'];
  tauxSuccesRdv: Scalars['Float']['output'];
  totalContratsSignes: Scalars['Int']['output'];
  totalImmeublesProspectes: Scalars['Int']['output'];
  totalImmeublesVisites: Scalars['Int']['output'];
  totalPortesProspectes: Scalars['Int']['output'];
  totalRefus: Scalars['Int']['output'];
  totalRendezVousPris: Scalars['Int']['output'];
  zoneId: Scalars['Int']['output'];
  zoneName: Scalars['String']['output'];
};
