import type { Exercise } from '@/domain/models/exercise';
import type { Profile } from '@/domain/models/profile';
import type { RotationDay, Routine } from '@/domain/models/routine';
import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { RoutineRepository } from '@/domain/repositories/routine-repository';
import type { WorkoutRepository } from '@/domain/repositories/workout-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { addDay, addExercise, withPositions } from '@/domain/rules/routine/routine-edits';
import { validateRoutine, type RoutineViolationCode } from '@/domain/rules/routine-rules';
import type { Violation } from '@/domain/rules/violation';
import { firstValue } from '@/domain/usecases/observe-together';

/** What the routine editor (S15) starts from. */
export interface RoutineDraft {
  readonly routine: Routine;
  readonly isNew: boolean;
  /** The whole catalog, deprecated exercises included: the names and mechanics of the rows. */
  readonly exercises: ReadonlyMap<Id, Exercise>;
  /** For the defaults of a new exercise (RN-PERF-03) and the RIR label (RN-PERF-04). */
  readonly profile: Profile;
  /** RF-RUT-04.AC2: the changes apply from the next workout (RN-RUT-06). */
  readonly workoutInProgress: boolean;
}

/** RF-RUT-03, RF-RUT-04: a copy of the routine to edit, or a new one with «Día A». */
export class LoadRoutineDraft {
  constructor(
    private readonly routines: Pick<RoutineRepository, 'observeById'>,
    private readonly exercises: Pick<ExerciseRepository, 'observeAll'>,
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly workouts: Pick<WorkoutRepository, 'observeInProgress'>,
    private readonly newId: () => Id,
  ) {}

  /** Null when the routine no longer exists (deleted on another device, RN-RUT-02). */
  async execute(routineId: Id | null): Promise<RoutineDraft | null> {
    const routine =
      routineId === null
        ? this.newRoutine()
        : await firstValue<Routine | null>((o) => this.routines.observeById(routineId, o));
    if (routine === null) return null;
    const [exercises, profile, inProgress] = await Promise.all([
      firstValue<Exercise[]>((o) => this.exercises.observeAll(o)),
      firstValue<Profile | null>((o) => this.profiles.observe(o)),
      firstValue<Workout | null>((o) => this.workouts.observeInProgress(o)),
    ]);
    return {
      routine,
      isNew: routineId === null,
      exercises: new Map(exercises.map((exercise) => [exercise.id, exercise])),
      profile: profile ?? defaultProfile(),
      workoutInProgress: inProgress !== null,
    };
  }

  private newRoutine(): Routine {
    const id = this.newId();
    const empty: Routine = { id, name: '', sourceTemplateId: null, days: [] };
    return addDay(empty, this.newId());
  }
}

/** The editor's edits that create records: they need client ids (RN-SYNC-02). */
export class EditRoutineDraft {
  constructor(private readonly newId: () => Id) {}

  addDay(routine: Routine): Routine {
    return addDay(routine, this.newId());
  }

  addExercise(
    routine: Routine,
    dayId: Id,
    exercise: Pick<Exercise, 'id' | 'mechanic'>,
    profile: Pick<Profile, 'goal' | 'level'>,
  ): Routine {
    return addExercise(routine, dayId, exercise, profile, this.newId());
  }
}

export type SaveRoutineResult =
  { status: 'saved' } | { status: 'invalid'; violations: Violation<RoutineViolationCode>[] };

/**
 * «Guardar» in S15: validates the whole aggregate (I-02, I-03) and writes it with its positions
 * (RN-RUT-01). Local first, so it works offline (RF-RUT-03.AC6).
 */
export class SaveRoutine {
  constructor(private readonly routines: Pick<RoutineRepository, 'observeRotationDays' | 'save'>) {}

  async execute(draft: Routine): Promise<SaveRoutineResult> {
    const routine: Routine = {
      ...draft,
      name: draft.name.trim(),
      days: draft.days.map((day) => ({ ...day, name: day.name.trim() })),
    };
    const violations = validateRoutine(routine);
    if (violations.length > 0) return { status: 'invalid', violations };

    const rotation = await firstValue<RotationDay[]>((o) => this.routines.observeRotationDays(o));
    await this.routines.save(withPositions(routine, rotation));
    return { status: 'saved' };
  }
}
