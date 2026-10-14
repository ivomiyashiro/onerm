import type { LoadUnit } from '@/domain/models/vocabulary';
import { common } from '@/presentation/strings/common';

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

/** One decimal at most, with a comma: «2,3», «2». */
export function decimal(value: number): string {
  return String(Number(value.toFixed(1))).replace('.', ',');
}

/** A day of the history in the device time zone: «5/10». */
export function dayMonth(at: Date): string {
  return `${at.getDate()}/${at.getMonth() + 1}`;
}

/** A day in the device time zone, in words: «lunes 28 de septiembre». */
export function longDate(at: Date): string {
  return common.longDate(common.weekdays[at.getDay()], at.getDate(), common.months[at.getMonth()]);
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

/** What is left of the rest (S09): «01:14», whole seconds rounded up, never below zero. */
export function countdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}
