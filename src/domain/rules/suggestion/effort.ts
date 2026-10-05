import { areLoadsEqual } from '@/domain/rules/load-equality';
import type {
  EngineState,
  Priority,
  RoutineExposureRecord,
} from '@/domain/rules/suggestion/engine-types';
import { increaseLoad, nearestOnGrid } from '@/domain/rules/suggestion/load-grid';
import { SUGGESTION_PARAMETERS } from '@/domain/rules/suggestion/parameters';
import { lastLoadedRecord } from '@/domain/rules/suggestion/progression';

const {
  SUSTAINED_SIGNAL,
  EFFORT_DEVIATION,
  SIMPLE_SCALE_MAX_RIR,
  MAX_CONSECUTIVE_CONSOLIDATIONS,
  LOAD_INCREASE,
  LOAD_INCREASE_HIGH,
} = SUGGESTION_PARAMETERS;

const mean = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * RN-SUG-03: the mean RIR of the sets with W in each of the last `SUSTAINED_SIGNAL` ERR, oldest
 * first. Null unless they share W, no reset happens in between and each one reported effort.
 */
function sustainedMeanRirs(
  state: EngineState,
): { record: RoutineExposureRecord; meanRir: number }[] | null {
  const window = state.records.slice(-SUSTAINED_SIGNAL);
  if (window.length < SUSTAINED_SIGNAL) return null;
  const [first, ...rest] = window;
  const w = first.analysis.workingLoadKg;
  if (w === null) return null;
  // The first one may be a reset: the signal starts there.
  if (rest.some((record) => record.isReset)) return null;
  if (
    window.some(
      (record) =>
        record.analysis.workingLoadKg === null || !areLoadsEqual(record.analysis.workingLoadKg, w),
    )
  )
    return null;
  if (window.some((record) => record.analysis.rirsWithW.length === 0)) return null;
  return window.map((record) => ({ record, meanRir: mean(record.analysis.rirsWithW) }));
}

/** The consecutive CONSOLIDATE suggestions right before the last ERR. */
function consolidationsInARow(state: EngineState): number {
  let count = 0;
  for (let i = state.records.length - 1; i >= 0; i--) {
    if (state.records[i].suggestionBefore.reason.code !== 'CONSOLIDATE') break;
    count++;
  }
  return count;
}

/**
 * 5. Consolidate (RN-SUG-03): a sustained mean RIR at or under máx(target − 2, 0), and under the
 * target, with the cap reached in the last ERR → the same W at the cap. Only once in a row: then
 * priority 7 goes on (caso B).
 */
export const consolidate: Priority = (state, context) => {
  const last = lastLoadedRecord(state);
  if (last === null || last.analysis.range !== 'capReached') return null;
  if (consolidationsInARow(state) >= MAX_CONSECUTIVE_CONSOLIDATIONS) return null;
  const signal = sustainedMeanRirs(state);
  const isHard = signal?.every(({ record, meanRir }) => {
    const target = record.analysis.targetRir;
    return meanRir <= Math.max(target - EFFORT_DEVIATION, 0) && meanRir < target;
  });
  if (!signal || !isHard) return null;
  const { workingLoadKg, analysis } = last;
  return {
    loadKg: nearestOnGrid(workingLoadKg, context.grid),
    reps: analysis.repRange.max,
    reason: {
      code: 'CONSOLIDATE',
      meanRir: signal[signal.length - 1].meanRir,
      workingLoadKg,
      limitingSide: analysis.limitingSide,
    },
  };
};

/**
 * 6. Early or high increase (RN-SUG-03): a sustained mean RIR at or over mín(target + 2, 4), and
 * over the target. Inside the range, +5 % (EARLY_INCREASE); with the cap, +10 % (HIGH_INCREASE).
 * Below the range it doesn't apply.
 */
export const increaseByEffort: Priority = (state, context) => {
  const last = lastLoadedRecord(state);
  if (last === null || last.analysis.range === 'below') return null;
  const signal = sustainedMeanRirs(state);
  const isEasy = signal?.every(({ record, meanRir }) => {
    const target = record.analysis.targetRir;
    return meanRir >= Math.min(target + EFFORT_DEVIATION, SIMPLE_SCALE_MAX_RIR) && meanRir > target;
  });
  if (!signal || !isEasy) return null;
  const { workingLoadKg, analysis } = last;
  const high = analysis.range === 'capReached';
  return {
    loadKg: increaseLoad(workingLoadKg, high ? LOAD_INCREASE_HIGH : LOAD_INCREASE, context.grid),
    reps: analysis.repRange.min,
    reason: {
      code: high ? 'HIGH_INCREASE' : 'EARLY_INCREASE',
      meanRir: signal[signal.length - 1].meanRir,
      workingLoadKg,
      limitingSide: analysis.limitingSide,
    },
  };
};
