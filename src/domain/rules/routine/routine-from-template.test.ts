import type { RoutineTemplate } from '@/domain/models/routine-template';
import { routineFromTemplate } from '@/domain/rules/routine/routine-from-template';

const TEMPLATE: RoutineTemplate = {
  id: 'plt-fb3',
  name: 'Cuerpo completo A/B',
  level: 'novice',
  daysPerWeek: 3,
  estimatedMinutes: 49,
  rationale: '',
  days: [
    {
      id: 'tday-b',
      name: 'Día B',
      position: 1,
      exercises: [{ id: 'tex-b1', exerciseId: 'goblet', position: 0, role: 'main', sets: 3 }],
    },
    {
      id: 'tday-a',
      name: 'Día A',
      position: 0,
      exercises: [
        { id: 'tex-a2', exerciseId: 'curl', position: 1, role: 'accessory', sets: 2 },
        { id: 'tex-a1', exerciseId: 'leg-press', position: 0, role: 'main', sets: 4 },
      ],
    },
  ],
};

function sequentialIds() {
  let n = 0;
  return () => `id-${++n}`;
}

describe('routineFromTemplate', () => {
  it('RN-RUT-03: a copy with its own ids that remembers its template', () => {
    const routine = routineFromTemplate(
      TEMPLATE,
      { goal: 'health', level: 'novice' },
      sequentialIds(),
    );

    expect(routine).toMatchObject({ name: 'Cuerpo completo A/B', sourceTemplateId: 'plt-fb3' });
    const ids = [
      routine.id,
      ...routine.days.flatMap((day) => [day.id, ...day.exercises.map((e) => e.id)]),
    ];
    expect(new Set(ids).size).toBe(6);
    expect(ids.some((id) => id.startsWith('t'))).toBe(false);
  });

  it('RN-RUT-03: keeps the days and exercises in order, each under its parent', () => {
    const routine = routineFromTemplate(
      TEMPLATE,
      { goal: 'health', level: 'novice' },
      sequentialIds(),
    );

    expect(routine.days.map((day) => [day.name, day.position])).toEqual([
      ['Día A', 0],
      ['Día B', 1],
    ]);
    const [dayA] = routine.days;
    expect(dayA.routineId).toBe(routine.id);
    expect(dayA.exercises.map((e) => [e.exerciseId, e.position, e.routineDayId])).toEqual([
      ['leg-press', 0, dayA.id],
      ['curl', 1, dayA.id],
    ]);
    expect(dayA.exercises[0].notes).toBeNull();
  });

  it('RN-PERF-03: the prescription is computed for the goal and level of the profile', () => {
    const routine = routineFromTemplate(
      TEMPLATE,
      { goal: 'strength', level: 'intermediate' },
      sequentialIds(),
    );

    expect(routine.days[0].exercises[0].prescription).toEqual({
      role: 'main',
      sets: 3,
      repRange: { min: 4, max: 6 },
      restSeconds: 180,
      targetRir: 2,
    });
  });
});
