import type { workoutExercises, workouts, workoutSets } from '@/data/db/schema';
import type { SyncValues } from '@/data/db/sync-writes';
import { groupBy } from '@/data/mappers/catalog-mappers';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/domain/models/workout';
import { sortByPosition } from '@/domain/rules/position-order';

type WorkoutRow = typeof workouts.$inferSelect;
type ExerciseRow = typeof workoutExercises.$inferSelect;
type SetRow = typeof workoutSets.$inferSelect;

const toDate = (ms: number | null) => (ms === null ? null : new Date(ms));

/**
 * Rows → workout aggregates (06 §2), exercises and sets ordered by `(position, id)` (I-10). The
 * caller passes live rows only; a child whose parent isn't among them is dropped (RN-SYNC-12).
 */
export function toWorkouts(
  workoutRows: readonly WorkoutRow[],
  exerciseRows: readonly ExerciseRow[],
  setRows: readonly SetRow[],
): Workout[] {
  const setsByExercise = groupBy(setRows, (row) => row.workoutExerciseId);
  const exercisesByWorkout = groupBy(exerciseRows, (row) => row.workoutId);

  return workoutRows.map((row) => ({
    id: row.id,
    routineId: row.routineId,
    routineDayId: row.routineDayId,
    routineNameSnapshot: row.routineNameSnapshot,
    dayNameSnapshot: row.dayNameSnapshot,
    status: row.status,
    startedAt: new Date(row.startedAt),
    finishedAt: toDate(row.finishedAt),
    notes: row.notes,
    exercises: sortByPosition(exercisesByWorkout.get(row.id) ?? []).map(
      (exercise): WorkoutExercise => ({
        id: exercise.id,
        workoutId: exercise.workoutId,
        routineExerciseId: exercise.routineExerciseId,
        plannedExerciseId: exercise.plannedExerciseId,
        exerciseId: exercise.exerciseId,
        position: exercise.position,
        status: exercise.status,
        prescription: {
          role: exercise.role,
          sets: exercise.sets,
          repRange: { min: exercise.repMin, max: exercise.repMax },
          restSeconds: exercise.restSeconds,
          targetRir: exercise.targetRir,
        },
        loadType: exercise.loadType,
        isUnilateral: exercise.isUnilateral,
        sets: sortByPosition(setsByExercise.get(exercise.id) ?? []).map(toWorkoutSet),
      }),
    ),
  }));
}

/** The CHECK of I-05 guarantees a row is either bilateral (`reps`) or unilateral (per side). */
function toWorkoutSet(row: SetRow): WorkoutSet {
  const base = {
    id: row.id,
    workoutExerciseId: row.workoutExerciseId,
    position: row.position,
    loadKg: row.loadKg,
    isWarmup: row.isWarmup,
    completedAt: new Date(row.completedAt),
  };
  if (row.reps !== null) return { ...base, isUnilateral: false, reps: row.reps, rir: row.rir };
  return {
    ...base,
    isUnilateral: true,
    repsLeft: row.repsLeft ?? 0,
    repsRight: row.repsRight ?? 0,
    rirLeft: row.rirLeft,
    rirRight: row.rirRight,
  };
}

/** The aggregate → the columns of each of its rows (the sync columns are set by writeSyncRow). */
export function fromWorkout(workout: Workout) {
  return {
    workout: {
      id: workout.id,
      routineId: workout.routineId,
      routineDayId: workout.routineDayId,
      routineNameSnapshot: workout.routineNameSnapshot,
      dayNameSnapshot: workout.dayNameSnapshot,
      status: workout.status,
      startedAt: workout.startedAt.getTime(),
      finishedAt: workout.finishedAt?.getTime() ?? null,
      notes: workout.notes,
    } satisfies SyncValues<typeof workouts>,
    exercises: workout.exercises.map(
      ({ prescription, ...exercise }) =>
        ({
          id: exercise.id,
          workoutId: workout.id,
          routineExerciseId: exercise.routineExerciseId,
          plannedExerciseId: exercise.plannedExerciseId,
          exerciseId: exercise.exerciseId,
          position: exercise.position,
          status: exercise.status,
          role: prescription.role,
          sets: prescription.sets,
          repMin: prescription.repRange.min,
          repMax: prescription.repRange.max,
          restSeconds: prescription.restSeconds,
          targetRir: prescription.targetRir,
          loadType: exercise.loadType,
          isUnilateral: exercise.isUnilateral,
        }) satisfies SyncValues<typeof workoutExercises>,
    ),
    sets: workout.exercises.flatMap((exercise) =>
      exercise.sets.map((set) => fromWorkoutSet(exercise.id, set)),
    ),
  };
}

function fromWorkoutSet(
  workoutExerciseId: string,
  set: WorkoutSet,
): SyncValues<typeof workoutSets> {
  const base = {
    id: set.id,
    workoutExerciseId,
    position: set.position,
    loadKg: set.loadKg,
    isWarmup: set.isWarmup,
    completedAt: set.completedAt.getTime(),
  };
  // Every laterality column is written, so a set that changes side leaves no stale value (I-05).
  return set.isUnilateral
    ? {
        ...base,
        reps: null,
        rir: null,
        repsLeft: set.repsLeft,
        repsRight: set.repsRight,
        rirLeft: set.rirLeft,
        rirRight: set.rirRight,
      }
    : {
        ...base,
        reps: set.reps,
        rir: set.rir,
        repsLeft: null,
        repsRight: null,
        rirLeft: null,
        rirRight: null,
      };
}
