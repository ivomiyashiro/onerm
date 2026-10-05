import type { RepRange } from '@/domain/models/prescription';
import { areLoadsEqual } from '@/domain/rules/load-equality';
import { workingLoad, type Exposure, type ExposureSet } from '@/domain/rules/suggestion/exposures';
import type { LimitingSide } from '@/domain/rules/suggestion/suggestion';

/** Where the sets with W fall against the reference range (RN-SUG-01, RN-SUG-02). */
export type RangePosition = 'capReached' | 'within' | 'below';

/** What the engine reads of one ERR, against its reference prescription (the copy, RN-ENT-08). */
export interface ExposureAnalysis {
  /** W; null for bodyweight, where every set counts. */
  readonly workingLoadKg: number | null;
  readonly repsWithW: readonly number[];
  /** The reported RIRs of the sets with W (RN-SUG-03). */
  readonly rirsWithW: readonly number[];
  /** N: the sets of the reference prescription. */
  readonly setCount: number;
  readonly repRange: RepRange;
  readonly targetRir: number;
  readonly range: RangePosition;
  /** In a unilateral ERR, the side of the set with W with the fewest reps (RN-SUG-11). */
  readonly limitingSide: LimitingSide | null;
}

/**
 * RN-SUG-01: cap reached is the single definition: at least N sets with W and all at or over the
 * cap. Within the range: every set with W at or over the floor. Otherwise, below.
 */
export function analyseExposure(exposure: Exposure): ExposureAnalysis {
  const { prescription, sets } = exposure;
  const { min, max } = prescription.repRange;
  const workingLoadKg = workingLoad(exposure);
  // One pass over the sets with W (every set for bodyweight); it runs once per ERR (RNF-13).
  const repsWithW: number[] = [];
  const rirsWithW: number[] = [];
  let allAtCap = true;
  let allAtFloor = true;
  let limiting: ExposureSet | null = null;
  for (const set of sets) {
    if (
      workingLoadKg !== null &&
      (set.loadKg === null || !areLoadsEqual(set.loadKg, workingLoadKg))
    ) {
      continue;
    }
    repsWithW.push(set.reps);
    if (set.rir !== null) rirsWithW.push(set.rir);
    if (set.reps < max) allAtCap = false;
    if (set.reps < min) allAtFloor = false;
    if (set.side !== null && (limiting === null || set.reps < limiting.reps)) limiting = set;
  }
  const range: RangePosition =
    repsWithW.length >= prescription.sets && allAtCap
      ? 'capReached'
      : allAtFloor
        ? 'within'
        : 'below';

  return {
    workingLoadKg,
    repsWithW,
    rirsWithW,
    setCount: prescription.sets,
    repRange: prescription.repRange,
    targetRir: prescription.targetRir,
    range,
    limitingSide:
      limiting === null || limiting.side === null
        ? null
        : { side: limiting.side, reps: limiting.reps },
  };
}
