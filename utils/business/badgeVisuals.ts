import { Feather } from "@expo/vector-icons";
import type { BadgeCategory } from "@/types/graphql-schema";

/**
 * Portage FIDÈLE de la résolution d'icônes du web
 * (frontend/src/pages-ADMIN-DIRECTEUR/gamification/Gamification.jsx:323-479).
 * Objectif : mêmes icônes Icons8 3D Fluency + mêmes couleurs par catégorie.
 */

type BadgeLike = {
  code?: string | null;
  nom?: string | null;
  description?: string | null;
  category?: string | null;
  iconUrl?: string | null;
};

const SEMANTIC_BADGE_ICONS = {
  chart: "https://img.icons8.com/3d-fluency/96/combo-chart.png",
  rocket: "https://img.icons8.com/3d-fluency/96/rocket.png",
  package: "https://img.icons8.com/3d-fluency/96/package.png",
  speed: "https://img.icons8.com/3d-fluency/96/speedometer.png",
  medal: "https://img.icons8.com/3d-fluency/96/medal.png",
  trophy: "https://img.icons8.com/3d-fluency/96/trophy.png",
  contract: "https://img.icons8.com/3d-fluency/96/signing-a-document.png",
  calendar: "https://img.icons8.com/3d-fluency/96/calendar.png",
  mobile: "https://img.icons8.com/3d-fluency/96/smartphone.png",
  energy: "https://img.icons8.com/3d-fluency/96/lightning-bolt.png",
  tv: "https://img.icons8.com/3d-fluency/96/retro-tv.png",
  shield: "https://img.icons8.com/3d-fluency/96/shield.png",
  star: "https://img.icons8.com/3d-fluency/96/star.png",
  goal: "https://img.icons8.com/3d-fluency/96/goal.png",
} as const;

const CATEGORY_FALLBACK: Record<string, string> = {
  PROGRESSION: SEMANTIC_BADGE_ICONS.rocket,
  PRODUIT: SEMANTIC_BADGE_ICONS.package,
  PERFORMANCE: SEMANTIC_BADGE_ICONS.medal,
  TROPHEE: SEMANTIC_BADGE_ICONS.trophy,
};

function resolveSemanticBadgeIconUrl(badge: BadgeLike): string | null {
  const source = `${badge.code || ""} ${badge.nom || ""} ${badge.description || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (badge.category === "TROPHEE" || source.includes("trophee") || source.includes("champion")) {
    return SEMANTIC_BADGE_ICONS.trophy;
  }
  if (source.includes("mobile") || source.includes("telecom")) return SEMANTIC_BADGE_ICONS.mobile;
  if (source.includes("fibre")) return SEMANTIC_BADGE_ICONS.mobile;
  if (
    source.includes("energie") ||
    source.includes("elec") ||
    source.includes("gaz") ||
    source.includes("depanssur")
  ) {
    return SEMANTIC_BADGE_ICONS.energy;
  }
  if (source.includes("assurance") || source.includes("mutuelle")) return SEMANTIC_BADGE_ICONS.shield;
  if (source.includes("mondial tv") || source.includes(" tv")) return SEMANTIC_BADGE_ICONS.tv;
  if (source.includes("conciergerie")) return SEMANTIC_BADGE_ICONS.star;
  if (
    source.includes("signature") ||
    source.includes("signataire") ||
    source.includes("contrat") ||
    source.includes("conversion")
  ) {
    return SEMANTIC_BADGE_ICONS.contract;
  }
  if (
    source.includes("derniere minute") ||
    source.includes("finisseur") ||
    source.includes("5j") ||
    source.includes("semaine") ||
    source.includes("mois") ||
    source.includes("trimestre")
  ) {
    return SEMANTIC_BADGE_ICONS.calendar;
  }
  if (
    source.includes("objectif") ||
    source.includes("top") ||
    source.includes("transformation") ||
    source.includes("grand chelem") ||
    source.includes("record")
  ) {
    return SEMANTIC_BADGE_ICONS.goal;
  }
  if (
    source.includes("marathon") ||
    source.includes("fulgurante") ||
    source.includes("as du terrain") ||
    source.includes("performance")
  ) {
    return source.includes("marathon") || source.includes("as du terrain")
      ? SEMANTIC_BADGE_ICONS.speed
      : SEMANTIC_BADGE_ICONS.medal;
  }
  if (
    source.includes("progression") ||
    source.includes("centurion") ||
    source.includes("performer") ||
    source.includes("niveau") ||
    source.includes("starter") ||
    source.includes("duo") ||
    source.includes("trio") ||
    source.includes("legende")
  ) {
    return source.includes("centurion") || source.includes("objectif")
      ? SEMANTIC_BADGE_ICONS.chart
      : SEMANTIC_BADGE_ICONS.rocket;
  }
  return CATEGORY_FALLBACK[badge.category || ""] ?? null;
}

/** URL de l'icône du badge (mêmes règles que le web). */
export function resolveBadgeIconUrl(badge: BadgeLike): string | null {
  const url = badge.iconUrl;
  if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/"))) {
    return url;
  }
  return resolveSemanticBadgeIconUrl(badge);
}

/** Couleurs par catégorie (alignées sur Tailwind du web : emerald / sky / amber / yellow). */
export type CategoryStyle = {
  bg: string;
  border: string;
  text: string;
  accent: string; // bordure supérieure de carte
  fallbackIcon: keyof typeof Feather.glyphMap;
};

export const CATEGORY_STYLE: Record<BadgeCategory, CategoryStyle> = {
  PROGRESSION: { bg: "#ecfdf5", border: "#a7f3d0", text: "#059669", accent: "#22c55e", fallbackIcon: "trending-up" },
  PRODUIT: { bg: "#f0f9ff", border: "#bae6fd", text: "#0284c7", accent: "#0ea5e9", fallbackIcon: "package" },
  PERFORMANCE: { bg: "#fffbeb", border: "#fde68a", text: "#d97706", accent: "#f59e0b", fallbackIcon: "target" },
  TROPHEE: { bg: "#fefce8", border: "#fef08a", text: "#ca8a04", accent: "#eab308", fallbackIcon: "award" },
};

export function categoryStyle(category: BadgeCategory): CategoryStyle {
  return CATEGORY_STYLE[category] ?? CATEGORY_STYLE.PROGRESSION;
}
