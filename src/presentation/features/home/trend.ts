import type { SuggestionCode } from '@/domain/rules/suggestion/suggestion';
import type { IconName } from '@/presentation/components/icons/icon';

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
