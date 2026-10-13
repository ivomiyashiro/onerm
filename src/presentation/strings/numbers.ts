import type { LoadUnit } from '@/domain/models/vocabulary';

/** RN-PERF-05: kg with up to 2 decimals, lb with up to 1. */
const DECIMALS: Record<LoadUnit, number> = { kg: 2, lb: 1 };

/** A load as the app shows it (RN-PERF-05): «2,5», «20», without trailing zeros. */
export function loadNumber(value: number, unit: LoadUnit): string {
  return String(Number(value.toFixed(DECIMALS[unit]))).replace('.', ',');
}

/** What a person types: «2,5» or «2.5». Null if it isn't a number. */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The time since a workout started (S07, S09, tab button): «18:42», or «1:05:09» past an hour. */
export function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}
