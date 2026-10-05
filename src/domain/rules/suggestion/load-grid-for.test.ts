import { DEFAULT_LOAD_INCREMENTS, loadGridFor } from '@/domain/rules/suggestion/load-grid-for';

const profile = {
  unit: 'kg' as const,
  loadIncrementsKg: { ...DEFAULT_LOAD_INCREMENTS.kg, dumbbell: 1 },
  loadIncrementsLb: DEFAULT_LOAD_INCREMENTS.lb,
  barWeightKg: 15,
  barWeightLb: 45,
};

describe('RN-PERF-06 · RN-PERF-08 · the grid of an exercise', () => {
  it('the defaults per equipment and unit (RN-PERF-06)', () => {
    expect(DEFAULT_LOAD_INCREMENTS).toEqual({
      kg: { barbell: 2.5, dumbbell: 2, cable: 2.5, machine: 5, kettlebell: 4 },
      lb: { barbell: 5, dumbbell: 5, cable: 5, machine: 10, kettlebell: 10 },
    });
  });

  it('the increment comes from the primary equipment, in the active unit', () => {
    expect(loadGridFor(profile, { primaryEquipment: 'dumbbell' })).toEqual({
      unit: 'kg',
      increment: 1,
      minLoad: 1,
    });
    expect(loadGridFor({ ...profile, unit: 'lb' }, { primaryEquipment: 'machine' })).toEqual({
      unit: 'lb',
      increment: 10,
      minLoad: 10,
    });
  });

  it('a barbell starts at the bar weight of the profile, in the active unit (RN-PERF-08)', () => {
    expect(loadGridFor(profile, { primaryEquipment: 'barbell' })).toEqual({
      unit: 'kg',
      increment: 2.5,
      minLoad: 15,
    });
    expect(loadGridFor({ ...profile, unit: 'lb' }, { primaryEquipment: 'barbell' })?.minLoad).toBe(
      45,
    );
  });

  it('bodyweight has no grid', () => {
    expect(loadGridFor(profile, { primaryEquipment: 'bodyweight' })).toBeNull();
  });

  it('RN-CAT-04 · an exercise not in the local catalog yet: the default barbell increment', () => {
    expect(loadGridFor(profile, null)).toEqual({ unit: 'kg', increment: 2.5, minLoad: 2.5 });
  });
});
