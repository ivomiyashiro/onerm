import type { Exercise } from '@/domain/models/exercise';
import type { LocalDate } from '@/domain/models/local-date';
import type { Prescription } from '@/domain/models/prescription';
import type { Profile } from '@/domain/models/profile';
import type { Id, LoadType } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import { suggestForExercise, suggestNext } from '@/domain/rules/suggestion/engine';
import type { SuggestionContext } from '@/domain/rules/suggestion/engine-types';
import { exerciseExposures, routineExposures } from '@/domain/rules/suggestion/exposures';
import { loadGridFor } from '@/domain/rules/suggestion/load-grid-for';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';

/** What the engine reads besides the exercise: the profile, the catalog and the history. */
export interface SuggestionInputs {
  readonly profile: Profile;
  readonly catalog: ReadonlyMap<Id, Exercise>;
  /** The finished workouts; one in progress is never history (RN-SUG-01). */
  readonly finished: readonly Workout[];
  readonly today: LocalDate;
  readonly localDate: (instant: Date) => LocalDate;
}

/** A routine exercise, or the exercise of a workout with the prescription copied at start. */
export interface SuggestionTarget {
  /** Null for an unplanned exercise (RN-SUG-15). */
  readonly routineExerciseId: Id | null;
  readonly exerciseId: Id;
  readonly prescription: Prescription;
  /** The copy of a workout exercise (RN-ENT-08); the catalog's otherwise. */
  readonly loadType?: LoadType;
}

/**
 * RF-SUG-01: the suggestion for one exercise, from the whole local history (RN-SUG-01). An
 * exercise not in the local catalog yet counts as external load with the default grid (RN-CAT-04).
 * A substitute or an unplanned exercise goes by its own history in any context (RN-SUG-15).
 */
export function suggestionFor(target: SuggestionTarget, inputs: SuggestionInputs): Suggestion {
  const exercise = inputs.catalog.get(target.exerciseId) ?? null;
  const loadType = target.loadType ?? exercise?.loadType ?? 'external';
  const context: SuggestionContext = {
    today: inputs.today,
    localDate: inputs.localDate,
    workoutDates: inputs.finished.flatMap(({ startedAt, finishedAt }) =>
      finishedAt === null ? [] : [{ startedAt, finishedAt }],
    ),
    prescription: target.prescription,
    loadType,
    // Bodyweight has no grid and the engine never reads it there; the default keeps the type whole.
    grid: loadGridFor(inputs.profile, exercise) ?? loadGridFor(inputs.profile, null)!,
    exerciseExposures: exerciseExposures(target.exerciseId, inputs.finished),
  };
  if (target.routineExerciseId === null) return suggestForExercise(context);
  return suggestNext(
    routineExposures(
      { id: target.routineExerciseId, exerciseId: target.exerciseId },
      inputs.finished,
    ),
    context,
  );
}
