import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aPrescription, aRoutine, aRoutineDay, aRoutineExercise } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
} from '@/domain/testing/in-memory-repositories';
import { AdjustActiveRoutine } from '@/domain/usecases/adjust-active-routine';

const ROUTINE = aRoutine({
  days: [
    aRoutineDay({
      exercises: [
        aRoutineExercise({
          id: 'squat',
          notes: 'Pies al ancho de hombros',
          prescription: aPrescription({ role: 'main', sets: 4 }),
        }),
        aRoutineExercise({
          id: 'curl',
          exerciseId: 'dumbbell-curl',
          position: 1,
          prescription: aPrescription({ role: 'accessory', sets: 2 }),
        }),
      ],
    }),
  ],
});

async function adjust(profile: Profile) {
  const profiles = new InMemoryProfileRepository({ ...profile, activeRoutineId: ROUTINE.id });
  const routines = new InMemoryRoutineRepository([ROUTINE]);
  await new AdjustActiveRoutine(profiles, routines).execute();
  return routines.routines[0];
}

describe('AdjustActiveRoutine (D06)', () => {
  it('RF-PERF-03.AC2: rewrites the prescription for the goal (RN-PERF-03), nothing else', async () => {
    const routine = await adjust({ ...defaultProfile(), goal: 'strength' });
    const [squat, curl] = routine.days[0].exercises;

    expect(squat).toMatchObject({
      id: 'squat',
      exerciseId: 'barbell-back-squat',
      position: 0,
      notes: 'Pies al ancho de hombros',
      prescription: { role: 'main', repRange: { min: 4, max: 6 }, restSeconds: 180, targetRir: 3 },
    });
    expect(curl.prescription).toMatchObject({ role: 'accessory', repRange: { min: 8, max: 12 } });
  });

  it('C-10: towards strength, at most 3 sets', async () => {
    const routine = await adjust({ ...defaultProfile(), goal: 'strength' });

    expect(routine.days[0].exercises[0].prescription.sets).toBe(3);
  });

  it('keeps the sets for the other goals', async () => {
    const routine = await adjust({ ...defaultProfile(), goal: 'hypertrophy' });

    expect(routine.days[0].exercises.map((e) => e.prescription.sets)).toEqual([4, 2]);
  });
});
