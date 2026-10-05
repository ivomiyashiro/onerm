import { personalRecords, workoutRecords } from '@/domain/rules/progress/personal-records';
import { anExposure } from '@/domain/testing/builders';

const day = (n: number) => new Date(Date.UTC(2026, 8, n, 12));
const on = (n: number, sets: [number | null, number, number | null][]) =>
  anExposure(sets, { workoutId: `w${n}`, finishedAt: day(n) });

describe('RN-PROG-03 · personal records', () => {
  const history = [
    on(1, [
      [60, 10, 2],
      [60, 9, 2],
    ]),
    on(4, [
      [62.5, 8, 2],
      [60, 11, 1],
    ]),
    on(8, [
      [65, 3, 1],
      [62.5, 9, 2],
    ]),
  ];
  const records = personalRecords(history);

  it('(a) the highest e1RM, with its set and date', () => {
    // 62.5 × 9 RIR 2 → RTF 11 → 62.5 × 36 / 26 = 86.5; the others are lower.
    expect(records.bestE1rm).toMatchObject({ loadKg: 62.5, reps: 9, at: day(8) });
    expect(records.bestE1rm?.e1rm.value).toBeCloseTo(86.54, 2);
  });

  it('(b) the heaviest load with at least 1 rep', () => {
    expect(records.heaviestLoad).toEqual({ loadKg: 65, reps: 3, at: day(8) });
  });

  it('(c) the most reps with each load already used, heaviest first', () => {
    expect(records.mostRepsByLoad).toEqual([
      { loadKg: 65, reps: 3, at: day(8) },
      { loadKg: 62.5, reps: 9, at: day(8) },
      { loadKg: 60, reps: 11, at: day(4) },
    ]);
  });

  it('a tie keeps the first time it was done', () => {
    const tied = personalRecords([on(1, [[60, 10, 2]]), on(5, [[60, 10, 2]])]);

    expect(tied.heaviestLoad?.at).toEqual(day(1));
    expect(tied.mostRepsByLoad[0].at).toEqual(day(1));
    expect(tied.bestE1rm?.at).toEqual(day(1));
  });

  it('loads within 0.05 kg are the same load (RN-GEN-02)', () => {
    const records2 = personalRecords([on(1, [[20.41, 10, 2]]), on(3, [[20.43, 12, 2]])]);

    expect(records2.mostRepsByLoad).toHaveLength(1);
    expect(records2.mostRepsByLoad[0].reps).toBe(12);
  });

  it('bodyweight: the most reps in a set, and no e1RM or load', () => {
    const bodyweight = personalRecords([
      on(1, [[null, 12, null]]),
      on(4, [
        [null, 15, null],
        [null, 13, null],
      ]),
    ]);

    expect(bodyweight).toEqual({
      bestE1rm: null,
      heaviestLoad: null,
      mostRepsByLoad: [],
      mostRepsInASet: { reps: 15, at: day(4) },
    });
  });

  it('RF-PROG-05.AC3 · a corrected or deleted set changes the records: they come from the data', () => {
    expect(personalRecords(history.slice(0, 2)).heaviestLoad?.loadKg).toBe(62.5);
  });
});

describe('RN-PROG-03 · records highlighted in the workout summary', () => {
  it('(a) and (b) when the workout beat them and there was an earlier EE', () => {
    const history = [on(1, [[60, 10, 2]]), on(4, [[62.5, 9, 2]])];

    expect(workoutRecords(history, 'w4')).toEqual({ e1rm: true, heaviestLoad: true });
  });

  it('not the first time the exercise is done', () => {
    expect(workoutRecords([on(1, [[60, 10, 2]])], 'w1')).toEqual({
      e1rm: false,
      heaviestLoad: false,
    });
  });

  it('matching a record is not beating it', () => {
    const history = [on(1, [[60, 10, 2]]), on(4, [[60, 10, 2]])];

    expect(workoutRecords(history, 'w4')).toEqual({ e1rm: false, heaviestLoad: false });
  });

  it('only what the workout beat: more reps with less load can beat the e1RM only', () => {
    const history = [on(1, [[60, 6, 2]]), on(4, [[55, 12, 2]])];

    expect(workoutRecords(history, 'w4')).toEqual({ e1rm: true, heaviestLoad: false });
  });
});
