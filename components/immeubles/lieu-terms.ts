import type { Immeuble, TypeHabitat } from "@/types/api";

/**
 * Centralise la terminologie et le comportement de l'UI de prospection détaillée
 * selon le type d'habitat du lieu.
 *
 * - IMMEUBLE (défaut) : étages × portes. Comportement historique, inchangé.
 * - MAISON : 1 foyer unique, aucune notion d'étage.
 * - PAVILLON : N maisons (nbMaisonsPrevu), une "maison" jouant le rôle d'un
 *   "étage" dans la mécanique existante (1 porte par maison).
 *
 * Pour les pavillons créés avant le fix (nbPortesParEtage > 1), utilise
 * `effectiveTypeHabitat(immeuble)` pour obtenir le type d'affichage correct.
 */

/**
 * Renvoie le type d'habitat effectif pour l'affichage.
 * Un pavillon legacy (nbPortesParEtage > 1) est traité comme IMMEUBLE
 * afin d'éviter des totaux >100 % et une cartographie écrasée.
 * Les vrais immeubles (typeHabitat IMMEUBLE) et les nouveaux pavillons
 * (nbPortesParEtage ≤ 1) ne sont pas affectés.
 */
export function effectiveTypeHabitat(
  immeuble: Pick<Immeuble, "typeHabitat" | "nbPortesParEtage">,
): TypeHabitat {
  if (
    immeuble.typeHabitat === "PAVILLON" &&
    (immeuble.nbPortesParEtage ?? 1) > 1
  ) {
    return "IMMEUBLE";
  }
  return immeuble.typeHabitat ?? "IMMEUBLE";
}

export type LieuTerms = {
  isMaison: boolean;
  isPavillon: boolean;
  /** false uniquement pour MAISON (pas de cartographie / sections d'étage). */
  showFloors: boolean;
  /** Libellé singulier de l'unité ("Étage" ou "Maison"). */
  unitLabel: string;
  /** Libellé pluriel de l'unité ("étages" ou "maisons"). */
  unitLabelPlural: string;
  /** Sous-titre du header. */
  headerSubtitle: (
    nbEtages: number,
    nbPortesParEtage?: number | null,
    nbMaisonsPrevu?: number | null,
  ) => string;
  /** Titre du plan ("Plan de l'immeuble" / "Plan du lieu"). */
  planTitle: string;
  /** Libellé de l'action FAB d'ajout d'unité. */
  addUnitLabel: string;
  /** Libellé de l'action FAB de suppression d'unité. */
  removeUnitLabel: string;
};

export function getLieuTerms(typeHabitat?: TypeHabitat): LieuTerms {
  const isMaison = typeHabitat === "MAISON";
  const isPavillon = typeHabitat === "PAVILLON";

  if (isMaison) {
    return {
      isMaison: true,
      isPavillon: false,
      showFloors: false,
      unitLabel: "Foyer",
      unitLabelPlural: "foyers",
      headerSubtitle: () => "Maison individuelle",
      planTitle: "Plan du lieu",
      addUnitLabel: "Ajouter",
      removeUnitLabel: "Supprimer",
    };
  }

  if (isPavillon) {
    return {
      isMaison: false,
      isPavillon: true,
      showFloors: true,
      unitLabel: "Maison",
      unitLabelPlural: "maisons",
      headerSubtitle: (nbEtages, _nbPortesParEtage, nbMaisonsPrevu) => {
        // Fallback sur nbEtages pour les pavillons créés avant le fix (legacy data).
        const n = nbMaisonsPrevu ?? nbEtages ?? 0;
        return `${n} maison${n > 1 ? "s" : ""}`;
      },
      planTitle: "Plan du lieu",
      addUnitLabel: "Ajouter maison",
      removeUnitLabel: "Supprimer maison",
    };
  }

  return {
    isMaison: false,
    isPavillon: false,
    showFloors: true,
    unitLabel: "Étage",
    unitLabelPlural: "étages",
    headerSubtitle: (nbEtages, nbPortesParEtage) =>
      nbPortesParEtage && nbPortesParEtage > 0
        ? `${nbEtages} étage${nbEtages > 1 ? "s" : ""} · ${nbPortesParEtage} portes/étage`
        : `${nbEtages} étage${nbEtages > 1 ? "s" : ""}`,
    planTitle: "Plan de l'immeuble",
    addUnitLabel: "Ajouter etage",
    removeUnitLabel: "Supprimer etage",
  };
}
