import type { Id } from '@/domain/models/vocabulary';
import type { Workout, WorkoutSet } from '@/domain/models/workout';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { firstValue } from '@/domain/usecases/observe-together';
import {
  exerciseOfSet,
  replaceExercise,
  withSets,
  write,
  type SetInput,
  type SetWriteResult,
} from '@/domain/usecases/workout-sets';

type Workouts = Pick<WorkoutRepository, 'observeFinished' | 'save'>;

const finishedWorkout = async (workouts: Workouts, id: Id) =>
  (await firstValue<Workout[]>((o) => workouts.observeFinished(o))).find((w) => w.id === id) ??
  null;

/**
 * RF-PROG-03.AC1, AC6: corrects a set of a finished workout; it keeps its place and time. The
 * suggestions, records and next day follow from the data (AC5, RN-SYNC-10).
 */
export class UpdatePastSet {
  constructor(private readonly workouts: Workouts) {}

  async execute(workoutId: Id, setId: Id, input: SetInput): Promise<SetWriteResult> {
    const workout = await finishedWorkout(this.workouts, workoutId);
    const exercise = workout && exerciseOfSet(workout, setId);
    const current = exercise?.sets.find((s) => s.id === setId);
    if (!workout || !exercise || !current) return { status: 'missing' };
    const { id, workoutExerciseId, position, completedAt } = current;
    const set = { ...input, id, workoutExerciseId, position, completedAt } as WorkoutSet;
    return write(this.workouts, workout, exercise, set);
  }
}

/**
 * RF-PROG-03.AC3: a forgotten set at the end of an exercise. Its time is the end of the workout,
 * so it stays inside it without changing the duration (not defined by the specification).
 */
export class AddPastSet {
  constructor(
    private readonly workouts: Workouts,
    private readonly newId: () => Id,
  ) {}

  async execute(workoutId: Id, workoutExerciseId: Id, input: SetInput): Promise<SetWriteResult> {
    const workout = await finishedWorkout(this.workouts, workoutId);
    const exercise = workout?.exercises.find((e) => e.id === workoutExerciseId);
    if (!workout || !exercise || workout.finishedAt === null) return { status: 'missing' };
    const position = Math.max(-1, ...exercise.sets.map((s) => s.position)) + 1;
    const set = {
      ...input,
      id: this.newId(),
      workoutExerciseId,
      position,
      completedAt: workout.finishedAt,
    } as WorkoutSet;
    return write(this.workouts, workout, exercise, set);
  }
}

/** RF-PROG-03.AC2: after D16, the set is deleted (logically, RN-SYNC-04). */
export class DeletePastSet {
  constructor(private readonly workouts: Workouts) {}

  async execute(workoutId: Id, setId: Id): Promise<void> {
    const workout = await finishedWorkout(this.workouts, workoutId);
    const exercise = workout && exerciseOfSet(workout, setId);
    if (!workout || !exercise) return;
    const sets = exercise.sets.filter((s) => s.id !== setId);
    await this.workouts.save(replaceExercise(workout, withSets(workout, exercise, sets)));
  }
}

/** RF-PROG-03.AC4: after D16, the workout leaves the history (logical delete, I-07). */
export class DeleteWorkout {
  constructor(private readonly workouts: Pick<WorkoutRepository, 'delete'>) {}

  execute(workoutId: Id): Promise<void> {
    return this.workouts.delete(workoutId);
  }
}
