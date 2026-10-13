import type { Exercise } from '@/domain/models/exercise';
import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { sortByPosition } from '@/domain/rules/position-order';
import { firstValue } from '@/domain/usecases/observe-together';

export type StartWorkoutResult =
  | { readonly status: 'started'; readonly workoutId: Id }
  /** RN-ENT-01: there is one already; the caller goes back to it. */
  | { readonly status: 'inProgress'; readonly workoutId: Id }
  | { readonly status: 'missing' };

/**
 * RF-ENT-01.AC2: a workout in progress with a copy of the day (RN-ENT-08). The day is looked up
 * in the active routine first, so S07 and S08 start what they show. Only local writes (AC6).
 */
export class StartWorkout {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly routines: Pick<RoutineRepository, 'observeAll'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeInProgress' | 'save'>,
    private readonly exercises: Pick<ExerciseRepository, 'observeAll'>,
    private readonly newId: () => Id,
    private readonly now: () => Date,
  ) {}

  async execute(dayId: Id): Promise<StartWorkoutResult> {
    const running = await firstValue<Workout | null>((o) => this.workouts.observeInProgress(o));
    if (running !== null) return { status: 'inProgress', workoutId: running.id };

    const [profile, routines, catalog] = await Promise.all([
      firstValue<Profile | null>((o) => this.profiles.observe(o)),
      firstValue<Routine[]>((o) => this.routines.observeAll(o)),
      firstValue<Exercise[]>((o) => this.exercises.observeAll(o)),
    ]);
    const candidates = [
      ...routines.filter((r) => r.id === profile?.activeRoutineId),
      ...routines.filter((r) => r.id !== profile?.activeRoutineId),
    ];
    const routine = candidates.find((r) => r.days.some((day) => day.id === dayId));
    const day = routine?.days.find((d) => d.id === dayId);
    if (routine === undefined || day === undefined) return { status: 'missing' };

    const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
    const workoutId = this.newId();
    await this.workouts.save({
      id: workoutId,
      routineId: routine.id,
      routineDayId: day.id,
      routineNameSnapshot: routine.name,
      dayNameSnapshot: day.name,
      status: 'in_progress',
      startedAt: this.now(),
      finishedAt: null,
      notes: null,
      exercises: sortByPosition(day.exercises).map((planned, position) => {
        // Not in the local catalog yet (RN-CAT-04): external and bilateral until it arrives.
        const exercise = byId.get(planned.exerciseId);
        return {
          id: this.newId(),
          workoutId,
          routineExerciseId: planned.id,
          plannedExerciseId: planned.exerciseId,
          exerciseId: planned.exerciseId,
          position,
          status: 'pending',
          prescription: planned.prescription,
          loadType: exercise?.loadType ?? 'external',
          isUnilateral: exercise?.isUnilateral ?? false,
          sets: [],
        };
      }),
    });
    return { status: 'started', workoutId };
  }
}
