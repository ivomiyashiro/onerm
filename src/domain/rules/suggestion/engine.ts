import { areLoadsEqual } from '@/domain/rules/load-equality';
import { suggestBodyweight } from '@/domain/rules/suggestion/bodyweight';
import { consolidate, increaseByEffort } from '@/domain/rules/suggestion/effort';
import type {
  EngineState,
  Priority,
  RoutineExposureRecord,
  SuggestionContext,
} from '@/domain/rules/suggestion/engine-types';
import { analyseExposure } from '@/domain/rules/suggestion/exposure-analysis';
import type { Exposure } from '@/domain/rules/suggestion/exposures';
import { belowRange, capReached, withinRange } from '@/domain/rules/suggestion/progression';
import type { Suggestion, SuggestionCode } from '@/domain/rules/suggestion/suggestion';
import { suggestWithoutRoutineHistory } from '@/domain/rules/suggestion/without-routine-history';

export const INITIAL_ENGINE_STATE: EngineState = { records: [] };

/** 1. Without ERR (RN-SUG-02, 06, 08). */
const withoutRoutineHistory: Priority = (state, context) =>
  state.records.length > 0
    ? null
    : suggestWithoutRoutineHistory(context.exerciseExposures, context.prescription, context.grid);

/**
 * The decision order for external load (RN-SUG, «Orden de decisión»): the first one that
 * applies wins. Priorities 2–4 arrive with #24.
 */
const PRIORITIES: readonly Priority[] = [
  withoutRoutineHistory,
  consolidate,
  increaseByEffort,
  capReached,
  withinRange,
  belowRange,
];

export function suggest(state: EngineState, context: SuggestionContext): Suggestion {
  if (context.loadType === 'bodyweight') return suggestBodyweight(state, context);
  for (const priority of PRIORITIES) {
    const suggestion = priority(state, context);
    if (suggestion !== null) return suggestion;
  }
  // Unreachable with I-06: an external-load ERR always has a W, and belowRange takes it.
  return suggestWithoutRoutineHistory([], context.prescription, context.grid);
}

/** RN-SUG-04: the ERR done after one of these suggestions starts a new best mark and count. */
const RESET_AFTER: readonly SuggestionCode[] = [
  'DELOAD',
  'REENTRY',
  'PRESCRIPTION_CHANGED',
  'ESTIMATED_FROM_E1RM',
  'FROM_EXERCISE_HISTORY',
  'CALIBRATION',
  'CALIBRATION_STEP',
  'CALIBRATION_STEP_DOWN',
];

/**
 * The context right before an ERR (RN-SUG-17): its prescription copy, and only the EE and
 * workouts finished before it started.
 */
function contextBefore(exposure: Exposure, context: SuggestionContext): SuggestionContext {
  const before = (item: { finishedAt: Date }) => item.finishedAt < exposure.startedAt;
  return {
    ...context,
    prescription: exposure.prescription,
    exerciseExposures: context.exerciseExposures.filter(before),
    workoutDates: context.workoutDates.filter(before),
  };
}

/**
 * One ERR, in order of `finishedAt`. It recalculates what was suggested right before it, and
 * whether it resets (RN-SUG-04): after a suggestion of RESET_AFTER, with a W lower than the
 * previous one (the user lowered the load), or with a different N.
 */
export function step(
  state: EngineState,
  exposure: Exposure,
  context: SuggestionContext,
): EngineState {
  const suggestionBefore = suggest(state, contextBefore(exposure, context));
  const analysis = analyseExposure(exposure);
  const previous = state.records.at(-1)?.analysis;
  const w = analysis.workingLoadKg;
  const previousW = previous?.workingLoadKg ?? null;
  const lowerW = w !== null && previousW !== null && w < previousW && !areLoadsEqual(w, previousW);
  const record: RoutineExposureRecord = {
    exposure,
    analysis,
    suggestionBefore,
    isReset:
      previous === undefined ||
      RESET_AFTER.includes(suggestionBefore.reason.code) ||
      lowerW ||
      analysis.setCount !== previous.setCount,
  };
  return { records: [...state.records, record] };
}

/** The fold over the ERR of a routine exercise (ADR-0009). */
export function fold(
  routineExposures: readonly Exposure[],
  context: SuggestionContext,
): EngineState {
  return routineExposures.reduce(
    (state, exposure) => step(state, exposure, context),
    INITIAL_ENGINE_STATE,
  );
}

/** The suggestion for a routine exercise: `suggest` over the fold of its ERR. */
export function suggestNext(
  routineExposures: readonly Exposure[],
  context: SuggestionContext,
): Suggestion {
  return suggest(fold(routineExposures, context), context);
}
