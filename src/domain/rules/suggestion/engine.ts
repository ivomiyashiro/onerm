import type { LocalDate } from '@/domain/models/local-date';
import type { Prescription } from '@/domain/models/prescription';
import type { LoadType } from '@/domain/models/vocabulary';
import { workingLoad, type Exposure } from '@/domain/rules/suggestion/exposures';
import { nearestOnGrid, type LoadGrid } from '@/domain/rules/suggestion/load-grid';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';
import { suggestWithoutRoutineHistory } from '@/domain/rules/suggestion/without-routine-history';

/** The inputs of the fold besides the ERR (RN-SUG-17). */
export interface SuggestionContext {
  /** The only date the engine sees (RN-SUG-16); the reentry uses it (RN-SUG-05). */
  readonly today: LocalDate;
  /** Every finished workout of the user, in any routine (RN-SUG-05). */
  readonly workoutDates: readonly { readonly startedAt: Date; readonly finishedAt: Date }[];
  /** The current prescription of the routine exercise. */
  readonly prescription: Prescription;
  readonly loadType: LoadType;
  readonly grid: LoadGrid;
  /** The EE of the exercise (RN-SUG-01), for the e1RM and as alternative history. */
  readonly exerciseExposures: readonly Exposure[];
}

/** What the fold remembers of the ERR seen so far (ADR-0009). Nothing of it is stored. */
export interface EngineState {
  readonly lastExposure: Exposure | null;
}

export const INITIAL_ENGINE_STATE: EngineState = { lastExposure: null };

/** One ERR, in order of `finishedAt`. */
export function step(_state: EngineState, exposure: Exposure): EngineState {
  return { lastExposure: exposure };
}

/** A priority of the decision order: its suggestion, or null when it doesn't apply. */
type Priority = (state: EngineState, context: SuggestionContext) => Suggestion | null;

/** 1. Without ERR (RN-SUG-02, 06, 08). Bodyweight with history is RN-SUG-12 (#23). */
const withoutRoutineHistory: Priority = (state, context) => {
  if (state.lastExposure !== null) return null;
  if (context.loadType === 'bodyweight') {
    if (context.exerciseExposures.length > 0) return null;
    return {
      loadKg: null,
      reps: context.prescription.repRange.min,
      reason: { code: 'BODYWEIGHT_CALIBRATION' },
    };
  }
  return suggestWithoutRoutineHistory(
    context.exerciseExposures,
    context.prescription,
    context.grid,
  );
};

/** The decision order (RN-SUG, «Orden de decisión»): the first one that applies wins. */
const PRIORITIES: readonly Priority[] = [withoutRoutineHistory];

/**
 * 9. Below the range (RN-SUG-02): W and the floor. The last priority, and for now the answer for
 * every routine exercise with history until priorities 2–8 arrive (#23, #24).
 */
function repeat(state: EngineState, context: SuggestionContext): Suggestion {
  const workingLoadKg = state.lastExposure && workingLoad(state.lastExposure);
  return {
    loadKg: workingLoadKg === null ? null : nearestOnGrid(workingLoadKg, context.grid),
    reps: context.prescription.repRange.min,
    reason: { code: 'REPEAT', workingLoadKg },
  };
}

export function suggest(state: EngineState, context: SuggestionContext): Suggestion {
  for (const priority of PRIORITIES) {
    const suggestion = priority(state, context);
    if (suggestion !== null) return suggestion;
  }
  return repeat(state, context);
}

/** The suggestion for a routine exercise: the fold over its ERR, then `suggest` (ADR-0009). */
export function suggestNext(
  routineExposures: readonly Exposure[],
  context: SuggestionContext,
): Suggestion {
  return suggest(routineExposures.reduce(step, INITIAL_ENGINE_STATE), context);
}
