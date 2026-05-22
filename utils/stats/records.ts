import type { TimelinePoint } from "@/types/api";

export type DayRecord = {
  date: Date;
  value: number;
  label: string;
};

export type WeekRecord = {
  weekStart: Date;
  weekEnd: Date;
  value: number;
  label: string;
};

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function startOfIsoWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay();
  const diff = dow === 0 ? 6 : dow - 1;
  x.setDate(x.getDate() - diff);
  return x;
}

export function findBestDay(
  timeline: TimelinePoint[],
  metric: keyof Pick<
    TimelinePoint,
    "portesProspectees" | "rdvPris" | "contratsSignes"
  > = "portesProspectees",
): DayRecord | null {
  if (timeline.length === 0) return null;
  let best: TimelinePoint | null = null;
  for (const p of timeline) {
    const v = p[metric] ?? 0;
    if (!best || (p[metric] ?? 0) > (best[metric] ?? 0)) {
      if (v > 0) best = p;
    }
  }
  if (!best) return null;
  const date = new Date(best.date);
  return {
    date,
    value: best[metric] ?? 0,
    label: formatDayLabel(date),
  };
}

export function findBestWeek(
  timeline: TimelinePoint[],
  metric: keyof Pick<
    TimelinePoint,
    "portesProspectees" | "rdvPris" | "contratsSignes"
  > = "contratsSignes",
): WeekRecord | null {
  if (timeline.length === 0) return null;
  const byWeek = new Map<number, { start: Date; sum: number }>();
  for (const p of timeline) {
    const d = new Date(p.date);
    const start = startOfIsoWeek(d);
    const key = start.getTime();
    const v = p[metric] ?? 0;
    const existing = byWeek.get(key);
    if (existing) {
      existing.sum += v;
    } else {
      byWeek.set(key, { start, sum: v });
    }
  }
  let bestKey: number | null = null;
  let bestSum = 0;
  byWeek.forEach((entry, key) => {
    if (entry.sum > bestSum) {
      bestKey = key;
      bestSum = entry.sum;
    }
  });
  if (bestKey === null || bestSum === 0) return null;
  const entry = byWeek.get(bestKey);
  if (!entry) return null;
  const end = new Date(entry.start);
  end.setDate(end.getDate() + 6);
  return {
    weekStart: entry.start,
    weekEnd: end,
    value: entry.sum,
    label: `${formatDayLabel(entry.start)} → ${formatDayLabel(end)}`,
  };
}

export type StreakInfo = {
  current: number;
  longest: number;
};

/**
 * Counts consecutive days (ending today or yesterday) with activity > 0.
 * `longest` walks the full timeline.
 */
export function computeStreak(
  timeline: TimelinePoint[],
  metric: keyof Pick<
    TimelinePoint,
    "portesProspectees" | "rdvPris" | "contratsSignes"
  > = "portesProspectees",
): StreakInfo {
  if (timeline.length === 0) return { current: 0, longest: 0 };
  const days = new Set<string>();
  timeline.forEach((p) => {
    if ((p[metric] ?? 0) > 0) {
      days.add(p.date.slice(0, 10));
    }
  });
  if (days.size === 0) return { current: 0, longest: 0 };

  // longest: walk all unique day strings sorted
  const sorted = Array.from(days).sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const dayMs = 86_400_000;
    if (curr.getTime() - prev.getTime() === dayMs) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // current streak: walk back from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let current = 0;
  for (let offset = 0; offset < 365; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) {
      current += 1;
    } else if (offset === 0) {
      // allow grace: if no activity today, still count from yesterday
      continue;
    } else {
      break;
    }
  }

  return { current, longest };
}
