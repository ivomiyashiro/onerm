import { prescriptionFor } from '@/domain/rules/routine/prescription-defaults';
import { sessionMinutes } from '@/domain/rules/routine/session-duration';
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
