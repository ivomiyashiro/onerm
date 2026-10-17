import { valuesText } from '@/presentation/features/workout/rest-view';

describe('valuesText (13 §10, D1 of the F9 review)', () => {
  it('a load and its reps', () => {
    expect(valuesText({ loadKg: 60, reps: 8 }, 'kg')).toBe('60 kg × 8');
  });

  it('an exercise with no load yet says it is the first time, not «× 8»', () => {
    expect(valuesText({ loadKg: null, reps: 8 }, 'kg')).toBe('primera vez');
  });

  it('bodyweight keeps its reps, as in S12', () => {
    expect(valuesText({ loadKg: null, reps: 12 }, null)).toBe('× 12');
  });
});
