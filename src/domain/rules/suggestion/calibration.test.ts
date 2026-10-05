import { suggestAfterCalibrationSet } from '@/domain/rules/suggestion/calibration';
import { aBilateralSet, aPrescription, aUnilateralSet } from '@/domain/testing/builders';

const prescription = aPrescription({ repRange: { min: 8, max: 12 }, targetRir: 2 });
const barbell = { unit: 'kg', increment: 2.5, minLoad: 20 } as const;
const completedAt = new Date('2026-10-05T12:00:00Z');

const after = (set: Parameters<typeof suggestAfterCalibrationSet>[0]['set']) =>
  suggestAfterCalibrationSet({ set, exerciseId: 'row', prescription, grid: barbell });

describe('RN-SUG-06 · after a calibration set', () => {
  it('0 reps: 20 % down, on the grid, never under the minimum load', () => {
    expect(after(aBilateralSet({ loadKg: 25, reps: 0, rir: null }))).toEqual({
      loadKg: 20,
      reps: 8,
      reason: { code: 'CALIBRATION_STEP_DOWN', side: null },
    });
  });

  it('RTF over 15: up, at least one increment', () => {
    expect(after(aBilateralSet({ loadKg: 40, reps: 14, rir: 2 }))).toEqual({
      loadKg: 47.5,
      reps: 8,
      reason: { code: 'CALIBRATION_STEP', reps: 14, rir: 2, repsToFailure: 16, side: null },
    });
  });

  it('a load typed off the grid still lands on it, and still goes up (RN-SUG-09)', () => {
    // máx(31 + 2.5, 31 × 1.2 = 37.2) = 37.2 → down to 35.
    expect(after(aBilateralSet({ loadKg: 31, reps: 16, rir: 0 })).loadKg).toBe(35);
    // máx(20.5 + 2.5, 24.6) = 24.6 → 22.5: on the grid and above 20.5.
    expect(after(aBilateralSet({ loadKg: 20.5, reps: 20, rir: 0 })).loadKg).toBe(22.5);
  });

  it('otherwise the e1RM of that set gives the load, and calibration ends (RN-SUG-08)', () => {
    // RTF 10: e1RM = 60 × 36 / 27 = 80 → 80 × 27 / 36 = 60.
    expect(after(aBilateralSet({ loadKg: 60, reps: 8, rir: 2, completedAt }))).toEqual({
      loadKg: 60,
      reps: 8,
      reason: {
        code: 'ESTIMATED_FROM_E1RM',
        e1rm: { value: 80, precision: 'standard' },
        basis: { exerciseId: 'row', at: completedAt, loadKg: 60, reps: 8, side: null },
      },
    });
  });

  it('without RIR, assumes RIR 0 (RN-SUG-07)', () => {
    // RTF 8: e1RM = 60 × 36 / 29 = 74.5 → × 27 / 36 = 55.9 → 55.
    expect(after(aBilateralSet({ loadKg: 60, reps: 8, rir: null })).loadKg).toBe(55);
  });

  it('when the estimation does not apply, the load of that set, with the floor', () => {
    const highReps = aPrescription({ repRange: { min: 12, max: 15 }, targetRir: 4 });

    expect(
      suggestAfterCalibrationSet({
        set: aBilateralSet({ loadKg: 31, reps: 10, rir: 2 }),
        exerciseId: 'row',
        prescription: highReps,
        grid: barbell,
      }),
    ).toEqual({
      loadKg: 30,
      reps: 12,
      reason: { code: 'FROM_EXERCISE_HISTORY', workingLoadKg: 31, limitingSide: null },
    });
  });

  it('a unilateral set uses its limiting side (RN-ENT-06)', () => {
    expect(
      after(aUnilateralSet({ loadKg: 20, repsLeft: 0, repsRight: 6, rirLeft: null, rirRight: 1 })),
    ).toMatchObject({ reason: { code: 'CALIBRATION_STEP_DOWN', side: 'left' } });
    expect(
      after(aUnilateralSet({ loadKg: 20, repsLeft: 14, repsRight: 13, rirLeft: 3, rirRight: 3 })),
    ).toMatchObject({
      reason: { code: 'CALIBRATION_STEP', reps: 13, rir: 3, repsToFailure: 16, side: 'right' },
    });
  });
});
