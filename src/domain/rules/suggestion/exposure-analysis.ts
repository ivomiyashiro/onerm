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
  const { prescription } = exposure;
  const workingLoadKg = workingLoad(exposure);
  const withW: ExposureSet[] =
    workingLoadKg === null
      ? [...exposure.sets]
      : exposure.sets.filter(
          (set) => set.loadKg !== null && areLoadsEqual(set.loadKg, workingLoadKg),
        );
  const repsWithW = withW.map((set) => set.reps);
  const { min, max } = prescription.repRange;

  const allAtCap = repsWithW.every((reps) => reps >= max);
  const range: RangePosition =
    withW.length >= prescription.sets && allAtCap
      ? 'capReached'
      : repsWithW.every((reps) => reps >= min)
        ? 'within'
        : 'below';

  let limiting: ExposureSet | null = null;
  for (const set of withW) {
    if (set.side !== null && (limiting === null || set.reps < limiting.reps)) limiting = set;
  }

  return {
    workingLoadKg,
    repsWithW,
    rirsWithW: withW.flatMap((set) => (set.rir === null ? [] : [set.rir])),
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
