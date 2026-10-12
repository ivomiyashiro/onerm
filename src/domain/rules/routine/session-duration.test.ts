import { prescriptionFor } from '@/domain/rules/routine/prescription-defaults';
import {
  routineMinutes,
  sessionMinutes,
  templateMinutes,
} from '@/domain/rules/routine/session-duration';
import {
  aPrescription,
  aRoutine,
  aRoutineDay,
  aRoutineExercise,
  aRoutineTemplate,
} from '@/domain/testing/builders';
import type { TrainingGoal } from '@/domain/models/vocabulary';

/** PLT-FB3 day A (11 §3): four main exercises of 3 sets, and accessories of 3 and 2. */
const DAY_A = [
  { role: 'main', sets: 3 },
  { role: 'main', sets: 3 },
  { role: 'main', sets: 3 },
  { role: 'main', sets: 3 },
  { role: 'accessory', sets: 3 },
  { role: 'accessory', sets: 2 },
] as const;

const dayA = (goal: TrainingGoal) =>
  DAY_A.map((exercise) => prescriptionFor(exercise, { goal, level: 'novice' }));

describe('sessionMinutes (C-06)', () => {
  it.each([
    ['health', 43],
    ['hypertrophy', 49],
    ['strength', 57],
  ] as const)('11 §3: PLT-FB3 day A with the %s goal takes ~%i min', (goal, minutes) => {
    expect(sessionMinutes(dayA(goal))).toBe(minutes);
  });
});

describe('routineMinutes and templateMinutes', () => {
  it('C-06: a routine takes as long as its longest day', () => {
    const routine = aRoutine({
      days: [
        aRoutineDay({
          id: 'a',
          exercises: [
            aRoutineExercise({ prescription: aPrescription({ sets: 2, restSeconds: 80 }) }),
          ],
        }),
        aRoutineDay({
          id: 'b',
          exercises: [
            aRoutineExercise({ prescription: aPrescription({ sets: 3, restSeconds: 80 }) }),
          ],
        }),
      ],
    });

    expect(routineMinutes(routine)).toBe(6);
  });

  it('RN-PERF-03: a template takes as long as its longest day for the goal of the profile', () => {
    const template = aRoutineTemplate({
      days: [
        {
          id: 'a',
          name: 'A',
          position: 0,
          exercises: DAY_A.map((e, i) => ({ ...e, id: `a${i}`, exerciseId: `x${i}`, position: i })),
        },
        { id: 'b', name: 'B', position: 1, exercises: [] },
      ],
    });

    expect(templateMinutes(template, { goal: 'hypertrophy', level: 'novice' })).toBe(49);
  });
});
