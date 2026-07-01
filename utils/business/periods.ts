import type { RankPeriod } from "@/types/graphql-schema";

const pad = (n: number): string => String(n).padStart(2, "0");

/** Numéro de semaine ISO-8601 (aligné sur le backend, clé "YYYY-Www"). */
function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // lundi=1 ... dimanche=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // jeudi de la semaine courante
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** Champ de période d'un ContratValide correspondant à un RankPeriod. */
export function contractPeriodField(
  period: RankPeriod,
): "periodDay" | "periodWeek" | "periodMonth" | "periodQuarter" | "periodYear" {
  switch (period) {
    case "DAILY":
      return "periodDay";
    case "WEEKLY":
      return "periodWeek";
    case "MONTHLY":
      return "periodMonth";
    case "QUARTERLY":
      return "periodQuarter";
    case "YEARLY":
      return "periodYear";
    default:
      return "periodMonth";
  }
}

/**
 * Construit la clé de période attendue par le backend gamification.
 * DAILY "YYYY-MM-DD" | WEEKLY "YYYY-Www" | MONTHLY "YYYY-MM" | QUARTERLY "YYYY-Qq" | YEARLY "YYYY"
 */
export function periodKeyFor(period: RankPeriod, date: Date = new Date()): string {
  const year = date.getFullYear();
  switch (period) {
    case "DAILY":
      return `${year}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    case "WEEKLY": {
      const { year: wYear, week } = isoWeek(date);
      return `${wYear}-W${pad(week)}`;
    }
    case "MONTHLY":
      return `${year}-${pad(date.getMonth() + 1)}`;
    case "QUARTERLY":
      return `${year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    case "YEARLY":
      return `${year}`;
    default:
      return `${year}`;
  }
}
