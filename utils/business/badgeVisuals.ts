import type { IconName } from "@/components/ui";
import iconManifest from "@/assets/gamification-icons/manifest.json";
import type { BadgeCategory } from "@/types/graphql-schema";

const BY_CODE = iconManifest.byCode as Record<string, string>;
const CATEGORY_FALLBACK = iconManifest.categoryFallback as Record<string, string>;

/**
 * Résolution des icônes de badge (pack Game Icons, bundlé localement).
 * On déduit une CLÉ sémantique depuis code/nom/description (mêmes règles que le web
 * `Gamification.jsx`), résolue en composant SVG via `gameIcons.ts`.
 * Les couleurs par catégorie restent ici (`CATEGORY_STYLE`).
 */

type BadgeLike = {
  code?: string | null;
  nom?: string | null;
  description?: string | null;
  category?: string | null;
  iconUrl?: string | null;
};

/**
 * Nom d'icône locale (pack Game Icons) pour un badge, depuis `manifest.byCode`.
 * 1 icône distincte par produit / exploit / trophée ; les paliers d'un même produit
 * partagent l'icône (le niveau est affiché à part). Repli par catégorie si code inconnu.
 */
export function resolveBadgeIconKey(badge: BadgeLike): string {
  return BY_CODE[badge.code ?? ""] ?? CATEGORY_FALLBACK[badge.category ?? ""] ?? "trophy-cup";
}

/**
 * URL d'icône personnalisée éventuellement saisie en base (`iconUrl`, http/https).
 * Rétro-compatibilité : si présente, elle prime sur l'icône locale. Sinon `null`.
 */
export function resolveBadgeCustomUrl(badge: BadgeLike): string | null {
  const url = badge.iconUrl;
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    return url;
  }
  return null;
}

/** Couleurs par catégorie (alignées sur Tailwind du web : emerald / sky / amber / yellow). */
export type CategoryStyle = {
  bg: string;
  border: string;
  text: string;
  accent: string; // bordure supérieure de carte
  fallbackIcon: IconName;
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
