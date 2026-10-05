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

function fromDayNumber(days: number): LocalDate {
  return new Date(days * MS_PER_DAY).toISOString().slice(0, 10) as LocalDate;
}

/** A local date moved by `days` calendar days. */
export function addDays(date: LocalDate, days: number): LocalDate {
  return fromDayNumber(dayNumber(date) + days);
}

/** RN-PROG-04: the Monday of the week of `date` (weeks go from Monday to Sunday). */
export function startOfWeek(date: LocalDate): LocalDate {
  const days = dayNumber(date);
  // getUTCDay: 0 is Sunday. Days since Monday: Monday 0 … Sunday 6.
  const sinceMonday = (new Date(days * MS_PER_DAY).getUTCDay() + 6) % 7;
  return fromDayNumber(days - sinceMonday);
}
