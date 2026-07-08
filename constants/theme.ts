// Design tokens for Pro-Win mobile app.
// Source of truth for colors, spacing, radii, shadows, and typography.
// Brand palette aligned with Pro-Win web : accent orange (dégradé
// orange→rouge du logo) sur fond blanc, avec un bleu marine réservé au
// chrome de la sidebar (voir `sidebar`).

import type { TextStyle, ViewStyle } from "react-native";

export const palette = {
  // Brand — orange (échelle Tailwind orange), accent principal de l'app
  primary: {
    50: "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C",
    500: "#F97316", // orange de marque — PRIMARY (logo, CTA, actifs)
    600: "#EA580C", // orange soutenu (pressed / hover)
    700: "#C2410C",
    800: "#9A3412",
    900: "#7C2D12",
  },

  // Neutrals — slate-style scale
  neutral: {
    0: "#FFFFFF",
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },

  // Semantic
  success: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
  },
  warning: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
  },
  danger: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
  },
  info: {
    50: "#E0F2FE",
    500: "#0EA5E9",
    600: "#0284C7",
  },
} as const;

// Convenience aliases used throughout the app
export const colors = {
  // Brand
  primary: palette.primary[500],
  primaryDark: palette.primary[600],
  primaryLight: palette.primary[400],
  primarySoft: palette.primary[50],
  primaryMuted: palette.primary[100],
  primaryRing: palette.primary[200],

  // Surfaces
  background: palette.neutral[50],
  surface: palette.neutral[0],
  surfaceMuted: palette.neutral[100],
  surfaceSubtle: palette.neutral[50],
  border: palette.neutral[200],
  borderStrong: palette.neutral[300],

  // Text
  text: palette.neutral[900],
  textStrong: palette.neutral[600],
  textMuted: palette.neutral[500],
  textSubtle: palette.neutral[400],
  textInverse: palette.neutral[0],
  textOnPrimary: palette.neutral[0],

  // Semantic shortcuts
  success: palette.success[500],
  successSoft: palette.success[50],
  successText: palette.success[700],
  warning: palette.warning[500],
  warningSoft: palette.warning[50],
  warningText: palette.warning[700],
  danger: palette.danger[500],
  dangerSoft: palette.danger[50],
  dangerText: palette.danger[700],
  info: palette.info[500],
  infoSoft: palette.info[50],

  // RGBA helpers (charts, overlays) — keyés sur l'orange de marque #F97316
  primaryAlpha12: "rgba(249, 115, 22, 0.12)",
  primaryAlpha20: "rgba(249, 115, 22, 0.20)",
  primaryAlpha0: "rgba(249, 115, 22, 0)",
  whiteAlpha20: "rgba(255, 255, 255, 0.20)",
  whiteAlpha25: "rgba(255, 255, 255, 0.25)",
} as const;

// Dégradés de marque (RN : tableau de stops pour expo-linear-gradient).
// Le dégradé orange→rouge est la signature visuelle (logo, CTA login).
export const gradients = {
  brand: ["#F97316", "#EF4444"],
} as const;

// Chrome de la sidebar — bleu marine foncé repris du web. C'est le seul
// endroit où le bleu subsiste : fond navy, texte clair, accent actif orange.
export const sidebar = {
  bg: "#1C2432", // fond bleu marine foncé
  surface: "#2A3444", // fond hover / actif (navy plus clair)
  border: "#333C4A",
  text: "#DFE1E6", // texte clair
  textMuted: "#94A3B8", // texte / icône inactif
  active: colors.primary, // accent actif = orange de marque
  activeText: "#FFFFFF",
  activeSurface: "rgba(249, 115, 22, 0.14)", // fond doux sous l'item actif
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  pill: 999,
} as const;

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  "2xl": 20,
  "3xl": 22,
  "4xl": 28,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
} satisfies Record<string, TextStyle["fontWeight"]>;

// Pre-built shadow styles (RN cross-platform)
export const shadows: Record<"none" | "sm" | "md" | "lg", ViewStyle> = {
  none: {},
  sm: {
    shadowColor: palette.neutral[900],
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: palette.neutral[900],
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: palette.neutral[900],
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
};

// Podium accents — used by team rankings (Top 1/2/3). Out of the brand
// palette on purpose so they read as awards, not brand colors.
export const podium = {
  gold: { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E", accent: "#F59E0B" },
  silver: { bg: "#F1F5F9", border: "#CBD5E1", text: "#334155", accent: "#94A3B8" },
  bronze: { bg: "#FFEDD5", border: "#F5D0AE", text: "#7C2D12", accent: "#C2410C" },
} as const;

// Progress-bucket colors — used by immeuble filter chips to show
// completion buckets (0-35 / 36-70 / 71-99 / 100).
export const progressColors = {
  low: colors.danger,
  mid: colors.warning,
  high: "#22C55E",
  complete: "#16A34A",
} as const;

// Type d'habitat — couleurs partagées entre les marqueurs de la carte, la liste
// des lieux et les filtres, pour que le même type se lise pareil partout.
// Immeuble = bleu de marque ; maison = vert ; pavillon/quartier hors palette
// (assumés) mais centralisés ici plutôt qu'en littéraux dispersés.
export const habitat = {
  immeuble: colors.primary,
  maison: colors.success,
  pavillon: "#0EA5E9", // sky — distinct de l'orange immeuble depuis le passage à l'orange
  quartier: "#7C3AED",
} as const;

// Ownership accents — carte terrain. Le marqueur, la légende et la sheet de
// consultation partagent ces teintes pour qu'un lieu tapé "prolonge" la couleur
// de son marqueur. Volontairement hors palette de marque (comme `podium`) : MINE
// (teal) et TEAM (amber = échelle warning) se lisent comme une propriété, pas une
// couleur de marque.
export const ownership = {
  mine: { accent: "#0D9488", soft: "#F0FDFA", ring: "#CCFBF1" },
  team: {
    accent: palette.warning[600],
    soft: palette.warning[50],
    ring: palette.warning[100],
  },
} as const;

export const theme = {
  colors,
  palette,
  gradients,
  sidebar,
  radius,
  spacing,
  fontSize,
  fontWeight,
  shadows,
  podium,
  progressColors,
  ownership,
  habitat,
} as const;

export type Theme = typeof theme;
export default theme;
