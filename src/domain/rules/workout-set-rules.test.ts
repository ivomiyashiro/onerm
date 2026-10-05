import { isEffectiveSet, validateWorkoutSet } from '@/domain/rules/workout-set-rules';
import { aBilateralSet, aUnilateralSet, aWorkoutExercise } from '@/domain/testing/builders';

const external = aWorkoutExercise({ loadType: 'external', isUnilateral: false });
const bodyweight = aWorkoutExercise({ loadType: 'bodyweight', isUnilateral: false });
const unilateral = aWorkoutExercise({ loadType: 'external', isUnilateral: true });

describe('I-11 · RN-SUG-01 · effective set', () => {
  it('a set with at least 1 rep is effective', () => {
    expect(isEffectiveSet(aBilateralSet({ reps: 1 }))).toBe(true);
    expect(isEffectiveSet(aBilateralSet({ reps: 0 }))).toBe(false);
  });

  it('a warm-up set is never effective (RN-ENT-12)', () => {
    expect(isEffectiveSet(aBilateralSet({ reps: 10, isWarmup: true }))).toBe(false);
    expect(isEffectiveSet(aUnilateralSet({ isWarmup: true }))).toBe(false);
  });

  it('a unilateral set uses the limiting side (RN-ENT-06)', () => {
    expect(isEffectiveSet(aUnilateralSet({ repsLeft: 0, repsRight: 10 }))).toBe(false);
    expect(isEffectiveSet(aUnilateralSet({ repsLeft: 1, repsRight: 10 }))).toBe(true);
  });
});

describe('validateWorkoutSet', () => {
  const codes = (...args: Parameters<typeof validateWorkoutSet>) =>
    validateWorkoutSet(...args).map((violation) => violation.code);

  it('accepts a valid set', () => {
    expect(validateWorkoutSet(aBilateralSet(), external)).toEqual([]);
    expect(validateWorkoutSet(aBilateralSet({ loadKg: null }), bodyweight)).toEqual([]);
    expect(validateWorkoutSet(aUnilateralSet(), unilateral)).toEqual([]);
  });

  it('I-05 · the laterality is the one copied in the workout exercise', () => {
    expect(codes(aUnilateralSet(), external)).toEqual(['set.laterality']);
    expect(codes(aBilateralSet(), unilateral)).toEqual(['set.laterality']);
  });

  it('I-05 · a catalog change does not matter: only the copy counts (RN-CAT-05)', () => {
    // The copy says unilateral even if the catalog exercise is now bilateral.
    expect(codes(aUnilateralSet(), aWorkoutExercise({ isUnilateral: true }))).toEqual([]);
  });

  it('I-06 · bodyweight has no load', () => {
    expect(codes(aBilateralSet({ loadKg: 0 }), bodyweight)).toEqual(['set.load.notAllowed']);
  });

  it('I-06 · external load is required', () => {
    expect(codes(aBilateralSet({ loadKg: null }), external)).toEqual(['set.load.required']);
  });

  it('RN-ENT-02 · load from 0 to 1000 kg', () => {
    expect(codes(aBilateralSet({ loadKg: 0 }), external)).toEqual([]);
    expect(codes(aBilateralSet({ loadKg: 1000 }), external)).toEqual([]);
    expect(codes(aBilateralSet({ loadKg: 22.68 }), external)).toEqual([]);
    expect(codes(aBilateralSet({ loadKg: -0.5 }), external)).toEqual(['set.load.range']);
    expect(codes(aBilateralSet({ loadKg: 1000.5 }), external)).toEqual(['set.load.range']);
    expect(codes(aBilateralSet({ loadKg: Number.NaN }), external)).toEqual(['set.load.range']);
  });

  it('RN-ENT-02 · whole reps from 0 to 100', () => {
    expect(codes(aBilateralSet({ reps: 0 }), external)).toEqual([]);
    expect(codes(aBilateralSet({ reps: 100 }), external)).toEqual([]);
    expect(codes(aBilateralSet({ reps: 101 }), external)).toEqual(['set.reps']);
    expect(codes(aBilateralSet({ reps: 8.5 }), external)).toEqual(['set.reps']);
    expect(validateWorkoutSet(aUnilateralSet({ repsRight: -1 }), unilateral)).toEqual([
      { code: 'set.reps', path: ['repsRight'] },
    ]);
  });

  it('RN-ENT-02 · RIR is optional, whole, from 0 to 5', () => {
    expect(codes(aBilateralSet({ rir: null }), external)).toEqual([]);
    expect(codes(aBilateralSet({ rir: 5 }), external)).toEqual([]);
    expect(codes(aBilateralSet({ rir: 6 }), external)).toEqual(['set.rir']);
    expect(codes(aBilateralSet({ rir: 1.5 }), external)).toEqual(['set.rir']);
    expect(validateWorkoutSet(aUnilateralSet({ rirLeft: -1, rirRight: null }), unilateral)).toEqual(
      [{ code: 'set.rir', path: ['rirLeft'] }],
    );
  });
});
