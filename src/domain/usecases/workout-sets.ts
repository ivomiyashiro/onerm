import type { Id } from '@/domain/models/vocabulary';
import type {
  BilateralSet,
  UnilateralSet,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '@/domain/models/workout';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { sortByPosition } from '@/domain/rules/position-order';
import type { Violation } from '@/domain/rules/violation';
import {
  isEffectiveSet,
  validateWorkoutSet,
  type SetViolationCode,
} from '@/domain/rules/workout-set-rules';
import { firstValue } from '@/domain/usecases/observe-together';

type SetMeta = 'id' | 'workoutExerciseId' | 'position' | 'completedAt';

/** What the user enters for a set; the rest comes from where it is logged. */
export type SetInput = Omit<BilateralSet, SetMeta> | Omit<UnilateralSet, SetMeta>;

export type SetWriteResult =
  | { readonly status: 'saved'; readonly set: WorkoutSet }
  | { readonly status: 'invalid'; readonly violations: Violation<SetViolationCode>[] }
  /** The workout or the set is gone (finished or discarded elsewhere). */
  | { readonly status: 'missing' };

type Workouts = Pick<WorkoutRepository, 'observeInProgress' | 'save'>;

/**
 * RN-ENT-09: an exercise with effective sets is done, also after being skipped. Without them it
 * goes back to pending, or stays skipped.
 */
function withSets(exercise: WorkoutExercise, sets: readonly WorkoutSet[]): WorkoutExercise {
  const sorted = sortByPosition(sets);
  const status = sorted.some(isEffectiveSet)
    ? 'done'
    : exercise.status === 'skipped'
      ? 'skipped'
      : 'pending';
  return { ...exercise, status, sets: sorted };
}

function replaceExercise(workout: Workout, exercise: WorkoutExercise): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((e) => (e.id === exercise.id ? exercise : e)),
  };
}

const inProgress = (workouts: Workouts) =>
  firstValue<Workout | null>((o) => workouts.observeInProgress(o));

function exerciseOfSet(workout: Workout, setId: Id) {
  return workout.exercises.find((e) => e.sets.some((s) => s.id === setId));
}

/** Validates against the copy of the workout exercise and saves it (RN-ENT-02, RN-SYNC-01). */
async function write(
  workouts: Workouts,
  workout: Workout,
  exercise: WorkoutExercise,
  set: WorkoutSet,
): Promise<SetWriteResult> {
  const violations = validateWorkoutSet(set, exercise);
  if (violations.length > 0) return { status: 'invalid', violations };
  const sets = [...exercise.sets.filter((s) => s.id !== set.id), set];
  await workouts.save(replaceExercise(workout, withSets(exercise, sets)));
  return { status: 'saved', set };
}

/** RF-ENT-02, RF-ENT-03, RF-ENT-05, RF-ENT-14: a new set at the end of the exercise. */
export class LogSet {
  constructor(
    private readonly workouts: Workouts,
    private readonly newId: () => Id,
    private readonly now: () => Date,
  ) {}

  async execute(workoutExerciseId: Id, input: SetInput): Promise<SetWriteResult> {
    const workout = await inProgress(this.workouts);
    const exercise = workout?.exercises.find((e) => e.id === workoutExerciseId);
    if (!workout || !exercise) return { status: 'missing' };
    const position = Math.max(-1, ...exercise.sets.map((s) => s.position)) + 1;
    const set = {
      ...input,
      id: this.newId(),
      workoutExerciseId,
      position,
      completedAt: this.now(),
    } as WorkoutSet;
    return write(this.workouts, workout, exercise, set);
  }
}

/** RF-ENT-04.AC1: corrects a set of the workout in progress; it keeps its place and time. */
export class UpdateSet {
  constructor(private readonly workouts: Workouts) {}

  async execute(setId: Id, input: SetInput): Promise<SetWriteResult> {
    const workout = await inProgress(this.workouts);
    const exercise = workout && exerciseOfSet(workout, setId);
    const current = exercise?.sets.find((s) => s.id === setId);
    if (!workout || !exercise || !current) return { status: 'missing' };
    const { id, workoutExerciseId, position, completedAt } = current;
    const set = { ...input, id, workoutExerciseId, position, completedAt } as WorkoutSet;
    return write(this.workouts, workout, exercise, set);
  }
}

/** RF-ENT-04.AC2: removes a set and hands it back, for «Deshacer». */
export class DeleteSet {
  constructor(private readonly workouts: Workouts) {}

  async execute(setId: Id): Promise<WorkoutSet | null> {
    const workout = await inProgress(this.workouts);
    const exercise = workout && exerciseOfSet(workout, setId);
    const set = exercise?.sets.find((s) => s.id === setId);
    if (!workout || !exercise || !set) return null;
    const sets = exercise.sets.filter((s) => s.id !== setId);
    await this.workouts.save(replaceExercise(workout, withSets(exercise, sets)));
    return set;
  }
}

/**
 * RF-ENT-04.AC2: «Deshacer» puts the set back where it was. With a new id: the deleted row is a
 * tombstone, and a deleted row never comes back (RN-SYNC-15).
 */
export class RestoreSet {
  constructor(
    private readonly workouts: Workouts,
    private readonly newId: () => Id,
  ) {}

  async execute(set: WorkoutSet): Promise<void> {
    const workout = await inProgress(this.workouts);
    const exercise = workout?.exercises.find((e) => e.id === set.workoutExerciseId);
    if (!workout || !exercise) return;
    const sets = [...exercise.sets, { ...set, id: this.newId() }];
    await this.workouts.save(replaceExercise(workout, withSets(exercise, sets)));
  }
}
