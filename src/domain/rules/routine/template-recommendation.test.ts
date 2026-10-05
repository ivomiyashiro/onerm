import { recommendTemplate } from '@/domain/rules/routine/template-recommendation';
import type { RoutineTemplate } from '@/domain/models/routine-template';

const template = (id: string, daysPerWeek: number): RoutineTemplate => ({
  id,
  name: id,
  level: 'novice',
  daysPerWeek,
  estimatedMinutes: 60,
  rationale: '',
  days: [],
});
const templates = [template('PLT-TP4', 4), template('PLT-FB2', 2), template('PLT-FB3', 3)];
const recommend = (level: 'novice' | 'intermediate' | 'advanced', daysPerWeek: number) => {
  const result = recommendTemplate(templates, { level, daysPerWeek });
  return [result?.recommended.id, result?.alternative?.id ?? null, result?.note ?? null];
};

describe('RN-PERF-01 · 11 §4 · template recommendation', () => {
  it('novice: 2 days → FB2; 3 → FB3', () => {
    expect(recommend('novice', 2)).toEqual(['PLT-FB2', null, null]);
    expect(recommend('novice', 3)).toEqual(['PLT-FB3', null, null]);
  });

  it('novice with 4 or more days: FB3, with TP4 as an alternative and the «3 días alcanzan» note', () => {
    for (const days of [4, 5, 6]) {
      expect(recommend('novice', days)).toEqual(['PLT-FB3', 'PLT-TP4', 'threeDaysAreEnough']);
    }
  });

  it('intermediate or advanced: 2 → FB2; 3 → FB3; 4 → TP4', () => {
    for (const level of ['intermediate', 'advanced'] as const) {
      expect(recommend(level, 2)).toEqual(['PLT-FB2', null, null]);
      expect(recommend(level, 3)).toEqual(['PLT-FB3', null, null]);
      expect(recommend(level, 4)).toEqual(['PLT-TP4', null, null]);
    }
  });

  it('intermediate with 5 or 6 days: TP4, noting it is a 4-day template', () => {
    expect(recommend('intermediate', 5)).toEqual(['PLT-TP4', null, 'fourDayTemplate']);
    expect(recommend('advanced', 6)).toEqual(['PLT-TP4', null, 'fourDayTemplate']);
  });

  it('without the templates in the catalog yet: nothing to recommend', () => {
    expect(recommendTemplate([], { level: 'novice', daysPerWeek: 3 })).toBeNull();
  });
});
