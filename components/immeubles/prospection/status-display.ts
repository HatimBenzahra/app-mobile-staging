import { Feather } from "@expo/vector-icons";

import type { Porte } from "@/types/api";

export type StatusOption = {
  value: string;
  label: string;
  description: string;
  bg: string;
  fg: string;
  accent: string;
  icon: keyof typeof Feather.glyphMap;
};

export const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "ABSENT_MATIN",
    label: "Absent matin",
    description: "1er passage",
    bg: "#FFFBEB",
    fg: "#92400E",
    accent: "#F59E0B",
    icon: "sun",
  },
  {
    value: "ABSENT_SOIR",
    label: "Absent soir",
    description: "2eme passage",
    bg: "#E5EEFF",
    fg: "#001B5E",
    accent: "#005BFF",
    icon: "moon",
  },
  {
    value: "REFUS",
    label: "Refus",
    description: "Aucun interet",
    bg: "#F8FAFC",
    fg: "#0F172A",
    accent: "#EF4444",
    icon: "x-circle",
  },
  {
    value: "RENDEZ_VOUS_PRIS",
    label: "RDV pris",
    description: "Planifie",
    bg: "#E5EEFF",
    fg: "#001B5E",
    accent: "#005BFF",
    icon: "calendar",
  },
  {
    value: "ARGUMENTE",
    label: "Argumente",
    description: "Discussion ok",
    bg: "#F8FAFC",
    fg: "#0F172A",
    accent: "#6366F1",
    icon: "message-square",
  },
  {
    value: "CONTRAT_SIGNE",
    label: "Contrat signe",
    description: "Success",
    bg: "#F8FAFC",
    fg: "#0F172A",
    accent: "#22C55E",
    icon: "check-circle",
  },
];

export const STATUS_DISPLAY: Record<string, StatusOption> = {
  ...Object.fromEntries(STATUS_OPTIONS.map((option) => [option.value, option])),
};

export const DEFAULT_STATUS_OPTION: StatusOption = {
  value: "NON_VISITE",
  label: "Non visite",
  description: "Par defaut",
  bg: "#E2E8F0",
  fg: "#475569",
  accent: "#CBD5F5",
  icon: "circle",
};

export function getDisplayStatusKey(porte?: Porte | null): string | null {
  if (!porte?.statut) return null;
  if (porte.statut === "ABSENT") {
    const repassages = porte.nbRepassages ?? 1;
    return repassages >= 2 ? "ABSENT_SOIR" : "ABSENT_MATIN";
  }
  return porte.statut;
}

export function getDisplayStatus(porte?: Porte | null): StatusOption | null {
  const key = getDisplayStatusKey(porte);
  return key ? (STATUS_DISPLAY[key] ?? null) : null;
}
