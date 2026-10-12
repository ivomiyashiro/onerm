import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aRoutineTemplate, aWorkout } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveRoutines, type RoutinesOverview } from '@/domain/usecases/observe-routines';

const FB2 = aRoutineTemplate({ id: 'PLT-FB2', name: 'Cuerpo completo — 2 días', daysPerWeek: 2 });
const FB3 = aRoutineTemplate({ id: 'PLT-FB3', name: 'Cuerpo completo A/B', daysPerWeek: 3 });
const TP4 = aRoutineTemplate({
  id: 'PLT-TP4',
  name: 'Torso / Pierna',
  level: 'intermediate',
  daysPerWeek: 4,
});

function observe({
  profile = defaultProfile() as Profile | null,
  routines = [] as Routine[],
  inProgress = null as Workout | null,
} = {}) {
  const values: RoutinesOverview[] = [];
  new ObserveRoutines(
    new InMemoryRoutineRepository(routines),
    new InMemoryRoutineTemplateRepository([FB2, FB3, TP4]),
    new InMemoryProfileRepository(profile),
    new InMemoryWorkoutRepository(inProgress),
  ).execute({ next: (value) => values.push(value), error: jest.fn() });
  return values[values.length - 1];
}

describe('ObserveRoutines', () => {
  it('RF-RUT-01.AC1: each template with its days per week, level and minutes for the goal', () => {
    const { templates } = observe();

    expect(templates.map((t) => [t.name, t.daysPerWeek, t.level])).toEqual([
      ['Cuerpo completo — 2 días', 2, 'novice'],
      ['Cuerpo completo A/B', 3, 'novice'],
      ['Torso / Pierna', 4, 'intermediate'],
    ]);
    // One main exercise of 3 sets with the health goal: 3 × (40 + 120) s.
    expect(templates[0].minutes).toBe(8);
  });

  it('RN-PERF-01: recommends the template for the level and days of the profile', () => {
    expect(observe().recommendedTemplateId).toBe('PLT-FB3');
    expect(
      observe({ profile: { ...defaultProfile(), level: 'advanced', daysPerWeek: 4 } })
        .recommendedTemplateId,
    ).toBe('PLT-TP4');
  });

  it('before the onboarding: recommends with the default profile (RN-PERF-02)', () => {
    expect(observe({ profile: null }).recommendedTemplateId).toBe('PLT-FB3');
  });

  it('Mis rutinas: an adopted routine shows the level and days per week of its template', () => {
    const { routines } = observe({
      routines: [aRoutine({ id: 'r1', name: 'Torso / Pierna', sourceTemplateId: 'PLT-TP4' })],
    });

    expect(routines).toEqual([
      { id: 'r1', name: 'Torso / Pierna', daysPerWeek: 4, level: 'intermediate', minutes: 8 },
    ]);
  });

  it('Mis rutinas: an own routine counts its days, without a level', () => {
    const [routine] = observe({ routines: [aRoutine({ id: 'mine' })] }).routines;

    expect(routine).toMatchObject({ daysPerWeek: 1, level: null });
  });

  it('RN-RUT-02: marks the active routine, and a reference to a deleted one counts as none', () => {
    const routines = [aRoutine({ id: 'r1' })];

    expect(
      observe({ profile: { ...defaultProfile(), activeRoutineId: 'r1' }, routines })
        .activeRoutineId,
    ).toBe('r1');
    expect(
      observe({ profile: { ...defaultProfile(), activeRoutineId: 'gone' }, routines })
        .activeRoutineId,
    ).toBeNull();
  });

  it('RN-RUT-09: says whether a workout is in progress', () => {
    expect(observe().hasWorkoutInProgress).toBe(false);
    expect(
      observe({ inProgress: aWorkout({ status: 'in_progress', finishedAt: null }) })
        .hasWorkoutInProgress,
    ).toBe(true);
  });
});
