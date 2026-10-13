import { aUnilateralSet } from '@/domain/testing/builders';
import {
  formErrors,
  formFromPrefill,
  formFromSet,
  maxLoadText,
  setRir,
  stepLoad,
  stepReps,
  toSetInput,
  typeLoad,
} from '@/presentation/features/workout/set-form';

const KG = { unit: 'kg', increment: 2.5, minLoad: 20 } as const;
const LB = { unit: 'lb', increment: 5, minLoad: 45 } as const;
const BARBELL = { loadType: 'external', isUnilateral: false } as const;
const ROW = { loadType: 'external', isUnilateral: true } as const;
const form = formFromPrefill({ loadKg: 60, reps: 8 });

describe('set form', () => {
  it('RF-ENT-02.AC2: − on the reps logs one less', () => {
    expect(toSetInput(stepReps(form, 'reps', -1), BARBELL)).toMatchObject({ reps: 7 });
  });

  it('RF-ENT-02.AC3: + goes up one increment of the equipment, in the user unit', () => {
    expect(stepLoad(form, KG, 1).loadKg).toBe(62.5);
    // 60 kg → 132.28 lb + 5 lb, back in kg.
    expect(stepLoad(form, LB, 1).loadKg).toBeCloseTo(62.27, 2);
  });

  it('RN-ENT-04: without a load, the first + puts one increment and − leaves it empty', () => {
    const empty = formFromPrefill({ loadKg: null, reps: 8 });

    expect(stepLoad(empty, KG, 1).loadKg).toBe(2.5);
    expect(stepLoad(empty, KG, -1).loadKg).toBeNull();
  });

  it('RF-ENT-02.AC3, AC5: a typed load is read with a comma, and a wrong one is an error', () => {
    expect(typeLoad(form, '62,5', KG).loadKg).toBe(62.5);
    expect(formErrors(typeLoad(form, '1200', KG), BARBELL)).toEqual({ load: true, reps: false });
    expect(formErrors(typeLoad(form, 'abc', KG), BARBELL).load).toBe(true);
  });

  it('RF-ENT-02.AC5: reps out of range are an error', () => {
    const tooMany = { ...form, reps: 101 };

    expect(formErrors(tooMany, BARBELL)).toEqual({ load: false, reps: true });
  });

  it('RF-ENT-03.AC1: a unilateral set logs the same reps and effort on both sides', () => {
    expect(toSetInput(setRir(form, 'rir', 2), ROW)).toMatchObject({
      repsLeft: 8,
      repsRight: 8,
      rirLeft: 2,
      rirRight: 2,
    });
  });

  it('RF-ENT-03.AC2: «Distinto por lado» logs each side', () => {
    const split = stepReps(stepReps({ ...form, split: true }, 'repsLeft', -1), 'repsLeft', -1);

    expect(toSetInput(split, ROW)).toMatchObject({ repsLeft: 6, repsRight: 8 });
  });

  it('RF-ENT-04.AC1: editing a set starts from what was logged, split if the sides differ', () => {
    const logged = aUnilateralSet({ repsLeft: 8, repsRight: 10, rirLeft: 1, rirRight: 2 });

    expect(formFromSet(logged)).toMatchObject({ split: true, repsLeft: 8, repsRight: 10 });
  });

  it('bodyweight never logs a load (I-06)', () => {
    expect(toSetInput(form, { loadType: 'bodyweight', isUnilateral: false }).loadKg).toBeNull();
  });

  it('RN-ENT-02: the load limit is 1000 kg, shown in the user unit', () => {
    expect(maxLoadText('kg')).toBe('1000');
    expect(maxLoadText('lb')).toBe('2204,6');
  });
});
