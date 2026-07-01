import { Feather } from "@expo/vector-icons";

/**
 * Habillage visuel des 8 tiers de points renvoyés par le backend gamification
 * (champ `rankTierKey` de RankSnapshot). Le backend reste la source de vérité
 * pour le seuil/label ; on ne fait que mapper vers des couleurs et icônes.
 */
export type RankTierStyle = {
  key: string;
  label: string;
  color: string; // couleur d'accent du tier
  bg: string; // fond doux pour pastilles
  icon: keyof typeof Feather.glyphMap;
};

const TIERS: Record<string, RankTierStyle> = {
  BRONZE: { key: "BRONZE", label: "Bronze", color: "#C2410C", bg: "#FFEDD5", icon: "shield" },
  SILVER: { key: "SILVER", label: "Silver", color: "#64748B", bg: "#F1F5F9", icon: "shield" },
  GOLD: { key: "GOLD", label: "Gold", color: "#B45309", bg: "#FEF3C7", icon: "award" },
  PLATINUM: { key: "PLATINUM", label: "Platinum", color: "#0891B2", bg: "#CFFAFE", icon: "award" },
  DIAMOND: { key: "DIAMOND", label: "Diamond", color: "#4F46E5", bg: "#E0E7FF", icon: "star" },
  MASTER: { key: "MASTER", label: "Master", color: "#7C3AED", bg: "#EDE9FE", icon: "star" },
  GRANDMASTER: { key: "GRANDMASTER", label: "Grandmaster", color: "#BE185D", bg: "#FCE7F3", icon: "zap" },
  LEGEND: { key: "LEGEND", label: "Legend", color: "#B91C1C", bg: "#FEE2E2", icon: "zap" },
};

const FALLBACK: RankTierStyle = TIERS.BRONZE;

/** Résout le style d'un tier depuis sa clé serveur (insensible à la casse). */
export function tierStyle(tierKey?: string | null): RankTierStyle {
  if (!tierKey) return FALLBACK;
  return TIERS[tierKey.toUpperCase()] ?? FALLBACK;
}

/** Couleur du podium pour un rang de classement (1/2/3), sinon neutre. */
export function podiumColor(rank: number): string | null {
  if (rank === 1) return "#F59E0B";
  if (rank === 2) return "#94A3B8";
  if (rank === 3) return "#C2410C";
  return null;
}

/**
 * Seuils de points des 8 tiers — DOIVENT rester alignés sur
 * `RankingService.pointTiers` du backend (source de vérité).
 */
export const TIER_ORDER: { key: string; label: string; min: number }[] = [
  { key: "BRONZE", label: "Bronze", min: 0 },
  { key: "SILVER", label: "Silver", min: 250 },
  { key: "GOLD", label: "Gold", min: 600 },
  { key: "PLATINUM", label: "Platinum", min: 1200 },
  { key: "DIAMOND", label: "Diamond", min: 2200 },
  { key: "MASTER", label: "Master", min: 3500 },
  { key: "GRANDMASTER", label: "Grandmaster", min: 5000 },
  { key: "LEGEND", label: "Legend", min: 7000 },
];

export type TierProgress = {
  current: { key: string; label: string; min: number };
  next: { key: string; label: string; min: number } | null;
  progressPercent: number;
  pointsToNext: number;
  isMax: boolean;
};

/** Progression vers le tier suivant à partir d'un total de points (seuils backend). */
export function tierProgress(points: number): TierProgress {
  let idx = 0;
  for (let i = 0; i < TIER_ORDER.length; i += 1) {
    if (points >= TIER_ORDER[i].min) idx = i;
  }
  const current = TIER_ORDER[idx];
  const next = TIER_ORDER[idx + 1] ?? null;
  if (!next) {
    return { current, next: null, progressPercent: 100, pointsToNext: 0, isMax: true };
  }
  const span = next.min - current.min;
  const into = points - current.min;
  return {
    current,
    next,
    progressPercent: span > 0 ? Math.min(100, (into / span) * 100) : 0,
    pointsToNext: Math.max(0, next.min - points),
    isMax: false,
  };
}
