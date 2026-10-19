import type { Exercise } from '@/domain/models/exercise';
import type { Id } from '@/domain/models/vocabulary';
import type { Workout, WorkoutExercise } from '@/domain/models/workout';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { sortByPosition } from '@/domain/rules/position-order';
import { isEffectiveSet } from '@/domain/rules/workout-set-rules';
import { firstValue } from '@/domain/usecases/observe-together';
import type { SkipRest } from '@/domain/usecases/rest-timer';

/** RN-ENT-11: a workout in progress started longer ago than this is abandoned. */
export const ABANDONED_AFTER_MS = 12 * 60 * 60 * 1000;

type Workouts = Pick<WorkoutRepository, 'observeInProgress' | 'save'>;

const inProgress = (workouts: Pick<WorkoutRepository, 'observeInProgress'>) =>
  firstValue<Workout | null>((o) => workouts.observeInProgress(o));

const hasEffectiveSets = (exercise: WorkoutExercise) => exercise.sets.some(isEffectiveSet);

/** RN-ENT-09: without effective sets it doesn't count; with them it is done. */
const skipped = (exercise: WorkoutExercise): WorkoutExercise =>
  hasEffectiveSets(exercise) ? exercise : { ...exercise, status: 'skipped' };

/**
 * RF-ENT-09, RN-ENT-10: a new workout exercise with the substitute, keeping the routine exercise,
 * the planned exercise and the prescription copied at start. The set format is the substitute's
 * (RN-ENT-08). An original with sets keeps them and the substitute comes right after it; without
 * sets the substitute takes its place (Figma «S09 · Ejercicio sustituido»).
 */
export class SubstituteExercise {
  constructor(
    private readonly workouts: Workouts,
    private readonly newId: () => Id,
  ) {}

  /** The id of the new workout exercise, or null if the original is gone. */
  async execute(workoutExerciseId: Id, substitute: Exercise): Promise<Id | null> {
    const workout = await inProgress(this.workouts);
    const original = workout?.exercises.find((e) => e.id === workoutExerciseId);
    if (!workout || !original) return null;
    const replacement: WorkoutExercise = {
      ...original,
      id: this.newId(),
      exerciseId: substitute.id,
      status: 'pending',
      loadType: substitute.loadType,
      isUnilateral: substitute.isUnilateral,
      sets: [],
    };
    const keep = original.sets.length > 0;
    const exercises = sortByPosition(workout.exercises).flatMap((e) =>
      e.id !== original.id ? [e] : keep ? [skipped(e), replacement] : [replacement],
    );
    await this.workouts.save({
      ...workout,
      exercises: exercises.map((e, position) => ({ ...e, position })),
    });
    return replacement.id;
  }
}

/**
 * RF-ENT-11: finishes the workout in progress and stops its rest. Exercises without effective
 * sets are left skipped (AC2, RN-ENT-09). An abandoned workout ends at its last set, or when it
 * started without sets (RN-ENT-11). Only a local write: the next day follows from it (RN-RUT-01).
 */
export class FinishWorkout {
  constructor(
    private readonly workouts: Workouts,
    private readonly stopRest: Pick<SkipRest, 'execute'>,
    private readonly now: () => Date,
  ) {}

  /** The id of the finished workout, for S12; null without one in progress. */
  async execute({ abandoned = false }: { abandoned?: boolean } = {}): Promise<Id | null> {
    const workout = await inProgress(this.workouts);
    if (workout === null) return null;
    const lastSet = Math.max(
      ...workout.exercises.flatMap((e) => e.sets.map((s) => s.completedAt.getTime())),
    );
    const finishedAt = !abandoned
      ? this.now()
      : Number.isFinite(lastSet)
        ? new Date(lastSet)
        : workout.startedAt;
    await this.workouts.save({
      ...workout,
      status: 'finished',
      finishedAt,
      exercises: workout.exercises.map(skipped),
    });
    await this.stopRest.execute();
    return workout.id;
  }
}

/** RF-ENT-12: deletes the workout in progress, physically (RN-SYNC-13), and stops its rest. */
export class DiscardWorkout {
  constructor(
    private readonly workouts: Pick<WorkoutRepository, 'observeInProgress' | 'delete'>,
    private readonly stopRest: Pick<SkipRest, 'execute'>,
  ) {}

  async execute(): Promise<void> {
    const workout = await inProgress(this.workouts);
    if (workout !== null) await this.workouts.delete(workout.id);
    await this.stopRest.execute();
  }
}

export type WorkoutResume =
  | { readonly kind: 'none' }
  /** RF-ENT-13.AC1: back to S09. */
  | { readonly kind: 'resume' }
  /** RF-ENT-13.AC2: D02, with what it says. */
  | { readonly kind: 'abandoned'; readonly startedAt: Date; readonly sets: number };

/** RF-ENT-13: what opening the app does with a workout in progress. */
export class ReadWorkoutResume {
  constructor(
    private readonly workouts: Pick<WorkoutRepository, 'observeInProgress'>,
    private readonly now: () => Date,
  ) {}

  async execute(): Promise<WorkoutResume> {
    const workout = await inProgress(this.workouts);
    if (workout === null) return { kind: 'none' };
    if (this.now().getTime() - workout.startedAt.getTime() <= ABANDONED_AFTER_MS) {
      return { kind: 'resume' };
    }
    const sets = workout.exercises.reduce((total, e) => total + e.sets.length, 0);
    return { kind: 'abandoned', startedAt: workout.startedAt, sets };
  }
}
