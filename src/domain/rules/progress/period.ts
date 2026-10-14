import type { LocalDate } from '@/domain/models/local-date';
import { addDays } from '@/domain/rules/calendar';

/** RF-PROG-04.AC3: the periods of the chart. */
export const PROGRESS_PERIODS = ['fourWeeks', 'threeMonths', 'all'] as const;
export type ProgressPeriod = (typeof PROGRESS_PERIODS)[number];

/**
 * The first day the period shows, or null for «Todo». «4 semanas» is 28 days; «3 meses» goes back
 * three calendar months, to the last day of a shorter month (31 May → 28 or 29 February).
 */
export function periodStart(period: ProgressPeriod, today: LocalDate): LocalDate | null {
  if (period === 'all') return null;
  if (period === 'fourWeeks') return addDays(today, -28);
  const [year, month, day] = today.split('-').map(Number);
  // Dates built from `today`'s fields, never from the clock (ADR-0009).
  const target = new Date(Date.UTC(year, month - 1 - 3, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10) as LocalDate;
}
