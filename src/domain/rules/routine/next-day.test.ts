import { nextDay, type RotationDay } from '@/domain/rules/routine/next-day';
import { aWorkout } from '@/domain/testing/builders';

const day = (id: string, position: number, isDeleted = false): RotationDay => ({
  id,
  position,
  isDeleted,
});
const ABC = [day('A', 0), day('B', 1), day('C', 2)];
const done = (routineDayId: string, finishedDay: number, routineId = 'routine-1') =>
  aWorkout({
    id: `${routineDayId}-${finishedDay}`,
    routineId,
    routineDayId,
    finishedAt: new Date(Date.UTC(2026, 8, finishedDay, 12)),
  });

describe('RN-RUT-01 · next day (ADR-0006)', () => {
  it('never trained with the routine: the first day', () => {
    expect(nextDay('routine-1', ABC, [])).toBe('A');
  });

  it('the day after the last finished workout, by finishedAt', () => {
    expect(nextDay('routine-1', ABC, [done('B', 5), done('A', 2)])).toBe('C');
  });

  it('is circular', () => {
    expect(nextDay('routine-1', ABC, [done('C', 5)])).toBe('A');
  });

  it('follows the day actually done, not the rotation (ADR-0006 §3)', () => {
    expect(nextDay('routine-1', ABC, [done('A', 1), done('C', 3)])).toBe('A');
  });

  it('only counts workouts of the routine, and only finished ones', () => {
    const other = done('X', 9, 'routine-2');
    const inProgress = { ...done('B', 10), status: 'in_progress' as const, finishedAt: null };

    expect(nextDay('routine-1', ABC, [done('A', 1), other, inProgress])).toBe('B');
  });

  it('R6 · the last day was deleted: its position counts, and the next live day follows', () => {
    // C deleted after doing B → D. B deleted after doing B → C.
    const days = [day('A', 0), day('B', 1), day('C', 2, true), day('D', 3)];
    expect(nextDay('routine-1', days, [done('B', 4)])).toBe('D');
    expect(
      nextDay('routine-1', [day('A', 0), day('B', 1, true), day('C', 2)], [done('B', 4)]),
    ).toBe('C');
  });

  it('positions are not compacted: gaps are fine', () => {
    expect(nextDay('routine-1', [day('A', 0), day('C', 5)], [done('A', 1)])).toBe('C');
  });

  it('a repeated position is ordered by id (I-10)', () => {
    expect(nextDay('routine-1', [day('A', 0), day('Y', 1), day('X', 1)], [done('A', 1)])).toBe('X');
  });

  it('no live day: no next day', () => {
    expect(nextDay('routine-1', [day('A', 0, true)], [])).toBeNull();
  });

  it('a workout of a day the device does not know: the first day', () => {
    expect(nextDay('routine-1', ABC, [done('unknown', 3)])).toBe('A');
  });
});

describe('F3 review · next day is deterministic', () => {
  it('two workouts finished at the same instant: the higher workout id, whatever the input order', () => {
    const at = new Date(Date.UTC(2026, 8, 3, 12));
    const first = aWorkout({ id: 'a', routineDayId: 'B', finishedAt: at });
    const second = aWorkout({ id: 'b', routineDayId: 'A', finishedAt: at });

    expect(nextDay('routine-1', ABC, [first, second])).toBe('B');
    expect(nextDay('routine-1', ABC, [second, first])).toBe('B');
  });
});
