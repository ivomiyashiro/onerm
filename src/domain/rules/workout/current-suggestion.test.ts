import type { Suggestion } from '@/domain/rules/suggestion/suggestion';
import { currentSuggestion } from '@/domain/rules/workout/current-suggestion';
import { aBilateralSet, aPrescription, aUnilateralSet } from '@/domain/testing/builders';

// Case E: seated cable row, 8–12, target RIR 3, no EE.
const prescription = aPrescription({ repRange: { min: 8, max: 12 }, targetRir: 3 });
const grid = { unit: 'kg', increment: 2.5, minLoad: 0 } as const;
const CALIBRATION: Suggestion = { loadKg: null, reps: 8, reason: { code: 'CALIBRATION' } };
const input = { exerciseId: 'row', prescription, grid };

const set = (position: number, loadKg: number, reps: number, rir: number | null) =>
  aBilateralSet({ id: `s${position}`, position, loadKg, reps, rir });

describe('currentSuggestion (RN-SUG-06, RN-SUG-13)', () => {
  it('RF-SUG-02.AC6, caso E: too light → 35 × 8, still calibrating', () => {
    const current = currentSuggestion(CALIBRATION, [set(0, 30, 12, 4)], input);

    expect(current.suggestion).toMatchObject({ loadKg: 35, reps: 8 });
    expect(current.suggestion.reason.code).toBe('CALIBRATION_STEP');
    expect(current.recalculated).toBe(true);
  });

  it('RF-SUG-02.AC5, caso E: the second set ends the calibration with 37,5 × 8', () => {
    const current = currentSuggestion(
      CALIBRATION,
      [set(0, 30, 12, 4), set(1, 35, 11, 2)],
      input,
    );

    expect(current.suggestion).toMatchObject({ loadKg: 37.5, reps: 8 });
    expect(current.suggestion.reason.code).toBe('ESTIMATED_FROM_E1RM');
  });

  it('RN-SUG-13: once the calibration ended, later sets keep its suggestion', () => {
    const current = currentSuggestion(
      CALIBRATION,
      [set(0, 30, 12, 4), set(1, 35, 11, 2), set(2, 37.5, 9, 2)],
      input,
    );

    expect(current.suggestion.loadKg).toBe(37.5);
    expect(current.recalculated).toBe(false);
  });

  it('RF-SUG-02.AC4: a calibration set without effort keeps the next one waiting', () => {
    const first = set(0, 30, 12, null);
    const current = currentSuggestion(CALIBRATION, [first], input);

    expect(current.awaitingEffort).toBe(first);
    expect(current.suggestion).toBe(CALIBRATION);
  });

  it('RF-SUG-02.AC8, caso R: with 0 reps no effort is asked and it goes 20 % down', () => {
    const current = currentSuggestion(CALIBRATION, [set(0, 40, 0, null)], input);

    expect(current.awaitingEffort).toBeNull();
    expect(current.suggestion).toMatchObject({ loadKg: 30, reps: 8 });
  });

  it('a unilateral set waits until both sides have their effort', () => {
    const split = aUnilateralSet({ loadKg: 20, repsLeft: 10, repsRight: 12, rirRight: null });

    expect(currentSuggestion(CALIBRATION, [split], input).awaitingEffort).toBe(split);
  });

  it('warm-ups are not calibration sets (RN-ENT-12)', () => {
    const warmUp = aBilateralSet({ loadKg: 20, reps: 12, rir: null, isWarmup: true });

    expect(currentSuggestion(CALIBRATION, [warmUp], input)).toEqual({
      suggestion: CALIBRATION,
      recalculated: false,
      awaitingEffort: null,
    });
  });

  it('outside a calibration the suggestion stays the same all the workout', () => {
    const suggested: Suggestion = {
      loadKg: 60,
      reps: 8,
      reason: { code: 'REPEAT', workingLoadKg: 60, limitingSide: null },
    };

    expect(currentSuggestion(suggested, [set(0, 60, 12, null)], input).suggestion).toBe(suggested);
  });

  it('RF-SUG-09.AC4: in a bodyweight calibration the next sets take the reps of the first', () => {
    const bodyweight: Suggestion = {
      loadKg: null,
      reps: 8,
      reason: { code: 'BODYWEIGHT_CALIBRATION' },
    };
    const first = aBilateralSet({ loadKg: null, reps: 11, rir: null });

    expect(currentSuggestion(bodyweight, [first], { ...input, grid: null })).toEqual({
      suggestion: { ...bodyweight, reps: 11 },
      recalculated: true,
      awaitingEffort: null,
    });
  });
});
