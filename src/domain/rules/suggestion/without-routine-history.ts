import type { Prescription } from '@/domain/models/prescription';
import { estimatedOneRepMax, loadForTarget, type E1rm } from '@/domain/rules/suggestion/e1rm';
import { workingLoad, type Exposure } from '@/domain/rules/suggestion/exposures';
import { floorToGrid, nearestOnGrid, type LoadGrid } from '@/domain/rules/suggestion/load-grid';
import { analyseExposure } from '@/domain/rules/suggestion/exposure-analysis';
import type { EstimateBasis, LimitingSide, Suggestion } from '@/domain/rules/suggestion/suggestion';

/** The highest e1RM among the sets of an exposure, with the set it comes from (RN-SUG-07). */
export function exposureE1rm(exposure: Exposure): { e1rm: E1rm; basis: EstimateBasis } | null {
  let best: { e1rm: E1rm; basis: EstimateBasis } | null = null;
  for (const set of exposure.sets) {
    if (set.loadKg === null) continue;
    const e1rm = estimatedOneRepMax(set.loadKg, set.reps, set.rir);
    if (e1rm !== null && (best === null || e1rm.value > best.e1rm.value)) {
      best = {
        e1rm,
        basis: {
          exerciseId: exposure.exerciseId,
          at: exposure.finishedAt,
          loadKg: set.loadKg,
          reps: set.reps,
          side: set.side,
        },
      };
    }
  }
  return best;
}

/** RN-SUG-08: the e1RM of the most recent EE that has one. RN-SUG-14 uses it too. */
export function latestE1rm(
  exposures: readonly Exposure[],
): { e1rm: E1rm; basis: EstimateBasis } | null {
  for (let i = exposures.length - 1; i >= 0; i--) {
    const found = exposureE1rm(exposures[i]);
    if (found !== null) return found;
  }
  return null;
}

/**
 * RN-SUG-08: the load from an e1RM, down to the grid and never under the minimum load, with the
 * floor. Null when the target RTF is over 15.
 */
export function estimateFromE1rm(
  estimate: { e1rm: E1rm; basis: EstimateBasis },
  prescription: Prescription,
  grid: LoadGrid,
): Suggestion | null {
  const load = loadForTarget(estimate.e1rm.value, prescription.repRange, prescription.targetRir);
  if (load === null) return null;
  return {
    loadKg: floorToGrid(load, grid),
    reps: prescription.repRange.min,
    reason: { code: 'ESTIMATED_FROM_E1RM', ...estimate },
  };
}

/** RN-SUG-02: W of the exposure, on the grid, with the floor of the current range. */
export function fromWorkingLoad(
  workingLoadKg: number,
  prescription: Prescription,
  grid: LoadGrid,
  limitingSide: LimitingSide | null,
): Suggestion {
  return {
    loadKg: nearestOnGrid(workingLoadKg, grid),
    reps: prescription.repRange.min,
    reason: { code: 'FROM_EXERCISE_HISTORY', workingLoadKg, limitingSide },
  };
}

/**
 * Priority 1 for external load (RN-SUG-02): an estimate from the exercise history in any context,
 * its last W, or calibration when there is none (RN-SUG-06).
 */
export function suggestWithoutRoutineHistory(
  exerciseExposures: readonly Exposure[],
  prescription: Prescription,
  grid: LoadGrid,
): Suggestion {
  const estimate = latestE1rm(exerciseExposures);
  const estimated = estimate && estimateFromE1rm(estimate, prescription, grid);
  if (estimated) return estimated;
  const last = exerciseExposures.at(-1);
  // An external-load set always has a load (I-06): no W means no exposure.
  const workingLoadKg = last === undefined ? null : workingLoad(last);
  if (last === undefined || workingLoadKg === null) {
    return { loadKg: null, reps: prescription.repRange.min, reason: { code: 'CALIBRATION' } };
  }
  const { limitingSide } = analyseExposure(last);
  return fromWorkingLoad(workingLoadKg, prescription, grid, limitingSide);
}
