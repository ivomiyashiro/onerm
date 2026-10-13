import { withProfileChanges } from '@/domain/rules/profile/profile-changes';
import { defaultProfile } from '@/domain/rules/routine/default-profile';

describe('withProfileChanges', () => {
  it('RF-PERF-01.AC1: applies the answers and keeps the rest', () => {
    const profile = withProfileChanges(defaultProfile(), { goal: 'strength', daysPerWeek: 4 });

    expect(profile).toMatchObject({ level: 'novice', goal: 'strength', daysPerWeek: 4 });
  });

  it('RN-PERF-04: an intermediate or advanced level switches to numeric RIR', () => {
    expect(withProfileChanges(defaultProfile(), { level: 'advanced' }).effortMode).toBe('rir');
  });

  it('RN-PERF-04: back to novice, the simple scale', () => {
    const intermediate = {
      ...defaultProfile(),
      level: 'intermediate' as const,
      effortMode: 'rir' as const,
    };

    expect(withProfileChanges(intermediate, { level: 'novice' }).effortMode).toBe('simple');
  });

  it('RF-PERF-05.AC2: a mode chosen by hand survives a change of level', () => {
    const chosen = { ...defaultProfile(), effortMode: 'rir' as const, effortModeExplicit: true };

    expect(withProfileChanges(chosen, { level: 'novice' }).effortMode).toBe('rir');
  });

  it('RF-PERF-05.AC2: choosing the mode marks it as explicit', () => {
    expect(withProfileChanges(defaultProfile(), { effortMode: 'rir' })).toMatchObject({
      effortMode: 'rir',
      effortModeExplicit: true,
    });
  });
});
