import type { EffortMode, ExperienceLevel, Id } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import { sortByPosition } from '@/domain/rules/shared/position-order';
import { prefill } from '@/domain/rules/workout/prefill';
import { isOpen, remainingSets } from '@/domain/rules/workout/remaining-sets';
import { hasEffort, valuesOf } from '@/domain/rules/workout/set-values';
import type {
  WorkoutExerciseView,
  WorkoutOverview,
} from '@/domain/usecases/workout/observe-workout';
import type { IconName } from '@/presentation/components/icons/icon';
import { reasonIcon, reasonLine, type ReasonInput } from '@/presentation/shared/reason-text';
import type { SetRowView } from '@/presentation/shared/set/set-row';

/**
 * What S09 shows, derived from the workout and what the user chose in memory (the exercise, the
 * added sets, the set whose effort is asked). Plain functions: no React.
 */

export interface WorkoutContent {
  status: 'content';
  dayName: string;
  startedAt: Date;
  effortMode: EffortMode;
  level: ExperienceLevel;
  exerciseIndex: number;
  exercises: readonly WorkoutExerciseView[];
  exercise: WorkoutExerciseView;
  /**
   * The current exercise is skipped: an original replaced without effective sets (RN-ENT-10). Its
   * sets can still be logged (RF-ENT-08.AC3).
   */
  skipped: boolean;
  rows: SetRowView[];
  /** RF-SUG-07.AC1: the reason of the suggestion, under the exercise. */
  reason: { line: string; icon: IconName };
  /**
   * What the main button does: log the current set, go to the next exercise, wait for the effort
   * of a calibration set (RF-SUG-02.AC4) or, with nothing left, finish (RF-ENT-11).
   */
  primary: 'done' | 'nextExercise' | 'awaitEffort' | 'finish';
  /** The calibration set whose effort is asked below, with its number. */
  awaitingEffort: { set: WorkoutSet; number: number } | null;
}

export type WorkoutState =
  | { status: 'loading' }
  /** No workout in progress (finished or discarded elsewhere): back to the tabs. */
  | { status: 'none' }
  | { status: 'error' }
  | WorkoutContent;

/** The rows of an exercise: logged sets, then the current one and the rest still to do. */
function rowsOf(view: WorkoutExerciseView, extra: number, effortSetId: Id | null): SetRowView[] {
  const sets = sortByPosition(view.exercise.sets);
  const rows: SetRowView[] = sets.map((set, index) => ({
    kind: 'done',
    number: index + 1,
    set,
    askEffort: set.id === effortSetId && !hasEffort(set),
    missingEffort: set.id === view.awaitingEffort?.id,
  }));
  const remaining = remainingSets(view.exercise, extra);
  const prescribedLeft = remainingSets(view.exercise);
  for (let i = 0; i < remaining; i++) {
    rows.push({
      kind: i === 0 ? 'current' : 'pending',
      number: sets.length + i + 1,
      // RF-ENT-05: an extra set starts with the values of the last one.
      values:
        i >= prescribedLeft && sets.length > 0
          ? valuesOf(sets.at(-1)!)
          : prefill(view.suggestion, sets, view.recalculated),
      extra: i >= prescribedLeft,
    });
  }
  return rows;
}

export function contentOf(
  overview: WorkoutOverview | null | 'loading' | 'error',
  chosenIndex: number | null,
  extras: Record<Id, number>,
  effortSetId: Id | null,
  passedOver: ReadonlySet<Id>,
): WorkoutState {
  if (overview === 'loading') return { status: 'loading' };
  if (overview === 'error') return { status: 'error' };
  if (overview === null || overview.exercises.length === 0) return { status: 'none' };
  const { exercises } = overview;
  const extraOf = (id: Id) => extras[id] ?? 0;
  // Until the user picks one, the first exercise with sets left (RF-ENT-13 resumes there too).
  // Nothing is passed over yet: that only happens when the user moves, which picks one.
  const firstOpen = exercises.findIndex((e) => isOpen(e.exercise, extraOf(e.exercise.id)));
  const exerciseIndex = Math.min(chosenIndex ?? Math.max(firstOpen, 0), exercises.length - 1);
  const exercise = exercises[exerciseIndex];
  const rows = rowsOf(exercise, extraOf(exercise.exercise.id), effortSetId);
  const waiting = rows.find((row) => row.kind === 'done' && row.missingEffort);
  const anyLeft = exercises.some((e) => isOpen(e.exercise, extraOf(e.exercise.id), passedOver));
  return {
    status: 'content',
    dayName: overview.workout.dayNameSnapshot,
    startedAt: overview.workout.startedAt,
    effortMode: overview.effortMode,
    level: overview.level,
    exerciseIndex,
    exercises,
    exercise,
    skipped: exercise.exercise.status === 'skipped',
    rows,
    reason: {
      line: reasonLine(reasonInputOf(overview, exercise)),
      icon: reasonIcon(exercise.suggestion.reason.code),
    },
    primary: rows.some((r) => r.kind === 'current')
      ? waiting
        ? 'awaitEffort'
        : 'done'
      : anyLeft
        ? 'nextExercise'
        : 'finish',
    awaitingEffort: waiting?.kind === 'done' ? { set: waiting.set, number: waiting.number } : null,
  };
}

export function reasonInputOf(
  { level, effortMode }: Pick<WorkoutOverview, 'level' | 'effortMode'>,
  view: WorkoutExerciseView,
): ReasonInput {
  return {
    explanation: view.explanation,
    level,
    effortMode,
    // Bodyweight shows no load: any unit will do.
    unit: view.grid?.unit ?? 'kg',
    basisName: view.basisName,
  };
}
