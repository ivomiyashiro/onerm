import type { LocalDate } from '@/domain/models/local-date';
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
import { byFinishedAt, firstFinishedFrom } from '@/domain/rules/suggestion/history-order';
import { prescriptionChanged } from '@/domain/rules/suggestion/prescription-change';
import { belowRange, capReached, withinRange } from '@/domain/rules/suggestion/progression';
import { reentry, withReentry } from '@/domain/rules/suggestion/reentry';
import { deload, nextStagnation } from '@/domain/rules/suggestion/stagnation';
import type { Suggestion, SuggestionCode } from '@/domain/rules/suggestion/suggestion';
import { suggestWithoutRoutineHistory } from '@/domain/rules/suggestion/without-routine-history';

export const INITIAL_ENGINE_STATE: EngineState = { records: [], lastLoaded: null };

/**
 * 1. Without ERR (RN-SUG-02, 06, 08), with the reentry as a modifier. Its base is the EE of the
 * estimate, or the last EE when it keeps its W (RN-SUG-05).
 */
const withoutRoutineHistory: Priority = (state, context) => {
  if (state.records.length > 0) return null;
  const suggestion = suggestWithoutRoutineHistory(
    context.exerciseExposures,
    context.prescription,
    context.grid,
  );
  const { reason } = suggestion;
  if (reason.code === 'ESTIMATED_FROM_E1RM')
    return withReentry(suggestion, reason.basis.at, context);
  const lastExercise = context.exerciseExposures.at(-1);
  if (reason.code === 'FROM_EXERCISE_HISTORY' && lastExercise !== undefined) {
    return withReentry(suggestion, lastExercise.finishedAt, context);
  }
  return suggestion;
};

/** The decision order for external load (RN-SUG, «Orden de decisión»): the first that applies wins. */
const PRIORITIES: readonly Priority[] = [
  withoutRoutineHistory,
  prescriptionChanged,
  reentry,
  deload,
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
 * The context right before an ERR (RN-SUG-17): its prescription copy, only the EE and workouts
 * finished before it started, and the local date of its `startedAt` as "today". The lists are
 * ordered (orderedContext), so "before" is a prefix found by binary search. Copying that prefix
 * at every step made the fold quadratic (RNF-13), so:
 * - the EE are cut only when a priority reads them (priority 1, and 2 when the range changed);
 * - with an earlier ERR, the workouts start at its `finishedAt`: the base of the reentry is that
 *   ERR (RN-SUG-05), so nothing older is ever read.
 */
function contextBefore(
  state: EngineState,
  exposure: Exposure,
  context: SuggestionContext,
): SuggestionContext {
  const { workoutDates, exerciseExposures } = context;
  const lastErr = state.records.at(-1)?.exposure.finishedAt;
  const from = lastErr === undefined ? 0 : firstFinishedFrom(workoutDates, lastErr);
  let exercise: readonly Exposure[] | undefined;
  return {
    today: context.localDate(exposure.startedAt),
    localDate: context.localDate,
    prescription: exposure.prescription,
    loadType: context.loadType,
    grid: context.grid,
    workoutDates: workoutDates.slice(from, firstFinishedFrom(workoutDates, exposure.startedAt)),
    get exerciseExposures() {
      exercise ??= exerciseExposures.slice(
        0,
        firstFinishedFrom(exerciseExposures, exposure.startedAt),
      );
      return exercise;
    },
  };
}

/**
 * The context with its history ordered by `finishedAt`, as the engine reads it. `localDate` is
 * remembered per instant: the fold asks for the same workout dates at every step, and on Hermes
 * the conversion is one of the most expensive calls (RNF-13).
 */
export function orderedContext(context: SuggestionContext): SuggestionContext {
  const localDates = new Map<number, LocalDate>();
  return {
    ...context,
    localDate: (instant) => {
      const time = instant.getTime();
      let date = localDates.get(time);
      if (date === undefined) {
        date = context.localDate(instant);
        localDates.set(time, date);
      }
      return date;
    },
    workoutDates: byFinishedAt(context.workoutDates),
    exerciseExposures: byFinishedAt(context.exerciseExposures),
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
  const suggestionBefore = suggest(state, contextBefore(state, exposure, context));
  const analysis = analyseExposure(exposure);
  const previous = state.records.at(-1)?.analysis;
  const w = analysis.workingLoadKg;
  const previousW = previous?.workingLoadKg ?? null;
  const lowerW = w !== null && previousW !== null && w < previousW && !areLoadsEqual(w, previousW);
  const isReset =
    previous === undefined ||
    RESET_AFTER.includes(suggestionBefore.reason.code) ||
    lowerW ||
    analysis.setCount !== previous.setCount;
  const record: RoutineExposureRecord = {
    exposure,
    analysis,
    suggestionBefore,
    isReset,
    ...nextStagnation(state.records.at(-1), analysis, isReset),
  };
  const workingLoadKg = analysis.workingLoadKg;
  return {
    records: [...state.records, record],
    lastLoaded: workingLoadKg === null ? null : { ...record, workingLoadKg },
  };
}

/** The fold over the ERR of a routine exercise (ADR-0009). */
export function fold(
  routineExposures: readonly Exposure[],
  context: SuggestionContext,
): EngineState {
  const ordered = orderedContext(context);
  return routineExposures.reduce(
    (state, exposure) => step(state, exposure, ordered),
    INITIAL_ENGINE_STATE,
  );
}

/** The suggestion for a routine exercise: `suggest` over the fold of its ERR. */
export function suggestNext(
  routineExposures: readonly Exposure[],
  context: SuggestionContext,
): Suggestion {
  return suggest(fold(routineExposures, context), orderedContext(context));
}

/**
 * A substitute or an unplanned exercise (RN-SUG-15): the «without ERR» rule over the EE of that
 * exercise. The context carries the prescription copied from the routine exercise of origin, or
 * the accessory one of the goal for an unplanned exercise.
 */
export function suggestForExercise(context: SuggestionContext): Suggestion {
  return suggest(INITIAL_ENGINE_STATE, orderedContext(context));
}
