import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aRoutineTemplate, anExercise } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveTemplate, type TemplateDetail } from '@/domain/usecases/observe-template';

const MUSCLE: Profile = { ...defaultProfile(), goal: 'hypertrophy' };

function observe(id = 'PLT-FB3', { profile = MUSCLE, routines = [] as Routine[] } = {}) {
  const values: (TemplateDetail | null)[] = [];
  new ObserveTemplate(
    new InMemoryRoutineTemplateRepository([aRoutineTemplate()]),
    new InMemoryProfileRepository(profile),
    new InMemoryRoutineRepository(routines),
    new InMemoryWorkoutRepository(),
    { observeAll: (o) => (o.next([anExercise({ id: 'leg-press', name: 'Prensa' })]), () => {}) },
  ).execute(id, { next: (value) => values.push(value), error: jest.fn() });
  return values[values.length - 1];
}

describe('ObserveTemplate', () => {
  it('RF-RUT-01.AC2: the days and exercises with the prescription for the goal (RN-PERF-03)', () => {
    const detail = observe();

    expect(detail?.goal).toBe('hypertrophy');
    expect(detail?.days).toEqual([
      {
        id: 'PLT-FB3-A',
        name: 'Día A',
        exercises: [
          {
            id: 'PLT-FB3-A1',
            name: 'Prensa',
            prescription: {
              role: 'main',
              sets: 3,
              repRange: { min: 6, max: 10 },
              restSeconds: 150,
              targetRir: 2,
            },
          },
        ],
      },
    ]);
    // 3 × (40 + 150) s.
    expect(detail?.minutes).toBe(10);
  });

  it('RF-RUT-02.AC2: names the active routine, for D07', () => {
    const detail = observe('PLT-FB3', {
      profile: { ...MUSCLE, activeRoutineId: 'r1' },
      routines: [aRoutine({ id: 'r1', name: 'Mi rutina' })],
    });

    expect(detail?.activeRoutine).toEqual({ id: 'r1', name: 'Mi rutina' });
    expect(observe()?.activeRoutine).toBeNull();
  });

  it('emits null for a template that is not in the catalog', () => {
    expect(observe('PLT-XX')).toBeNull();
  });
});
