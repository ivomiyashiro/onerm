import { trendCounts, trendOf } from '@/presentation/features/home/trend';

describe('trend (Figma «ExerciseRow»)', () => {
  it('each kind of reason gets its icon', () => {
    expect(trendOf('INCREASE_LOAD')).toBe('up');
    expect(trendOf('ADD_REP')).toBe('reps');
    expect(trendOf('REPEAT')).toBe('same');
    expect(trendOf('REENTRY')).toBe('deload');
    expect(trendOf('CALIBRATION')).toBe('calibrate');
  });

  it('counts the exercises that go up and the ones that add reps', () => {
    expect(trendCounts(['up', 'reps', 'reps', 'same', 'calibrate'])).toEqual({ up: 1, reps: 2 });
  });
});
