import type { Suggestion } from '@/domain/rules/suggestion/suggestion';
import { deltaOf, trendCounts, trendOf } from '@/presentation/features/home/trend';

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

describe('deltaOf (RF-ENT-01.AC8): what changes against last time', () => {
  const params = { workingLoadKg: 60, limitingSide: null, floor: 8, cap: 12, targetRir: 2 };
  const suggestion = (reason: object, loadKg: number | null = 62.5, reps = 8) =>
    ({ loadKg, reps, reason }) as unknown as Suggestion;

  it('more load: how much, in the unit of the profile', () => {
    expect(deltaOf(suggestion({ code: 'INCREASE_LOAD', ...params }), 'kg')).toEqual({
      tone: 'up',
      text: '↑ 2,5 kg',
    });
  });

  it('less load after a pause or a deload', () => {
    expect(deltaOf(suggestion({ code: 'REENTRY', ...params }, 55), 'kg')).toEqual({
      tone: 'down',
      text: '↓ 5 kg',
    });
  });

  it('more reps: how many', () => {
    expect(
      deltaOf(suggestion({ code: 'ADD_REP', previousReps: 7, ...params }, 60, 8), 'kg'),
    ).toEqual({
      tone: 'reps',
      text: '+1 rep',
    });
    expect(
      deltaOf(
        suggestion({ code: 'BODYWEIGHT_ADD_REP', previousReps: 10, limitingSide: null }, null, 12),
        'kg',
      ),
    ).toEqual({ tone: 'reps', text: '+2 reps' });
  });

  it('the same, or nothing to calibrate (#196)', () => {
    expect(deltaOf(suggestion({ code: 'REPEAT', ...params }, 60), 'kg')).toEqual({
      tone: 'same',
      text: 'Igual',
    });
    expect(deltaOf(suggestion({ code: 'CALIBRATION' }, null), 'kg')).toBeNull();
  });
});
