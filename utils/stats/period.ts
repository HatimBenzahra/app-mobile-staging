export type StatsPeriod = "day" | "week" | "month" | "year" | "custom";

export type PeriodRange = {
  from: Date;
  to: Date;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = x.getDay(); // 0 = Sun
  const diff = dow === 0 ? 6 : dow - 1; // ISO week starts Monday
  x.setDate(x.getDate() - diff);
  return x;
}

function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfDay(end);
}

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function startOfYear(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), 0, 1));
}

function endOfYear(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), 11, 31));
}

export function getPeriodRange(
  period: StatsPeriod,
  custom?: PeriodRange,
  now: Date = new Date(),
): PeriodRange {
  if (period === "custom" && custom) {
    return { from: startOfDay(custom.from), to: endOfDay(custom.to) };
  }
  switch (period) {
    case "day":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now), to: endOfWeek(now) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
    default:
      return { from: startOfWeek(now), to: endOfWeek(now) };
  }
}

export function getPreviousPeriodRange(
  period: StatsPeriod,
  custom?: PeriodRange,
  now: Date = new Date(),
): PeriodRange {
  const current = getPeriodRange(period, custom, now);
  const ms = current.to.getTime() - current.from.getTime() + 1;
  const to = new Date(current.from.getTime() - 1);
  const from = new Date(to.getTime() - ms + 1);
  return { from, to };
}

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
  year: "Année",
  custom: "Personnalisé",
};

export function formatPeriodLabel(period: StatsPeriod): string {
  return PERIOD_LABELS[period];
}

export function formatRange(range: PeriodRange): string {
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  const fromStr = range.from.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  const toStr = range.to.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${fromStr} → ${toStr}`;
}
