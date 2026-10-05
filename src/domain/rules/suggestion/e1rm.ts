import type { RepRange } from '@/domain/models/prescription';
import { SUGGESTION_PARAMETERS } from '@/domain/rules/suggestion/parameters';

const { E1RM_STANDARD_MAX, E1RM_MAX } = SUGGESTION_PARAMETERS;

/**
 * Standard inside the validated range of the formula; approximate when extrapolated (P-10). Even
 * the standard one carries the error of an estimated RIR, about one rep, and tends to fall short
 * of the real one: the safe side (P-06).
 */
export type E1rmPrecision = 'standard' | 'approximate';

export interface E1rm {
  readonly value: number;
  readonly precision: E1rmPrecision;
}

/** Brzycki: the load you could lift `repsToFailure` times is this share of the 1RM. */
const brzyckiFactor = (repsToFailure: number) => 36 / (37 - repsToFailure);

/**
 * RN-SUG-07: e1RM = load × 36 / (37 − RTF), with RTF = reps + RIR. Without RIR, RIR 0
 * (conservative). Null with no reps or with RTF over 15.
 */
export function estimatedOneRepMax(loadKg: number, reps: number, rir: number | null): E1rm | null {
  if (reps < 1) return null;
  const repsToFailure = reps + (rir ?? 0);
  if (repsToFailure > E1RM_MAX) return null;
  return {
    // With RTF 1 the factor is exactly 1: the e1RM is the load.
    value: loadKg * brzyckiFactor(repsToFailure),
    precision: repsToFailure <= E1RM_STANDARD_MAX ? 'standard' : 'approximate',
  };
}

/**
 * RN-SUG-08: the load for `repRange.min` reps leaving `targetRir` in reserve, from an e1RM. Not
 * rounded: the caller takes it down to the grid. Null when the target RTF is over 15, where the
 * estimation does not apply.
 */
export function loadForTarget(
  e1rmKg: number,
  repRange: RepRange,
  targetRir: number,
): number | null {
  const targetRepsToFailure = repRange.min + targetRir;
  if (targetRepsToFailure > E1RM_MAX) return null;
  return e1rmKg / brzyckiFactor(targetRepsToFailure);
}
