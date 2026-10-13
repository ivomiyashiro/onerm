import type { LocalDate } from '@/domain/models/local-date';

const pad = (n: number) => String(n).padStart(2, '0');

/** RN-GEN-01: the calendar date of an instant in the device time zone. */
export function deviceLocalDate(instant: Date): LocalDate {
  return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}` as LocalDate;
}
