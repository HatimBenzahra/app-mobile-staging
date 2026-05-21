// Design tokens for Pro-Win mobile app.
// Source of truth for colors, spacing, radii, shadows, and typography.
// Brand palette derived from the Pro-Win logo (loupe = primary blue,
// inner face = navy, "Pro" bars = light accent).

import type { TextStyle, ViewStyle } from "react-native";

export const palette = {
  // Brand — derived from the logo
  primary: {
    50: "#E5EEFF",
    100: "#CCDEFF",
    200: "#99BDFF",
    300: "#669CFF",
    400: "#337BFF",
    500: "#2F80FF", // logo "Pro" bars / soft accent
    600: "#005BFF", // logo loupe circle — PRIMARY
    700: "#0049CC",
    800: "#001B5E", // logo inner face — deep navy
    900: "#001145",
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
  primary: palette.primary[600],
  primaryDark: palette.primary[800],
  primaryLight: palette.primary[500],
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

  // RGBA helpers (charts, overlays)
  primaryAlpha12: "rgba(0, 91, 255, 0.12)",
  primaryAlpha20: "rgba(0, 91, 255, 0.20)",
  primaryAlpha0: "rgba(0, 91, 255, 0)",
  whiteAlpha20: "rgba(255, 255, 255, 0.20)",
  whiteAlpha25: "rgba(255, 255, 255, 0.25)",
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

export const theme = {
  colors,
  palette,
  radius,
  spacing,
  fontSize,
  fontWeight,
  shadows,
  podium,
  progressColors,
} as const;

export type Theme = typeof theme;
export default theme;
