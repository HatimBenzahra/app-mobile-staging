import { dataSyncService, type DataSyncEventType } from "@/services/sync/data-sync.service";
import { invalidateApiCacheByPrefix } from "./use-api-call";

// Préfixes de cache liés aux données de porte (stats / activité / timeline /
// profil). Toujours invalidés quel que soit le type de mutation.
const PORTE_RELATED_PREFIXES = [
  "workspace-profile:",
  "commercial-activity:",
  "commercial-statistics:",
  "commercial-timeline:",
];

// Le cache "quartiers:" ne dépend que de la structure des immeubles.
// Une simple mutation de porte ne le rend pas périmé.
const QUARTIERS_PREFIX = "quartiers:";

// Le cache "zones-for-user:" alimente la carte terrain (contours de zones) ET la
// liste des zones. Une zone créée/assignée le rend périmé : ses abonnés
// (use-api-call) se rechargent alors seuls.
const ZONES_FOR_USER_PREFIX = "zones-for-user:";

function invalidateByEventType(eventType: DataSyncEventType): void {
  // Invalidation ciblée mais volontairement large en cas de doute.
  // - Mutations PORTE_* : les données porte sont périmées, PAS "quartiers:".
  // - Mutations IMMEUBLE_*/QUARTIER_* : la structure change, donc "quartiers:" aussi.
  // Tout eventType non préfixé "PORTE" invalide large (comportement de sûreté).
  for (const prefix of PORTE_RELATED_PREFIXES) {
    invalidateApiCacheByPrefix(prefix);
  }
  if (!eventType.startsWith("PORTE")) {
    invalidateApiCacheByPrefix(QUARTIERS_PREFIX);
  }
  // ZONE_CREATED : la géométrie/les assignés des zones changent → on invalide le
  // cache des zones affichées (carte + liste) pour forcer leur rechargement.
  if (eventType === "ZONE_CREATED") {
    invalidateApiCacheByPrefix(ZONES_FOR_USER_PREFIX);
  }
}

export function syncWorkspaceMutation(
  eventType: DataSyncEventType,
  options?: { immeubleId?: number; porteId?: number },
): void {
  invalidateByEventType(eventType);
  dataSyncService.emit({
    type: eventType,
    immeubleId: options?.immeubleId,
    porteId: options?.porteId,
  });
}
