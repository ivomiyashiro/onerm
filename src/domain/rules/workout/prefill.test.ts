import { prefill } from '@/domain/rules/workout/prefill';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';
import { aBilateralSet } from '@/domain/testing/builders';

const SUGGESTED: Suggestion = {
  loadKg: 62.5,
  reps: 8,
  reason: { code: 'REPEAT', workingLoadKg: 62.5, limitingSide: null },
};
const CALIBRATION: Suggestion = { loadKg: null, reps: 8, reason: { code: 'CALIBRATION' } };

describe('prefill (RN-ENT-04)', () => {
  it('the first set shows the suggestion', () => {
    expect(prefill(SUGGESTED, [])).toEqual({ loadKg: 62.5, reps: 8 });
  });

  it('the next ones show the suggestion when the load was kept', () => {
    expect(prefill(SUGGESTED, [aBilateralSet({ loadKg: 62.5, reps: 7 })])).toEqual({
      loadKg: 62.5,
      reps: 8,
    });
  });

  it('after a set with another load, the next one takes that load', () => {
    expect(prefill(SUGGESTED, [aBilateralSet({ loadKg: 60, reps: 8 })])).toEqual({
      loadKg: 60,
      reps: 8,
    });
  });

  it('a warm-up set never sets the load of the next one', () => {
    const warmUp = aBilateralSet({ loadKg: 30, isWarmup: true });

    expect(prefill(SUGGESTED, [warmUp])).toEqual({ loadKg: 62.5, reps: 8 });
  });

  it('in calibration the first set has no load; the next ones keep the one used', () => {
    expect(prefill(CALIBRATION, [])).toEqual({ loadKg: null, reps: 8 });
    expect(prefill(CALIBRATION, [aBilateralSet({ loadKg: 40 })])).toEqual({ loadKg: 40, reps: 8 });
  });
});
