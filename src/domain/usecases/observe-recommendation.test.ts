import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutineTemplate } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineTemplateRepository,
} from '@/domain/testing/in-memory-repositories';
import {
  ObserveRecommendation,
  type Recommendation,
} from '@/domain/usecases/observe-recommendation';

const TEMPLATES = [
  aRoutineTemplate({ id: 'PLT-FB2', daysPerWeek: 2 }),
  aRoutineTemplate({ id: 'PLT-FB3', daysPerWeek: 3 }),
  aRoutineTemplate({ id: 'PLT-TP4', daysPerWeek: 4, level: 'intermediate' }),
];

function observe(profile: Profile | null) {
  const values: (Recommendation | null)[] = [];
  const error = jest.fn();
  new ObserveRecommendation(
    new InMemoryRoutineTemplateRepository(TEMPLATES),
    new InMemoryProfileRepository(profile),
  ).execute({ next: (value) => values.push(value), error });
  return values[values.length - 1];
}

describe('ObserveRecommendation (S06)', () => {
  it('RF-PERF-02.AC1: novice, muscle and 3 days → the 3-day full body, with its time', () => {
    const recommendation = observe({ ...defaultProfile(), goal: 'hypertrophy' });

    expect(recommendation).toMatchObject({
      template: { id: 'PLT-FB3' },
      goal: 'hypertrophy',
      alternative: null,
      note: null,
    });
    expect(recommendation?.minutes).toBeGreaterThan(0);
  });

  it('RF-PERF-02.AC4: a novice with 5 days gets the 3-day one, the 4-day one as an option', () => {
    expect(observe({ ...defaultProfile(), daysPerWeek: 5 })).toMatchObject({
      template: { id: 'PLT-FB3' },
      alternative: { id: 'PLT-TP4' },
      note: 'threeDaysAreEnough',
    });
  });

  it('RF-PERF-02.AC6: carries the goal, so S06 can warn about strength', () => {
    expect(observe({ ...defaultProfile(), goal: 'strength' })?.goal).toBe('strength');
  });

  it('null without a profile', () => {
    expect(observe(null)).toBeNull();
  });
});
