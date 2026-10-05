import { areLoadsEqual } from '@/domain/rules/load-equality';
import type {
  EngineState,
  Priority,
  RoutineExposureRecord,
} from '@/domain/rules/suggestion/engine-types';
import { increaseLoad, nearestOnGrid } from '@/domain/rules/suggestion/load-grid';
import { SUGGESTION_PARAMETERS } from '@/domain/rules/suggestion/parameters';

const { LOAD_INCREASE, MAX_JUMP_WITHOUT_OVERSHOOT, REP_OVERSHOOT } = SUGGESTION_PARAMETERS;

/** The last ERR with a W: double progression and effort work on it (RN-SUG-02, RN-SUG-03). */
export function lastLoadedRecord(
  state: EngineState,
): (RoutineExposureRecord & { workingLoadKg: number }) | null {
  const last = state.records.at(-1);
  const workingLoadKg = last?.analysis.workingLoadKg ?? null;
  return last === undefined || workingLoadKg === null ? null : { ...last, workingLoadKg };
}

/** The share a new load adds over W, for the reasons (13 §4: «+{p} %»). */
export function increasePercent(loadKg: number, workingLoadKg: number): number {
  return (loadKg - workingLoadKg) / workingLoadKg;
}

/**
 * 7. Cap reached (RN-SUG-02): up by 5 % back to the floor. When the smallest jump is over 10 %,
 * the reps go to cap + 2 first (EXTEND_REPS, caso G).
 */
export const capReached: Priority = (state, context) => {
  const last = lastLoadedRecord(state);
  if (last === null || last.analysis.range !== 'capReached') return null;
  const { workingLoadKg, analysis } = last;
  const { min, max } = analysis.repRange;
  const params = { workingLoadKg, limitingSide: analysis.limitingSide };

  const next = increaseLoad(workingLoadKg, LOAD_INCREASE, context.grid);
  const limit = workingLoadKg * (1 + MAX_JUMP_WITHOUT_OVERSHOOT);
  const bigJump = next > limit && !areLoadsEqual(next, limit);
  const overshootCap = max + REP_OVERSHOOT;
  if (bigJump && analysis.repsWithW.some((reps) => reps < overshootCap)) {
    return {
      loadKg: nearestOnGrid(workingLoadKg, context.grid),
      reps: Math.min(overshootCap, Math.min(...analysis.repsWithW) + 1),
      reason: {
        code: 'EXTEND_REPS',
        nextLoadKg: next,
        increasePercent: increasePercent(next, workingLoadKg),
        ...params,
      },
    };
  }
  return {
    loadKg: next,
    reps: min,
    reason: {
      code: 'INCREASE_LOAD',
      increasePercent: increasePercent(next, workingLoadKg),
      afterOvershoot: bigJump,
      ...params,
    },
  };
};

/**
 * 8. Within the range (RN-SUG-02): the same W and one more rep, up to the cap. At the cap in
 * fewer than N sets, complete the sets (caso Q).
 */
export const withinRange: Priority = (state, context) => {
  const last = lastLoadedRecord(state);
  if (last === null || last.analysis.range !== 'within') return null;
  const { workingLoadKg, analysis } = last;
  const { max } = analysis.repRange;
  const params = { workingLoadKg, limitingSide: analysis.limitingSide };
  const loadKg = nearestOnGrid(workingLoadKg, context.grid);

  if (analysis.repsWithW.every((reps) => reps >= max)) {
    return { loadKg, reps: max, reason: { code: 'COMPLETE_SETS', ...params } };
  }
  const previousReps = Math.min(...analysis.repsWithW);
  return {
    loadKg,
    reps: Math.min(max, previousReps + 1),
    reason: { code: 'ADD_REP', previousReps, ...params },
  };
};

/** 9. Below the range (RN-SUG-02): the same W and the floor. The last priority. */
export const belowRange: Priority = (state, context) => {
  const last = lastLoadedRecord(state);
  if (last === null) return null;
  const { workingLoadKg, analysis } = last;
  return {
    loadKg: nearestOnGrid(workingLoadKg, context.grid),
    reps: analysis.repRange.min,
    reason: { code: 'REPEAT', workingLoadKg, limitingSide: analysis.limitingSide },
  };
};
