import type { GamificationOffre } from "@/services/api/gamification/gamification.service";
import type { BadgeDefinitionType, ContratValideType } from "@/types/graphql-schema";

type Condition = {
  metric?: string;
  threshold?: number;
  categorie?: string;
  scope?: string;
  ranking?: string;
};

export type ContractCounts = {
  total: number;
  /** Décompte par badgeProductKey (MOBILE, FIBRE, DEPANSSUR, …). */
  byProductKey: Map<string, number>;
};

export type BadgeProgress = {
  current: number;
  threshold: number;
  percent: number; // 0-100
  /** false pour les badges Performance/Trophée (records/classements non calculables côté mobile). */
  computable: boolean;
};

/**
 * Catégorie de badge PRODUIT → badgeProductKey(s).
 * Portage EXACT de `mapCategorieToProductKeys` du backend
 * (evaluation.service.ts) pour un décompte identique.
 */
const CATEGORIE_TO_PRODUCT_KEYS: Record<string, string[]> = {
  "Télécom – Mobile": ["MOBILE"],
  "Télécom – Fibre": ["FIBRE"],
  "Énergie – Dépanssur": ["DEPANSSUR"],
  "Énergie – Électricité/Gaz": ["ELEC_GAZ"],
  "Conciergerie Privée": ["CONCIERGERIE"],
  "Mondial TV": ["MONDIAL_TV"],
  "Assurance – Mutuelle/Prévoyance/MRH": ["ASSURANCE"],
  Énergie: ["DEPANSSUR", "ELEC_GAZ"],
  Télécom: ["MOBILE", "FIBRE"],
  Assurance: ["ASSURANCE"],
};

function parseCondition(raw?: string | null): Condition | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Condition;
  } catch {
    return null;
  }
}

/**
 * Agrège les contrats validés : total + décompte par badgeProductKey.
 * Le produit d'un contrat est résolu via son offre (offreExternalId → badgeProductKey),
 * comme le backend (les contrats sont groupés par `offre.badgeProductKey`).
 */
export function buildContractCounts(
  contracts: ContratValideType[],
  offres: GamificationOffre[],
): ContractCounts {
  const keyByExternalId = new Map<number, string>();
  for (const o of offres) {
    if (o.badgeProductKey) keyByExternalId.set(o.externalId, o.badgeProductKey);
  }

  const byProductKey = new Map<string, number>();
  for (const c of contracts) {
    if (c.offreExternalId == null) continue;
    const key = keyByExternalId.get(c.offreExternalId);
    if (!key) continue;
    byProductKey.set(key, (byProductKey.get(key) ?? 0) + 1);
  }
  return { total: contracts.length, byProductKey };
}

/**
 * Progression vers un badge à partir des contrats de l'utilisateur.
 * Calculable pour PROGRESSION (contratsSignes) et PRODUIT (contratsProduit).
 * Les autres métriques (records journaliers, classements, ratios) → computable=false.
 */
export function badgeProgress(
  badge: BadgeDefinitionType,
  counts: ContractCounts,
): BadgeProgress {
  const cond = parseCondition(badge.condition);
  const threshold = cond?.threshold ?? 0;
  if (!cond || cond.ranking || !threshold) {
    return { current: 0, threshold, percent: 0, computable: false };
  }

  let current: number | null = null;
  if (cond.metric === "contratsSignes") {
    current = counts.total;
  } else if (cond.metric === "contratsProduit" && cond.categorie) {
    const keys = CATEGORIE_TO_PRODUCT_KEYS[cond.categorie] ?? [];
    if (keys.length > 0) {
      current = keys.reduce((sum, k) => sum + (counts.byProductKey.get(k) ?? 0), 0);
    }
  }

  if (current === null) {
    return { current: 0, threshold, percent: 0, computable: false };
  }

  return {
    current,
    threshold,
    percent: threshold > 0 ? Math.min(100, (current / threshold) * 100) : 0,
    computable: true,
  };
}
