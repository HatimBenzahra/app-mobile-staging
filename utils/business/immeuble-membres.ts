import type { ImmeubleMembre, Porte, UserType } from "@/types/api";

/**
 * Immeuble partagé : tous les membres sont à égalité, et chaque porte compte
 * pour l'auteur de son dernier passage (`dernierCommercialId` /
 * `dernierManagerId`). Ces helpers sont la seule source de cette règle côté
 * mobile (stats perso, libellé « Fait par », membres affichés).
 */

/** Utilisateur connecté, identifié comme le backend identifie membres et auteurs. */
export type ImmeubleViewer = {
  id: number;
  type: UserType;
};

/** Identité stockée (rôle en minuscules) → viewer. `null` tant qu'elle n'est pas chargée. */
export function toImmeubleViewer(
  userId: number | null,
  role: string | null,
): ImmeubleViewer | null {
  if (userId == null || userId <= 0 || role == null) return null;
  return { id: userId, type: role === "manager" ? "MANAGER" : "COMMERCIAL" };
}

export function isViewerMembre(
  membre: ImmeubleMembre,
  viewer: ImmeubleViewer,
): boolean {
  return membre.id === viewer.id && membre.type === viewer.type;
}

/** Membres de l'immeuble hors l'utilisateur connecté. */
export function getAutresMembres(
  membres: ImmeubleMembre[] | undefined,
  viewer: ImmeubleViewer | null,
): ImmeubleMembre[] {
  if (!membres) return [];
  if (!viewer) return membres;
  return membres.filter((membre) => !isViewerMembre(membre, viewer));
}

/** Le dernier passage de la porte a-t-il été fait par l'utilisateur connecté ? */
export function isPorteFaitePar(
  porte: Pick<Porte, "dernierCommercialId" | "dernierManagerId">,
  viewer: ImmeubleViewer,
): boolean {
  return viewer.type === "MANAGER"
    ? porte.dernierManagerId === viewer.id
    : porte.dernierCommercialId === viewer.id;
}

/**
 * Libellé « Fait par Prénom » d'une porte prospectée par quelqu'un d'autre que
 * l'utilisateur connecté ; `null` si la porte n'est pas prospectée ou s'il en
 * est l'auteur. Le prénom vient de la porte (détail immeuble) ou, à défaut, des
 * membres de l'immeuble.
 */
export function getPorteAuteurLabel(
  porte: Porte,
  membres: ImmeubleMembre[] | undefined,
  viewer: ImmeubleViewer | null,
): string | null {
  if (!viewer || porte.statut === "NON_VISITE") return null;
  const auteur =
    porte.dernierCommercialId != null
      ? { id: porte.dernierCommercialId, type: "COMMERCIAL" as const }
      : porte.dernierManagerId != null
        ? { id: porte.dernierManagerId, type: "MANAGER" as const }
        : null;
  if (!auteur || (auteur.id === viewer.id && auteur.type === viewer.type)) {
    return null;
  }
  const prenom =
    porte.dernierActeurPrenom ??
    membres?.find((membre) => membre.id === auteur.id && membre.type === auteur.type)
      ?.prenom;
  return prenom ? `Fait par ${prenom}` : "Fait par un collègue";
}
