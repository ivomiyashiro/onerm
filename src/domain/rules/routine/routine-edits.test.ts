import type { RotationDay, Routine } from '@/domain/models/routine';
import { nextDay } from '@/domain/rules/routine/next-day';
import {
  addExercise,
  hasAccessoryBeforeMain,
  moveDay,
  moveExercise,
  moveExerciseTo,
  nextDayName,
  removeDay,
  removeExercise,
  replaceExercise,
  withPositions,
} from '@/domain/rules/routine/routine-edits';
import {
  aPrescription,
  aRoutine,
  aRoutineDay,
  aRoutineExercise,
  aWorkout,
} from '@/domain/testing/builders';

const exercise = (id: string, role: 'main' | 'accessory' = 'main') =>
  aRoutineExercise({ id, routineDayId: 'day-1', prescription: aPrescription({ role }) });

const oneDay = aRoutine({
  days: [aRoutineDay({ exercises: [exercise('a'), exercise('b'), exercise('c')] })],
});

const ids = (routine: Routine) => routine.days[0].exercises.map((e) => e.id);

/** Days A–D at positions 0–3, as the database would have them. */
const fourDays = aRoutine({
  days: ['A', 'B', 'C', 'D'].map((letter, position) =>
    aRoutineDay({ id: letter, name: `Día ${letter}`, position }),
  ),
});

const rotation = (routine: Routine, deleted: RotationDay[] = []): RotationDay[] => [
  ...routine.days.map(({ id, routineId, position }) => ({
    id,
    routineId,
    position,
    isDeleted: false,
  })),
  ...deleted,
];

describe('routine edits', () => {
  it('RF-RUT-05.AC2: «Subir» and «Bajar» move an exercise one position', () => {
    expect(ids(moveExercise(oneDay, 'b', -1))).toEqual(['b', 'a', 'c']);
    expect(ids(moveExercise(oneDay, 'b', 1))).toEqual(['a', 'c', 'b']);
  });

  it('RF-RUT-05.AC2: an exercise at an edge stays where it is', () => {
    expect(ids(moveExercise(oneDay, 'a', -1))).toEqual(['a', 'b', 'c']);
    expect(ids(moveExercise(oneDay, 'c', 1))).toEqual(['a', 'b', 'c']);
  });

  it('RF-RUT-05.AC1: dragging drops an exercise at the given index', () => {
    expect(ids(moveExerciseTo(oneDay, 'a', 2))).toEqual(['b', 'c', 'a']);
  });

  it('RF-RUT-04.AC6: replacing keeps the routine exercise and its prescription', () => {
    const edited = replaceExercise(oneDay, 'b', 'seated-cable-row');
    expect(edited.days[0].exercises[1]).toEqual({
      ...oneDay.days[0].exercises[1],
      exerciseId: 'seated-cable-row',
    });
  });

  it('RF-RUT-04.AC1: removing an exercise or a day leaves the rest', () => {
    expect(ids(removeExercise(oneDay, 'b'))).toEqual(['a', 'c']);
    expect(removeDay(fourDays, 'B').days.map((d) => d.id)).toEqual(['A', 'C', 'D']);
  });

  it('RF-RUT-03.AC2: a new exercise takes its role and sets from the mechanic, and the prescription from the goal', () => {
    const profile = { goal: 'hypertrophy', level: 'novice' } as const;
    const routine = addExercise(oneDay, 'day-1', { id: 'curl', mechanic: 'isolation' }, profile, 'x');
    expect(routine.days[0].exercises[3]).toEqual({
      id: 'x',
      routineDayId: 'day-1',
      exerciseId: 'curl',
      position: 3,
      notes: null,
      prescription: {
        role: 'accessory',
        sets: 2,
        repRange: { min: 10, max: 15 },
        restSeconds: 90,
        targetRir: 2,
      },
    });
  });

  it('names a new day with the first free letter', () => {
    expect(nextDayName(fourDays)).toBe('Día E');
    expect(nextDayName(removeDay(fourDays, 'B'))).toBe('Día B');
  });

  it('RF-RUT-05.AC4: warns when an accessory goes before a main exercise', () => {
    expect(hasAccessoryBeforeMain(oneDay)).toBe(false);
    const accessoryFirst = aRoutine({
      days: [aRoutineDay({ exercises: [exercise('a', 'accessory'), exercise('b')] })],
    });
    expect(hasAccessoryBeforeMain(accessoryFirst)).toBe(true);
  });
});

describe('withPositions', () => {
  const workoutOn = (dayId: string) => [aWorkout({ routineDayId: dayId })];

  it('RF-RUT-04.AC4: deleting the day that came next skips to the following one', () => {
    const saved = withPositions(removeDay(fourDays, 'C'), rotation(fourDays));
    const deleted = { id: 'C', routineId: 'routine-1', position: 2, isDeleted: true };
    expect(nextDay('routine-1', rotation(saved, [deleted]), workoutOn('B'))).toBe('D');
  });

  it('RF-RUT-04.AC5: deleting the last day done keeps its position, so the next is still C', () => {
    const saved = withPositions(removeDay(fourDays, 'B'), rotation(fourDays));
    expect(saved.days.map((d) => d.position)).toEqual([0, 2, 3]);
    const deleted = { id: 'B', routineId: 'routine-1', position: 1, isDeleted: true };
    expect(nextDay('routine-1', rotation(saved, [deleted]), workoutOn('B'))).toBe('C');
  });

  it('RF-RUT-05.AC3: reordering hands the live positions out in the new order', () => {
    const deleted = { id: 'X', routineId: 'routine-1', position: 9, isDeleted: true };
    const saved = withPositions(moveDay(fourDays, 'D', -1), rotation(fourDays, [deleted]));
    expect(saved.days.map((d) => [d.id, d.position])).toEqual([
      ['A', 0],
      ['B', 1],
      ['D', 2],
      ['C', 3],
    ]);
  });

  it('puts a new day after every day, deleted ones included', () => {
    const deleted = { id: 'X', routineId: 'routine-1', position: 9, isDeleted: true };
    const withNew = { ...fourDays, days: [...fourDays.days, aRoutineDay({ id: 'E' })] };
    const saved = withPositions(withNew, rotation(fourDays, [deleted]));
    expect(saved.days.at(-1)?.position).toBe(10);
  });

  it('numbers the exercises of each day in order', () => {
    const saved = withPositions(moveExercise(oneDay, 'c', -1), rotation(oneDay));
    expect(saved.days[0].exercises.map((e) => [e.id, e.position])).toEqual([
      ['a', 0],
      ['c', 1],
      ['b', 2],
    ]);
  });
});
