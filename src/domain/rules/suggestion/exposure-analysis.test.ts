import { analyseExposure } from '@/domain/rules/suggestion/exposure-analysis';
import { anExposure, aPrescription } from '@/domain/testing/builders';

const prescription = aPrescription({ sets: 3, repRange: { min: 8, max: 12 } });
const analyse = (sets: [number | null, number, number | null][]) =>
  analyseExposure(anExposure(sets, { prescription }));

describe('RN-SUG-01 · analysis of an ERR', () => {
  it('takes the sets with W and N from the reference prescription', () => {
    expect(
      analyse([
        [60, 10, 2],
        [60, 9, 1],
        [55, 10, 3],
      ]),
    ).toMatchObject({
      workingLoadKg: 60,
      repsWithW: [10, 9],
      rirsWithW: [2, 1],
      setCount: 3,
      repRange: { min: 8, max: 12 },
    });
  });

  it('cap reached: at least N sets with W, all at or over the cap', () => {
    expect(
      analyse([
        [60, 12, 2],
        [60, 12, 2],
        [60, 13, 2],
      ]).range,
    ).toBe('capReached');
    // caso Q: all at the cap, but fewer than N.
    expect(
      analyse([
        [60, 12, 2],
        [60, 12, 2],
      ]).range,
    ).toBe('within');
    expect(
      analyse([
        [60, 12, 2],
        [60, 12, 2],
        [60, 11, 2],
      ]).range,
    ).toBe('within');
  });

  it('within the range: every set with W at or over the floor', () => {
    expect(
      analyse([
        [60, 10, 2],
        [60, 9, 2],
        [60, 8, 2],
      ]).range,
    ).toBe('within');
  });

  it('below the range: some set with W under the floor', () => {
    expect(
      analyse([
        [62.5, 8, 2],
        [62.5, 8, 2],
        [62.5, 7, 2],
      ]).range,
    ).toBe('below');
  });

  it('only the reported efforts count for the RIR', () => {
    expect(
      analyse([
        [60, 10, null],
        [60, 10, 2],
      ]).rirsWithW,
    ).toEqual([2]);
  });

  it('the limiting side is the side of the set with W with the fewest reps', () => {
    const exposure = anExposure([], {
      prescription,
      sets: [
        { loadKg: 20, reps: 10, rir: 2, side: 'left' },
        { loadKg: 20, reps: 9, rir: 2, side: 'right' },
      ],
    });

    expect(analyseExposure(exposure).limitingSide).toEqual({ side: 'right', reps: 9 });
    expect(analyse([[60, 10, 2]]).limitingSide).toBeNull();
  });

  it('bodyweight: every set counts, there is no W', () => {
    expect(
      analyse([
        [null, 15, null],
        [null, 14, null],
      ]),
    ).toMatchObject({
      workingLoadKg: null,
      repsWithW: [15, 14],
    });
  });
});
