import type { routineDays, routineExercises, routines } from '@/data/db/schema';
import type { SyncValues } from '@/data/db/sync-writes';
import { groupBy } from '@/data/mappers/catalog-mappers';
import type { Routine, RoutineDay, RoutineExercise } from '@/domain/models/routine';
import { sortByPosition } from '@/domain/rules/position-order';

type RoutineRow = typeof routines.$inferSelect;
type DayRow = typeof routineDays.$inferSelect;
type ExerciseRow = typeof routineExercises.$inferSelect;

/**
 * Rows → routine aggregates (06 §2), days and exercises ordered by `(position, id)` (I-10). The
 * caller passes live rows only; a child whose parent isn't among them is dropped (RN-SYNC-12).
 */
export function toRoutines(
  routineRows: readonly RoutineRow[],
  dayRows: readonly DayRow[],
  exerciseRows: readonly ExerciseRow[],
): Routine[] {
  const exercisesByDay = groupBy(exerciseRows, (row) => row.routineDayId);
  const daysByRoutine = groupBy(dayRows, (row) => row.routineId);

  return routineRows.map((row) => ({
    id: row.id,
    name: row.name,
    sourceTemplateId: row.sourceTemplateId,
    days: sortByPosition(daysByRoutine.get(row.id) ?? []).map((day): RoutineDay => ({
      id: day.id,
      routineId: day.routineId,
      name: day.name,
      position: day.position,
      exercises: sortByPosition(exercisesByDay.get(day.id) ?? []).map(toRoutineExercise),
    })),
  }));
}

function toRoutineExercise(row: ExerciseRow): RoutineExercise {
  return {
    id: row.id,
    routineDayId: row.routineDayId,
    exerciseId: row.exerciseId,
    position: row.position,
    prescription: {
      role: row.role,
      sets: row.sets,
      repRange: { min: row.repMin, max: row.repMax },
      restSeconds: row.restSeconds,
      targetRir: row.targetRir,
    },
    notes: row.notes,
  };
}

/** The aggregate → the columns of each of its rows (the sync columns are set by writeSyncRow). */
export function fromRoutine(routine: Routine) {
  return {
    routine: {
      id: routine.id,
      name: routine.name,
      sourceTemplateId: routine.sourceTemplateId,
    } satisfies SyncValues<typeof routines>,
    days: routine.days.map(
      (day) =>
        ({
          id: day.id,
          routineId: routine.id,
          name: day.name,
          position: day.position,
        }) satisfies SyncValues<typeof routineDays>,
    ),
    exercises: routine.days.flatMap((day) =>
      day.exercises.map(
        ({ prescription, ...exercise }) =>
          ({
            id: exercise.id,
            routineDayId: day.id,
            exerciseId: exercise.exerciseId,
            position: exercise.position,
            role: prescription.role,
            sets: prescription.sets,
            repMin: prescription.repRange.min,
            repMax: prescription.repRange.max,
            restSeconds: prescription.restSeconds,
            targetRir: prescription.targetRir,
            notes: exercise.notes,
          }) satisfies SyncValues<typeof routineExercises>,
      ),
    ),
  };
}
