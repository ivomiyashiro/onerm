import type { Prescription } from '@/domain/models/prescription';
import type { Id } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import { limitingSide } from '@/domain/rules/limiting-side';
import { estimatedOneRepMax } from '@/domain/rules/suggestion/e1rm';
import { floorToGrid, type LoadGrid } from '@/domain/rules/suggestion/load-grid';
import { SUGGESTION_PARAMETERS } from '@/domain/rules/suggestion/parameters';
import type { Side, Suggestion } from '@/domain/rules/suggestion/suggestion';
import {
  estimateFromE1rm,
  fromWorkingLoad,
} from '@/domain/rules/suggestion/without-routine-history';
import { fromUnit } from '@/domain/rules/units';

const { E1RM_MAX, CALIBRATION_STEP_UP, CALIBRATION_STEP_DOWN } = SUGGESTION_PARAMETERS;

export interface CalibrationSetInput {
  /** The set just logged; in calibration its effort is required, except with 0 reps. */
  readonly set: WorkoutSet;
  readonly exerciseId: Id;
  readonly prescription: Prescription;
  readonly grid: LoadGrid;
}

/** The reps and effort the engine reads: a unilateral set by its limiting side (RN-ENT-06). */
function performance(set: WorkoutSet): { reps: number; rir: number | null; side: Side } {
  if (!set.isUnilateral) return { reps: set.reps, rir: set.rir, side: null };
  const { reps, rir, side } = limitingSide(set);
  return { reps, rir, side };
}

/**
 * RN-SUG-06: the suggestion for the next set of a calibration (external load, no EE). The only
 * one that is recalculated set by set (RN-SUG-13). Always the floor.
 * - 0 reps: 20 % down (CALIBRATION_STEP_DOWN).
 * - RTF over 15: 20 % up, at least one increment (CALIBRATION_STEP).
 * - Otherwise the e1RM of that set gives the load (RN-SUG-08) and the calibration ends.
 */
export function suggestAfterCalibrationSet({
  set,
  exerciseId,
  prescription,
  grid,
}: CalibrationSetInput): Suggestion {
  const reps = prescription.repRange.min;
  const { loadKg } = set;
  // The first set is still empty: keep calibrating (RN-ENT-04).
  if (loadKg === null) return { loadKg: null, reps, reason: { code: 'CALIBRATION' } };

  const done = performance(set);
  if (done.reps === 0) {
    return {
      // Down to the grid is always below the load; the minimum load wins over that.
      loadKg: floorToGrid(loadKg * (1 - CALIBRATION_STEP_DOWN), grid),
      reps,
      reason: { code: 'CALIBRATION_STEP_DOWN', side: done.side },
    };
  }

  const repsToFailure = done.reps + (done.rir ?? 0);
  if (repsToFailure > E1RM_MAX) {
    const increment = fromUnit(grid.increment, grid.unit);
    return {
      // Down to the grid also for `load + inc`, so a load typed off the grid lands on it
      // (RN-SUG-09); it still ends above the load.
      loadKg: floorToGrid(Math.max(loadKg + increment, loadKg * (1 + CALIBRATION_STEP_UP)), grid),
      reps,
      reason: {
        code: 'CALIBRATION_STEP',
        reps: done.reps,
        rir: done.rir,
        repsToFailure,
        side: done.side,
      },
    };
  }

  // reps ≥ 1 and RTF ≤ 15: there is an e1RM.
  const e1rm = estimatedOneRepMax(loadKg, done.reps, done.rir);
  const estimated =
    e1rm &&
    estimateFromE1rm(
      {
        e1rm,
        basis: { exerciseId, at: set.completedAt, loadKg, reps: done.reps, side: done.side },
      },
      prescription,
      grid,
    );
  // The target RTF is over 15: RN-SUG-08 goes on with the load of this set.
  return (
    estimated ??
    fromWorkingLoad(
      loadKg,
      prescription,
      grid,
      done.side === null ? null : { side: done.side, reps: done.reps },
    )
  );
}
