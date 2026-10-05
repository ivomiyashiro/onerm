import type { LocalDate } from '@/domain/models/local-date';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Days since the epoch of a `YYYY-MM-DD` date, counted in UTC so the device zone plays no part. */
function dayNumber(date: LocalDate): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/** RN-GEN-01: calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return dayNumber(to) - dayNumber(from);
}
