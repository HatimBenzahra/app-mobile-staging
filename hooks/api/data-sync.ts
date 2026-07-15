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

// Caches qui alimentent « ma zone en cours » sur la carte du commercial :
// l'assignation courante (current-assignment:) et l'historique (user-zone-history:).
// Une (dé)assignation les rend périmés → la carte se recentre/redessine seule.
const CURRENT_ASSIGNMENT_PREFIX = "current-assignment:";
const USER_ZONE_HISTORY_PREFIX = "user-zone-history:";

// Centre de notifications : liste + compteur non-lus (badge de la cloche).
const NOTIFICATIONS_PREFIX = "notifications:";
const UNREAD_NOTIFICATIONS_PREFIX = "unread-notification-count:";

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
  // ZONE_ASSIGNED / ZONE_UNASSIGNED : une zone vient d'être (dé)assignée à
  // l'utilisateur. On invalide « ma zone en cours » + historique + liste des
  // zones : la carte fait alors apparaître/disparaître la zone sans redémarrage.
  if (eventType === "ZONE_ASSIGNED" || eventType === "ZONE_UNASSIGNED") {
    invalidateApiCacheByPrefix(CURRENT_ASSIGNMENT_PREFIX);
    invalidateApiCacheByPrefix(USER_ZONE_HISTORY_PREFIX);
    invalidateApiCacheByPrefix(ZONES_FOR_USER_PREFIX);
    // Rafraîchit la liste + le badge non-lus de la cloche.
    invalidateApiCacheByPrefix(NOTIFICATIONS_PREFIX);
    invalidateApiCacheByPrefix(UNREAD_NOTIFICATIONS_PREFIX);
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
