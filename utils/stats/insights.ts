import type { Porte, TimelinePoint } from "@/types/api";
import {
  computeDelta,
  filterTimelineByPeriod,
  sumTimeline,
  type Delta,
} from "./aggregations";
import { getPeriodRange, getPreviousPeriodRange } from "./period";

const DAY_MS = 86_400_000;

export type InactiveImmeuble = {
  id: number;
  nom?: string;
  daysSinceLastVisit: number;
};

type ImmeubleLike = {
  id: number;
  nom?: string;
  derniereVisite?: string | null;
  portes?: Porte[];
};

/**
 * Returns immeubles with no recorded visit in the past `days` days.
 * Uses immeuble.derniereVisite if present, otherwise infers from
 * latest porte.derniereVisite among its doors.
 */
export function getInactiveImmeubles(
  immeubles: ImmeubleLike[],
  days = 14,
  now: Date = new Date(),
): InactiveImmeuble[] {
  const threshold = now.getTime() - days * DAY_MS;
  const inactive: InactiveImmeuble[] = [];
  for (const imm of immeubles) {
    const lastDirect = imm.derniereVisite
      ? new Date(imm.derniereVisite).getTime()
      : null;
    const lastFromPortes = (imm.portes ?? [])
      .map((p) => (p.derniereVisite ? new Date(p.derniereVisite).getTime() : 0))
      .reduce((max, t) => (t > max ? t : max), 0);
    const last = Math.max(lastDirect ?? 0, lastFromPortes);
    if (last === 0) continue; // never visited — not "inactive", separate case
    if (last < threshold) {
      inactive.push({
        id: imm.id,
        nom: imm.nom,
        daysSinceLastVisit: Math.floor((now.getTime() - last) / DAY_MS),
      });
    }
  }
  return inactive.sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit);
}

export type ConversionRateInsight = {
  currentRate: number;
  previousRate: number;
  delta: Delta;
};

/**
 * Computes the porte → contrat conversion rate for this week and
 * compares it to last week.
 */
export function getConversionRateDelta(
  timeline: TimelinePoint[],
  now: Date = new Date(),
): ConversionRateInsight | null {
  const current = filterTimelineByPeriod(
    timeline,
    getPeriodRange("week", undefined, now),
  );
  const previous = filterTimelineByPeriod(
    timeline,
    getPreviousPeriodRange("week", undefined, now),
  );
  const sumCurr = sumTimeline(current);
  const sumPrev = sumTimeline(previous);
  if (sumCurr.portesProspectees === 0 && sumPrev.portesProspectees === 0) {
    return null;
  }
  const currentRate =
    sumCurr.portesProspectees === 0
      ? 0
      : (sumCurr.contratsSignes / sumCurr.portesProspectees) * 100;
  const previousRate =
    sumPrev.portesProspectees === 0
      ? 0
      : (sumPrev.contratsSignes / sumPrev.portesProspectees) * 100;
  return {
    currentRate,
    previousRate,
    delta: computeDelta(currentRate, previousRate),
  };
}

export type UpcomingRdv = {
  porteId: number;
  immeubleId: number;
  rdvDate: string;
  rdvTime?: string | null;
  numero?: string;
  etage?: number | string;
};

/**
 * Returns RDV that are scheduled in the next `daysAhead` days.
 */
export function getUpcomingRdv(
  portes: Porte[],
  daysAhead = 1,
  now: Date = new Date(),
): UpcomingRdv[] {
  const start = now.getTime();
  const end = start + daysAhead * DAY_MS;
  const result: UpcomingRdv[] = [];
  for (const p of portes) {
    if (!p.rdvDate) continue;
    const t = new Date(p.rdvDate).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= start && t <= end) {
      result.push({
        porteId: p.id,
        immeubleId: p.immeubleId,
        rdvDate: p.rdvDate,
        rdvTime: p.rdvTime,
        numero: p.numero ?? p.nomPersonnalise ?? undefined,
        etage: p.etage,
      });
    }
  }
  return result.sort(
    (a, b) => new Date(a.rdvDate).getTime() - new Date(b.rdvDate).getTime(),
  );
}

export type NextRdvCountdown = {
  porte: UpcomingRdv;
  minutesUntil: number;
  /** Pre-formatted "dans X min" / "dans X h Y" string. */
  formatted: string;
};

export function getNextRdvCountdown(
  portes: Porte[],
  now: Date = new Date(),
): NextRdvCountdown | null {
  const upcoming = getUpcomingRdv(portes, 1, now);
  const next = upcoming[0];
  if (!next) return null;
  const target = new Date(next.rdvDate);
  if (next.rdvTime) {
    const [h, m] = next.rdvTime.split(":").map((x) => parseInt(x, 10));
    if (!Number.isNaN(h)) {
      target.setHours(h, Number.isNaN(m) ? 0 : m, 0, 0);
    }
  }
  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) return null;
  const minutes = Math.floor(diffMs / 60_000);
  let formatted: string;
  if (minutes < 60) {
    formatted = `dans ${minutes} min`;
  } else if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    formatted = m === 0 ? `dans ${h}h` : `dans ${h}h${String(m).padStart(2, "0")}`;
  } else {
    const d = Math.floor(minutes / (24 * 60));
    formatted = `dans ${d} jour${d > 1 ? "s" : ""}`;
  }
  return { porte: next, minutesUntil: minutes, formatted };
}
