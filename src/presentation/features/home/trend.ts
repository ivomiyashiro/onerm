import type { LoadUnit } from '@/domain/models/vocabulary';
import type { Suggestion, SuggestionCode } from '@/domain/rules/suggestion/suggestion';
import { toUnit } from '@/domain/rules/units';
import type { IconName } from '@/presentation/components/icons/icon';
import { common } from '@/presentation/strings/common';
import { home } from '@/presentation/strings/home';
import { loadNumber } from '@/presentation/strings/numbers';

/** Figma «ExerciseRow» → Trend: what changes against last time (marca §8). */
export type Trend = 'up' | 'reps' | 'same' | 'deload' | 'calibrate';

/**
 * The icon of S07 for each reason (13 §4): more load, more reps, the same, lighter after a pause
 * or a deload, or calibrate. The full reason lives in S09 and S10.
 */
const TRENDS: Record<SuggestionCode, Trend> = {
  CALIBRATION: 'calibrate',
  BODYWEIGHT_CALIBRATION: 'calibrate',
  CALIBRATION_STEP: 'calibrate',
  CALIBRATION_STEP_DOWN: 'calibrate',
  INCREASE_LOAD: 'up',
  EARLY_INCREASE: 'up',
  HIGH_INCREASE: 'up',
  ADD_REP: 'reps',
  EXTEND_REPS: 'reps',
  COMPLETE_SETS: 'reps',
  BODYWEIGHT_ADD_REP: 'reps',
  DELOAD: 'deload',
  REENTRY: 'deload',
  REPEAT: 'same',
  CONSOLIDATE: 'same',
  ESTIMATED_FROM_E1RM: 'same',
  FROM_EXERCISE_HISTORY: 'same',
  PRESCRIPTION_CHANGED: 'same',
  BODYWEIGHT_READY: 'same',
};

export function trendOf(code: SuggestionCode): Trend {
  return TRENDS[code];
}

export const TREND_ICONS: Record<Trend, IconName> = {
  up: 'up',
  reps: 'plus',
  same: 'equal',
  deload: 'clock',
  calibrate: 'flag',
};

/** How many exercises go up in load and how many add reps («Sube en 1 · suma reps en 3»). */
export function trendCounts(trends: readonly Trend[]): { up: number; reps: number } {
  return {
    up: trends.filter((t) => t === 'up').length,
    reps: trends.filter((t) => t === 'reps').length,
  };
}

/** RF-ENT-01.AC8: what changes against last time, as S07 shows it under the suggestion. */
export interface Delta {
  readonly tone: 'up' | 'down' | 'reps' | 'same';
  readonly text: string;
}

/** Estimates and a changed prescription are a new starting point, not a change (13 §4). */
const NO_DELTA = new Set<SuggestionCode>([
  'ESTIMATED_FROM_E1RM',
  'FROM_EXERCISE_HISTORY',
  'PRESCRIPTION_CHANGED',
]);

/**
 * «↑ 2,5 kg», «↓ 5 kg» (against the working load of last time), «+1 rep», or «Igual»; null to
 * calibrate (#196) and for a new estimate.
 */
export function deltaOf(suggestion: Suggestion, unit: LoadUnit): Delta | null {
  const { reason, loadKg, reps } = suggestion;
  const trend = trendOf(reason.code);
  if (trend === 'calibrate' || NO_DELTA.has(reason.code)) return null;
  const load = (kg: number) =>
    `${loadNumber(toUnit(Math.abs(kg), unit), unit)} ${common.units[unit]}`;
  if ((trend === 'up' || trend === 'deload') && 'workingLoadKg' in reason && loadKg !== null) {
    const diff = loadKg - reason.workingLoadKg;
    if (diff > 0) return { tone: 'up', text: home.delta.up(load(diff)) };
    if (diff < 0) return { tone: 'down', text: home.delta.down(load(diff)) };
  }
  if (trend === 'reps') {
    return 'previousReps' in reason && reps > reason.previousReps
      ? { tone: 'reps', text: home.delta.reps(reps - reason.previousReps) }
      : { tone: 'reps', text: home.delta.moreReps };
  }
  return { tone: 'same', text: home.delta.same };
}
