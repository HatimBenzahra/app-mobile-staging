import { progressColors } from "@/constants/theme";
import { effectiveTypeHabitat } from "@/components/immeubles/lieu-terms";
import type { Immeuble } from "@/types/api";

export type ImmeubleProgress = {
  total: number;
  prospectees: number;
  percent: number;
  color: string;
};

/**
 * Calcule la progression de prospection d'un immeuble.
 * Utilise `effectiveTypeHabitat` pour traiter les pavillons legacy
 * (nbPortesParEtage > 1) comme des IMMEUBLES.
 *
 * - MAISON   : total = max(1, portes réelles)
 * - PAVILLON : total = nbMaisonsPrevu ?? nbEtages ?? portes.length
 * - IMMEUBLE : total = nbEtages × nbPortesParEtage ?? portes.length
 */
export function getImmeubleProgress(immeuble: Immeuble): ImmeubleProgress {
  const portes = immeuble.portes ?? [];
  const effType = effectiveTypeHabitat(immeuble);

  let total: number;
  if (effType === "MAISON") {
    const realCount = portes.filter((p) => p.id > 0).length;
    total = Math.max(1, realCount);
  } else if (effType === "PAVILLON") {
    total = immeuble.nbMaisonsPrevu ?? immeuble.nbEtages ?? portes.length;
  } else {
    const theoretical = (immeuble.nbEtages ?? 0) * (immeuble.nbPortesParEtage ?? 0);
    total = theoretical > 0 ? theoretical : portes.length;
  }

  const prospectees = portes.filter((p) => p.statut !== "NON_VISITE").length;
  const percent = total === 0 ? 0 : Math.round((prospectees / total) * 100);

  const color =
    percent < 35
      ? progressColors.low
      : percent < 70
        ? progressColors.mid
        : percent < 100
          ? progressColors.high
          : progressColors.complete;

  return { total, prospectees, percent, color };
}
