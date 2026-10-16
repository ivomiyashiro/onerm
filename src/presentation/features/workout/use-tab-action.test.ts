import { tabActionName } from '@/presentation/features/workout/use-tab-action';

describe('tabActionName (13 §10, RNF-18)', () => {
  it('names the day to start, the time of the workout in progress, or that it is unavailable', () => {
    expect(tabActionName({ kind: 'start', dayName: 'Día A' }, null)).toBe('Empezar Día A');
    expect(tabActionName({ kind: 'continue', startedAt: new Date() }, '18:42')).toBe(
      'Continuar entrenamiento, 18:42',
    );
    expect(tabActionName({ kind: 'disabled' }, null)).toBe('Empezar, no disponible');
  });
});
