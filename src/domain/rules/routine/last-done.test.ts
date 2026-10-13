import { lastDoneByDay } from '@/domain/rules/routine/last-done';
import { aWorkout } from '@/domain/testing/builders';

const on = (routineDayId: string, iso: string, routineId = 'r1') =>
  aWorkout({ id: `${routineDayId}-${iso}`, routineId, routineDayId, finishedAt: new Date(iso) });

describe('lastDoneByDay (RF-ENT-01.AC3)', () => {
  it('takes the latest time each day was done with the routine', () => {
    const lastDone = lastDoneByDay('r1', [
      on('A', '2026-10-01T12:00:00Z'),
      on('A', '2026-10-06T12:00:00Z'),
      on('B', '2026-10-03T12:00:00Z'),
      on('A', '2026-10-09T12:00:00Z', 'other-routine'),
    ]);

    expect(lastDone).toEqual(
      new Map([
        ['A', new Date('2026-10-06T12:00:00Z')],
        ['B', new Date('2026-10-03T12:00:00Z')],
      ]),
    );
  });

  it('a day never done is absent', () => {
    expect(lastDoneByDay('r1', []).has('A')).toBe(false);
  });
});
