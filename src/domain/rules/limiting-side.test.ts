import { limitingSide } from '@/domain/rules/limiting-side';
import { aUnilateralSet } from '@/domain/testing/builders';

describe('RN-ENT-06 · limiting side', () => {
  it('is the side with fewer reps', () => {
    expect(limitingSide(aUnilateralSet({ repsLeft: 8, repsRight: 10 }))).toEqual({
      side: 'left',
      reps: 8,
      rir: 2,
    });
    expect(limitingSide(aUnilateralSet({ repsLeft: 10, repsRight: 9, rirRight: 1 }))).toEqual({
      side: 'right',
      reps: 9,
      rir: 1,
    });
  });

  it('with the same reps, the side with the lower RIR', () => {
    expect(limitingSide(aUnilateralSet({ rirLeft: 3, rirRight: 1 })).side).toBe('right');
    expect(limitingSide(aUnilateralSet({ rirLeft: 0, rirRight: 2 })).side).toBe('left');
  });

  it('with the same reps and only one RIR, that side', () => {
    expect(limitingSide(aUnilateralSet({ rirLeft: null, rirRight: 3 }))).toEqual({
      side: 'right',
      reps: 10,
      rir: 3,
    });
    expect(limitingSide(aUnilateralSet({ rirLeft: 4, rirRight: null })).side).toBe('left');
  });

  it('with the same reps and no RIR, or the same RIR, the left side (deterministic)', () => {
    expect(limitingSide(aUnilateralSet({ rirLeft: null, rirRight: null }))).toEqual({
      side: 'left',
      reps: 10,
      rir: null,
    });
    expect(limitingSide(aUnilateralSet({ rirLeft: 2, rirRight: 2 })).side).toBe('left');
  });

  it('fewer reps wins over a lower RIR', () => {
    expect(limitingSide(aUnilateralSet({ repsLeft: 9, rirLeft: 4, rirRight: 0 })).side).toBe(
      'left',
    );
  });
});
