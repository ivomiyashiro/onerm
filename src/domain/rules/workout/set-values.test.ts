import { hasEffort, valuesOf } from '@/domain/rules/workout/set-values';
import { aBilateralSet, aUnilateralSet } from '@/domain/testing/builders';

describe('valuesOf (RF-ENT-05)', () => {
  it('a bilateral set gives its load and reps', () => {
    expect(valuesOf(aBilateralSet({ loadKg: 80, reps: 6 }))).toEqual({ loadKg: 80, reps: 6 });
  });

  it('a unilateral set gives the reps of its weaker side', () => {
    expect(valuesOf(aUnilateralSet({ loadKg: 12, repsLeft: 9, repsRight: 7 }))).toEqual({
      loadKg: 12,
      reps: 7,
    });
  });
});

describe('hasEffort', () => {
  it('a bilateral set has it once its RIR is set', () => {
    expect(hasEffort(aBilateralSet({ rir: null }))).toBe(false);
    expect(hasEffort(aBilateralSet({ rir: 2 }))).toBe(true);
  });

  it('a unilateral set needs both sides', () => {
    expect(hasEffort(aUnilateralSet({ rirLeft: 2, rirRight: null }))).toBe(false);
    expect(hasEffort(aUnilateralSet({ rirLeft: 2, rirRight: 1 }))).toBe(true);
  });
});
