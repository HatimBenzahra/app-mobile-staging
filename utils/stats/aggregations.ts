import type { TimelinePoint } from "@/types/api";
import type { PeriodRange } from "./period";

export type Trend = "up" | "down" | "flat";

export type Delta = {
  value: number;
  /** Percentage delta vs previous. null if previous = 0 (undefined comparison). */
  percent: number | null;
  trend: Trend;
  formatted: string;
};

export function computeDelta(current: number, previous: number): Delta {
  const diff = current - previous;
  const percent = previous === 0 ? null : (diff / previous) * 100;
  let trend: Trend = "flat";
  if (diff > 0) trend = "up";
  else if (diff < 0) trend = "down";

  let formatted: string;
  if (percent === null) {
    formatted = diff === 0 ? "= stable" : `${diff > 0 ? "+" : ""}${diff}`;
  } else {
    const sign = diff > 0 ? "+" : "";
    formatted = `${sign}${Math.round(percent)}%`;
  }

  return { value: diff, percent, trend, formatted };
}

export function filterTimelineByPeriod(
  timeline: TimelinePoint[],
  range: PeriodRange,
): TimelinePoint[] {
  const from = range.from.getTime();
  const to = range.to.getTime();
  return timeline.filter((p) => {
    const t = new Date(p.date).getTime();
    return t >= from && t <= to;
  });
}

export type TimelineTotals = {
  portesProspectees: number;
  rdvPris: number;
  contratsSignes: number;
  refus: number;
  absents: number;
  argumentes: number;
};

export function sumTimeline(points: TimelinePoint[]): TimelineTotals {
  return points.reduce<TimelineTotals>(
    (acc, p) => ({
      portesProspectees: acc.portesProspectees + (p.portesProspectees ?? 0),
      rdvPris: acc.rdvPris + (p.rdvPris ?? 0),
      contratsSignes: acc.contratsSignes + (p.contratsSignes ?? 0),
      refus: acc.refus + (p.refus ?? 0),
      absents: acc.absents + (p.absents ?? 0),
      argumentes: acc.argumentes + (p.argumentes ?? 0),
    }),
    {
      portesProspectees: 0,
      rdvPris: 0,
      contratsSignes: 0,
      refus: 0,
      absents: 0,
      argumentes: 0,
    },
  );
}

export const DAY_OF_WEEK_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export type DayOfWeekBucket = {
  /** Monday=0, Sunday=6 (matches DAY_OF_WEEK_LABELS index). */
  index: number;
  label: string;
  portes: number;
  rdv: number;
  contrats: number;
};

export function groupByDayOfWeek(points: TimelinePoint[]): DayOfWeekBucket[] {
  const buckets: DayOfWeekBucket[] = DAY_OF_WEEK_LABELS.map((label, index) => ({
    index,
    label,
    portes: 0,
    rdv: 0,
    contrats: 0,
  }));
  points.forEach((p) => {
    const d = new Date(p.date);
    const dow = d.getDay(); // 0 = Sun
    const idx = dow === 0 ? 6 : dow - 1;
    const b = buckets[idx];
    if (!b) return;
    b.portes += p.portesProspectees ?? 0;
    b.rdv += p.rdvPris ?? 0;
    b.contrats += p.contratsSignes ?? 0;
  });
  return buckets;
}

export type StatusDistribution = {
  label: string;
  value: number;
  /** Optional color hint key (caller maps to theme tokens). */
  toneKey: "primary" | "success" | "danger" | "warning" | "info" | "neutral";
};

export function buildStatusDistribution(totals: TimelineTotals): StatusDistribution[] {
  const all: StatusDistribution[] = [
    { label: "Argumentés", value: totals.argumentes, toneKey: "info" },
    { label: "RDV pris", value: totals.rdvPris, toneKey: "primary" },
    { label: "Contrats", value: totals.contratsSignes, toneKey: "success" },
    { label: "Refus", value: totals.refus, toneKey: "danger" },
    { label: "Absents", value: totals.absents, toneKey: "warning" },
  ];
  return all.filter((s) => s.value > 0);
}

export type FunnelStep = {
  label: string;
  value: number;
  conversionFromPrev: number | null;
};

export function buildConversionFunnel(totals: TimelineTotals): FunnelStep[] {
  const steps: FunnelStep[] = [
    { label: "Portes visitées", value: totals.portesProspectees, conversionFromPrev: null },
    {
      label: "RDV pris",
      value: totals.rdvPris,
      conversionFromPrev:
        totals.portesProspectees === 0
          ? null
          : (totals.rdvPris / totals.portesProspectees) * 100,
    },
    {
      label: "Contrats signés",
      value: totals.contratsSignes,
      conversionFromPrev:
        totals.rdvPris === 0
          ? null
          : (totals.contratsSignes / totals.rdvPris) * 100,
    },
  ];
  return steps;
}
