import type { LoadGrid } from '@/domain/rules/suggestion/load-grid';
import { suggestAfterCalibrationSet } from '@/domain/rules/suggestion/calibration';
import { suggestNext } from '@/domain/rules/suggestion/engine';
import { aBilateralSet, aPrescription } from '@/domain/testing/builders';

/**
 * The reference cases of sugerencias.md, literal (RNF-15). Unless a case says otherwise:
 * 3 × 8–12 · target RIR 2 · increment 2.5 kg · last workout less than 14 days ago.
 */
const defaults = aPrescription({ sets: 3, repRange: { min: 8, max: 12 }, targetRir: 2 });
const barbell: LoadGrid = { unit: 'kg', increment: 2.5, minLoad: 20 };

describe('caso E · calibration (novice)', () => {
  // Seated cable row · target RIR 3 · no EE. A cable's minimum load is one increment.
  const prescription = aPrescription({ repRange: { min: 8, max: 12 }, targetRir: 3 });
  const cable: LoadGrid = { unit: 'kg', increment: 2.5, minLoad: 2.5 };
  const afterSet = (loadKg: number, reps: number, rir: number) =>
    suggestAfterCalibrationSet({
      set: aBilateralSet({ loadKg, reps, rir }),
      exerciseId: 'seated-cable-row',
      prescription,
      grid: cable,
    });

  it('set 1 has no load: the user picks it', () => {
    expect(
      suggestNext([], {
        today: '2026-10-05',
        workoutDates: [],
        prescription,
        loadType: 'external',
        grid: cable,
        exerciseExposures: [],
      }),
    ).toEqual({ loadKg: null, reps: 8, reason: { code: 'CALIBRATION' } });
  });

  it('set 1 · 30 × 12, "4 o más" (RIR 4): RTF 16 → máx(32.5; down(36) = 35) → 35 × 8', () => {
    expect(afterSet(30, 12, 4)).toMatchObject({
      loadKg: 35,
      reps: 8,
      reason: { code: 'CALIBRATION_STEP' },
    });
  });

  it('set 2 · 35 × 11, "2 o 3" (RIR 2): e1RM 52.5 → 37.9 → down → 37.5 × 8', () => {
    expect(afterSet(35, 11, 2)).toMatchObject({
      loadKg: 37.5,
      reps: 8,
      reason: { code: 'ESTIMATED_FROM_E1RM', e1rm: { value: 52.5, precision: 'approximate' } },
    });
  });
});

describe('caso L · calibration always moves forward', () => {
  it('machine, increment 5 kg · 10 × 20 with "4 o más": RTF 24 → máx(15; down(12) = 10) → 15', () => {
    const machine: LoadGrid = { unit: 'kg', increment: 5, minLoad: 5 };

    expect(
      suggestAfterCalibrationSet({
        set: aBilateralSet({ loadKg: 10, reps: 20, rir: 4 }),
        exerciseId: 'leg-press',
        prescription: defaults,
        grid: machine,
      }),
    ).toMatchObject({ loadKg: 15, reps: 8, reason: { code: 'CALIBRATION_STEP' } });
  });
});

describe('caso R · calibration too heavy', () => {
  it('barbell · 40 × 0 → down(40 × 0.8 = 32) → 30 × 8, without asking for effort', () => {
    expect(
      suggestAfterCalibrationSet({
        set: aBilateralSet({ loadKg: 40, reps: 0, rir: null }),
        exerciseId: 'barbell-bench-press',
        prescription: defaults,
        grid: barbell,
      }),
    ).toEqual({ loadKg: 30, reps: 8, reason: { code: 'CALIBRATION_STEP_DOWN', side: null } });
  });
});
