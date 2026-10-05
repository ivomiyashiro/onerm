import { defaultRoleAndSets, prescriptionFor } from '@/domain/rules/routine/prescription-defaults';

describe('11 §2 · prescription by goal, role and level (RN-PERF-03)', () => {
  const cases = [
    // goal, role, novice RIR, intermediate RIR, range, rest
    ['health', 'main', 3, 2, [8, 12], 120],
    ['health', 'accessory', 3, 2, [10, 15], 90],
    ['hypertrophy', 'main', 2, 2, [6, 10], 150],
    ['hypertrophy', 'accessory', 2, 1, [10, 15], 90],
    ['strength', 'main', 3, 2, [4, 6], 180],
    ['strength', 'accessory', 3, 2, [8, 12], 120],
  ] as const;

  it.each(cases)('%s · %s', (goal, role, noviceRir, intermediateRir, [min, max], restSeconds) => {
    const expected = { role, sets: 3, repRange: { min, max }, restSeconds };

    expect(prescriptionFor({ role, sets: 3 }, { goal, level: 'novice' })).toEqual({
      ...expected,
      targetRir: noviceRir,
    });
    expect(prescriptionFor({ role, sets: 3 }, { goal, level: 'intermediate' })).toEqual({
      ...expected,
      targetRir: intermediateRir,
    });
    // RN-PERF-07: advanced behaves like intermediate.
    expect(prescriptionFor({ role, sets: 3 }, { goal, level: 'advanced' })).toEqual({
      ...expected,
      targetRir: intermediateRir,
    });
  });

  it('keeps the sets of the template', () => {
    expect(
      prescriptionFor({ role: 'main', sets: 4 }, { goal: 'health', level: 'novice' }).sets,
    ).toBe(4);
  });

  it('C-10 · with the strength goal, at most 3 sets per exercise', () => {
    expect(
      prescriptionFor({ role: 'main', sets: 4 }, { goal: 'strength', level: 'novice' }).sets,
    ).toBe(3);
    expect(
      prescriptionFor({ role: 'accessory', sets: 2 }, { goal: 'strength', level: 'novice' }).sets,
    ).toBe(2);
  });

  it('templates never use RIR 0 (P-05)', () => {
    for (const goal of ['health', 'hypertrophy', 'strength'] as const) {
      for (const role of ['main', 'accessory'] as const) {
        for (const level of ['novice', 'intermediate', 'advanced'] as const) {
          expect(prescriptionFor({ role, sets: 3 }, { goal, level }).targetRir).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('RN-PERF-03 · adding an exercise to a routine', () => {
  it('compound → main with 3 sets; isolation → accessory with 2', () => {
    expect(defaultRoleAndSets('compound')).toEqual({ role: 'main', sets: 3 });
    expect(defaultRoleAndSets('isolation')).toEqual({ role: 'accessory', sets: 2 });
  });
});
