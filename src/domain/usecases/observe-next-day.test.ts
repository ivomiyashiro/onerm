import type { LocalDate } from '@/domain/models/local-date';
import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aPrescription,
  aRoutine,
  aRoutineDay,
  aRoutineExercise,
  aWorkout,
  anExercise,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveNextDay, type NextDayOverview } from '@/domain/usecases/observe-next-day';

const day = (id: string, position: number) =>
  aRoutineDay({
    id,
    routineId: 'r1',
    name: `Día ${id}`,
    position,
    exercises: [
      aRoutineExercise({
        id: `${id}1`,
        routineDayId: id,
        exerciseId: 'leg-press',
        prescription: aPrescription({ sets: 3, restSeconds: 120 }),
      }),
      aRoutineExercise({
        id: `${id}2`,
        routineDayId: id,
        exerciseId: 'curl',
        position: 1,
        prescription: aPrescription({ role: 'accessory', sets: 2, restSeconds: 90 }),
      }),
    ],
  });

const ROUTINE = aRoutine({ id: 'r1', name: 'Cuerpo completo', days: [day('A', 0), day('B', 1)] });
const ACTIVE: Profile = { ...defaultProfile(), activeRoutineId: 'r1' };
const doneOn = (routineDayId: string) => aWorkout({ routineId: 'r1', routineDayId });
const NOW = new Date('2026-10-08T15:00:00Z');
const localDate = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;
const calibrate = expect.objectContaining({ reason: { code: 'CALIBRATION' } });

function observe({
  profile = ACTIVE as Profile | null,
  routines = [ROUTINE] as Routine[],
  finished = [] as Workout[],
} = {}) {
  const routineRepository = new InMemoryRoutineRepository(routines);
  const values: NextDayOverview[] = [];
  new ObserveNextDay(
    new InMemoryProfileRepository(profile),
    routineRepository,
    new InMemoryWorkoutRepository(null, finished),
    { observeAll: (o) => (o.next([anExercise({ id: 'leg-press', name: 'Prensa' })]), () => {}) },
    () => NOW,
    localDate,
  ).execute({ next: (value) => values.push(value), error: jest.fn() });
  return { last: () => values[values.length - 1], routines: routineRepository };
}

describe('ObserveNextDay', () => {
  it('RF-RUT-08.AC2: without a profile or an active routine there is no next day', () => {
    expect(observe({ profile: null }).last()).toEqual({ kind: 'noActiveRoutine' });
    expect(observe({ profile: defaultProfile() }).last()).toEqual({ kind: 'noActiveRoutine' });
  });

  it('RN-RUT-02: an active routine that was deleted counts as none', () => {
    expect(observe({ routines: [] }).last()).toEqual({ kind: 'noActiveRoutine' });
  });

  it('RF-RUT-02.AC1: never trained, the first day with its exercises and totals (C-06)', () => {
    expect(observe().last()).toEqual({
      kind: 'nextDay',
      routine: { id: 'r1', name: 'Cuerpo completo', dayCount: 2 },
      day: {
        id: 'A',
        name: 'Día A',
        exercises: [
          {
            id: 'A1',
            exerciseId: 'leg-press',
            name: 'Prensa',
            // RF-ENT-01.AC8: its main muscle (the builder's default).
            muscle: 'quads',
            prescription: aPrescription({ sets: 3, restSeconds: 120 }),
            // RF-SUG-01.AC1: never done, the instruction is to calibrate.
            suggestion: calibrate,
          },
          {
            id: 'A2',
            exerciseId: 'curl',
            name: null,
            muscle: null,
            prescription: aPrescription({ role: 'accessory', sets: 2, restSeconds: 90 }),
            suggestion: calibrate,
          },
        ],
      },
      sets: 5,
      // 3 × (40 + 120) + 2 × (40 + 90) = 740 s.
      minutes: 12,
      // Prensa works the quads (the builder's default); curl is not in the catalog.
      dayKind: 'lower',
      unit: 'kg',
      // NOW is Thursday 2026-10-08.
      week: { done: 0, doneDays: [], today: 3, goal: defaultProfile().daysPerWeek },
      days: [
        { id: 'A', name: 'Día A', daysAgo: null, exerciseNames: ['Prensa', null] },
        { id: 'B', name: 'Día B', daysAgo: null, exerciseNames: ['Prensa', null] },
      ],
    });
  });

  it('RF-ENT-01.AC3: each day with how many days ago it was done', () => {
    // aWorkout finishes on 2026-10-05; today is 2026-10-08.
    const next = observe({ finished: [doneOn('A')] }).last();

    expect(next.kind === 'nextDay' && next.days.map((d) => d.daysAgo)).toEqual([3, null]);
  });

  it('RF-ENT-01.AC8: the workouts of this week against the days per week', () => {
    // NOW is Thursday 2026-10-08: Monday 5 counts, Sunday 4 doesn't.
    const on = (day: string) =>
      aWorkout({
        id: day,
        routineId: 'r1',
        routineDayId: 'A',
        finishedAt: new Date(`${day}T19:00:00Z`),
      });
    const next = observe({
      profile: { ...ACTIVE, daysPerWeek: 4 },
      finished: [on('2026-10-04'), on('2026-10-05'), on('2026-10-07')],
    }).last();

    expect(next).toMatchObject({ week: { done: 2, doneDays: [0, 2], today: 3, goal: 4 } });
  });

  it('RN-RUT-01: after day A comes day B', () => {
    const next = observe({ finished: [doneOn('A')] }).last();

    expect(next.kind === 'nextDay' && next.day.id).toBe('B');
  });

  it('RN-RUT-01: the last day done counts by its position after it was deleted', async () => {
    const three = { ...ROUTINE, days: [day('A', 0), day('B', 1), day('C', 2)] };
    const { last, routines } = observe({ routines: [three], finished: [doneOn('B')] });

    await routines.save({ ...three, days: [day('A', 0), day('C', 2)] });

    const next = last();
    expect(next.kind === 'nextDay' && next.day.id).toBe('C');
  });
});
