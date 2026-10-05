import { analyseExposure } from '@/domain/rules/suggestion/exposure-analysis';
import { isBetterMark, markOf, nextStagnation } from '@/domain/rules/suggestion/stagnation';
import { anExposure, aPrescription } from '@/domain/testing/builders';

const prescription = aPrescription({ sets: 3, repRange: { min: 8, max: 12 } });
const analysisOf = (load: number, ...reps: number[]) =>
  analyseExposure(
    anExposure(
      reps.map((r) => [load, r, 2] as const),
      { prescription },
    ),
  );

describe('RN-SUG-04 · marks', () => {
  it('the mark is W and the mean reps per set with W', () => {
    expect(markOf(analysisOf(60, 10, 9, 9))).toEqual({ loadKg: 60, meanReps: 28 / 3 });
  });

  it('an extra set does not inflate it and a missing one does not lower it', () => {
    expect(markOf(analysisOf(60, 10, 10, 10, 10))).toEqual(markOf(analysisOf(60, 10, 10)));
  });

  it('compares by load first, then by mean reps', () => {
    expect(isBetterMark({ loadKg: 62.5, meanReps: 7.67 }, { loadKg: 60, meanReps: 12 })).toBe(true);
    expect(isBetterMark({ loadKg: 60, meanReps: 10.33 }, { loadKg: 60, meanReps: 9.33 })).toBe(
      true,
    );
    expect(isBetterMark({ loadKg: 60, meanReps: 9.33 }, { loadKg: 60, meanReps: 9.33 })).toBe(
      false,
    );
    // The same load with the RN-GEN-02 tolerance.
    expect(isBetterMark({ loadKg: 60.03, meanReps: 9 }, { loadKg: 60, meanReps: 10 })).toBe(false);
  });
});

describe('RN-SUG-04 · count', () => {
  const best = { bestMark: { loadKg: 62.5, meanReps: 23 / 3 }, stagnationCount: 1 };

  it('adds 1 for an ERR that does not improve', () => {
    expect(nextStagnation(best, analysisOf(62.5, 8, 8, 7), false)).toEqual({
      ...best,
      stagnationCount: 2,
    });
  });

  it('goes back to 0 when one improves', () => {
    expect(nextStagnation(best, analysisOf(62.5, 8, 8, 8), false)).toEqual({
      bestMark: { loadKg: 62.5, meanReps: 8 },
      stagnationCount: 0,
    });
  });

  it('RF-SUG-05.AC4 · an ERR with the cap reached never adds to it', () => {
    const atCap = { bestMark: { loadKg: 60, meanReps: 12 }, stagnationCount: 1 };

    expect(nextStagnation(atCap, analysisOf(60, 12, 12, 12), false)).toEqual(atCap);
  });

  it('a reset starts the best mark and the count again', () => {
    expect(nextStagnation(best, analysisOf(57.5, 9, 9, 9), true)).toEqual({
      bestMark: { loadKg: 57.5, meanReps: 9 },
      stagnationCount: 0,
    });
  });
});
