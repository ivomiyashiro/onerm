import type { Exercise } from '@/domain/models/exercise';
import type { Profile } from '@/domain/models/profile';
import type { RotationDay, Routine, RoutineDay, RoutineExercise } from '@/domain/models/routine';
import type { Id } from '@/domain/models/vocabulary';
import { defaultRoleAndSets, prescriptionFor } from '@/domain/rules/routine/prescription-defaults';

/**
 * The edits of the routine editor (S15) on a draft of the aggregate. The order of the arrays is
 * the order the user sees; positions are handed out when saving (`withPositions`).
 */

type Offset = -1 | 1;

function mapDays(routine: Routine, map: (day: RoutineDay) => RoutineDay): Routine {
  return { ...routine, days: routine.days.map(map) };
}

function mapExercises(
  routine: Routine,
  map: (exercises: readonly RoutineExercise[]) => readonly RoutineExercise[],
): Routine {
  return mapDays(routine, (day) => ({ ...day, exercises: map(day.exercises) }));
}

/** The array with the item at `from` moved to `to`; out-of-range moves leave it as it is. */
function moved<T>(items: readonly T[], from: number, to: number): readonly T[] {
  if (from < 0 || to < 0 || to >= items.length || from === to) return items;
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

/** A day without exercises at the end, named with the next free letter. */
export function addDay(routine: Routine, id: Id): Routine {
  const day: RoutineDay = {
    id,
    routineId: routine.id,
    name: nextDayName(routine),
    position: 0,
    exercises: [],
  };
  return { ...routine, days: [...routine.days, day] };
}

export function renameDay(routine: Routine, dayId: Id, name: string): Routine {
  return mapDays(routine, (day) => (day.id === dayId ? { ...day, name } : day));
}

/** RN-RUT-07: the day goes away from the draft; its history stays (the repository deletes it logically). */
export function removeDay(routine: Routine, dayId: Id): Routine {
  return { ...routine, days: routine.days.filter((day) => day.id !== dayId) };
}

/** RF-RUT-05.AC3: «Mover antes» and «Mover después». */
export function moveDay(routine: Routine, dayId: Id, offset: Offset): Routine {
  const from = routine.days.findIndex((day) => day.id === dayId);
  return { ...routine, days: moved(routine.days, from, from + offset) };
}

/** RF-RUT-03.AC2 (RN-PERF-03): role and sets from the mechanic, prescription from the goal. */
export function addExercise(
  routine: Routine,
  dayId: Id,
  exercise: Pick<Exercise, 'id' | 'mechanic'>,
  profile: Pick<Profile, 'goal' | 'level'>,
  id: Id,
): Routine {
  return mapDays(routine, (day) =>
    day.id === dayId
      ? {
          ...day,
          exercises: [
            ...day.exercises,
            {
              id,
              routineDayId: day.id,
              exerciseId: exercise.id,
              position: day.exercises.length,
              prescription: prescriptionFor(defaultRoleAndSets(exercise.mechanic), profile),
              notes: null,
            },
          ],
        }
      : day,
  );
}

export function updateExercise(
  routine: Routine,
  routineExerciseId: Id,
  changes: Partial<Pick<RoutineExercise, 'prescription' | 'notes'>>,
): Routine {
  return mapExercises(routine, (exercises) =>
    exercises.map((e) => (e.id === routineExerciseId ? { ...e, ...changes } : e)),
  );
}

/**
 * RF-RUT-04.AC6 (RN-RUT-08): the routine exercise keeps its id and prescription and points to
 * another exercise; the history of the old one stays with it.
 */
export function replaceExercise(routine: Routine, routineExerciseId: Id, exerciseId: Id): Routine {
  return mapExercises(routine, (exercises) =>
    exercises.map((e) => (e.id === routineExerciseId ? { ...e, exerciseId } : e)),
  );
}

export function removeExercise(routine: Routine, routineExerciseId: Id): Routine {
  return mapExercises(routine, (exercises) => exercises.filter((e) => e.id !== routineExerciseId));
}

/** RF-RUT-05.AC2: «Subir» and «Bajar», within the exercise's day. */
export function moveExercise(routine: Routine, routineExerciseId: Id, offset: Offset): Routine {
  return mapExercises(routine, (exercises) => {
    const from = exercises.findIndex((e) => e.id === routineExerciseId);
    return from === -1 ? exercises : moved(exercises, from, from + offset);
  });
}

/** RF-RUT-05.AC1: dropping a dragged exercise at `index` of its day. */
export function moveExerciseTo(routine: Routine, routineExerciseId: Id, index: number): Routine {
  return mapExercises(routine, (exercises) => {
    const from = exercises.findIndex((e) => e.id === routineExerciseId);
    return from === -1 ? exercises : moved(exercises, from, index);
  });
}

/** «Día A», «Día B»…: the first letter no day of the routine uses. */
export function nextDayName(routine: Routine): string {
  const names = new Set(routine.days.map((day) => day.name));
  for (let code = 'A'.charCodeAt(0); ; code++) {
    const name = `Día ${String.fromCharCode(code)}`;
    if (!names.has(name)) return name;
  }
}

/**
 * The positions to save (RN-RUT-01): the days that were already saved share out their own
 * positions in the new order, without compacting, so the rotation still finds the next day after
 * a deleted one. New days go after every day of the routine, deleted ones included. Exercises are
 * numbered in order (I-10).
 */
export function withPositions(routine: Routine, rotationDays: readonly RotationDay[]): Routine {
  const saved = new Map(
    rotationDays.filter((day) => day.routineId === routine.id).map((day) => [day.id, day.position]),
  );
  let next = Math.max(-1, ...saved.values()) + 1;
  const positions = routine.days.map((day) => saved.get(day.id) ?? next++).sort((a, b) => a - b);
  return {
    ...routine,
    days: routine.days.map((day, index) => ({
      ...day,
      position: positions[index],
      exercises: day.exercises.map((exercise, position) => ({
        ...exercise,
        routineDayId: day.id,
        position,
      })),
    })),
  };
}
