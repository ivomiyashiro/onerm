import { validateRoutine } from '@/domain/rules/routine-rules';
import { aPrescription, aRoutine, aRoutineDay, aRoutineExercise } from '@/domain/testing/builders';

const days = (n: number) => Array.from({ length: n }, (_, i) => aRoutineDay({ id: `day-${i}` }));
const exercises = (n: number) =>
  Array.from({ length: n }, (_, i) => aRoutineExercise({ id: `re-${i}` }));
const codes = (routine: Parameters<typeof validateRoutine>[0]) =>
  validateRoutine(routine).map((violation) => violation.code);

describe('I-02 · RN-RUT-05 · a valid routine', () => {
  it('accepts a routine inside every limit', () => {
    expect(validateRoutine(aRoutine())).toEqual([]);
  });

  it('name: 1 to 50 characters', () => {
    expect(codes(aRoutine({ name: 'A' }))).toEqual([]);
    expect(codes(aRoutine({ name: 'a'.repeat(50) }))).toEqual([]);
    expect(codes(aRoutine({ name: '' }))).toEqual(['routine.name']);
    expect(codes(aRoutine({ name: 'a'.repeat(51) }))).toEqual(['routine.name']);
  });

  it('name: the spaces at the edges do not count, so a blank name is not valid', () => {
    expect(codes(aRoutine({ name: '   ' }))).toEqual(['routine.name']);
    expect(codes(aRoutine({ name: ` ${'a'.repeat(50)} ` }))).toEqual([]);
  });

  it('name: counts characters, not UTF-16 units', () => {
    // '💪' is two UTF-16 units: 25 of them are 25 characters.
    expect(codes(aRoutine({ name: '💪'.repeat(25) }))).toEqual([]);
    expect(codes(aRoutine({ name: '💪'.repeat(51) }))).toEqual(['routine.name']);
  });

  it('between 1 and 7 days', () => {
    expect(codes(aRoutine({ days: days(7) }))).toEqual([]);
    expect(codes(aRoutine({ days: [] }))).toEqual(['routine.days']);
    expect(codes(aRoutine({ days: days(8) }))).toEqual(['routine.days']);
  });

  it('each day has a name', () => {
    expect(
      validateRoutine(aRoutine({ days: [aRoutineDay(), aRoutineDay({ name: ' ' })] })),
    ).toEqual([{ code: 'day.name', path: ['days', 1, 'name'] }]);
  });

  it('each day has between 1 and 20 exercises', () => {
    expect(codes(aRoutine({ days: [aRoutineDay({ exercises: exercises(20) })] }))).toEqual([]);
    expect(validateRoutine(aRoutine({ days: [aRoutineDay({ exercises: [] })] }))).toEqual([
      { code: 'day.exercises', path: ['days', 0, 'exercises'] },
    ]);
    expect(codes(aRoutine({ days: [aRoutineDay({ exercises: exercises(21) })] }))).toEqual([
      'day.exercises',
    ]);
  });

  it('I-03 · includes the prescription of each exercise, with its path', () => {
    const broken = aRoutineExercise({ prescription: aPrescription({ sets: 0 }) });
    const routine = aRoutine({
      days: [aRoutineDay(), aRoutineDay({ exercises: [aRoutineExercise(), broken] })],
    });

    expect(validateRoutine(routine)).toEqual([
      { code: 'prescription.sets', path: ['days', 1, 'exercises', 1, 'prescription', 'sets'] },
    ]);
  });
});
