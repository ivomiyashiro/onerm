import type { LocalDate } from '@/domain/models/local-date';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aBilateralSet, anExercise, aWorkout, aWorkoutExercise } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveWeeklyVolume, type WeeklyVolume } from '@/domain/usecases/observe-weekly-volume';

const localDate = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;
const PRESS = anExercise({
  id: 'press',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps', 'shoulders'],
});

const on = (date: string, sets: number) =>
  aWorkout({
    id: date,
    startedAt: new Date(`${date}T11:00:00Z`),
    finishedAt: new Date(`${date}T12:00:00Z`),
    exercises: [
      aWorkoutExercise({
        id: `${date}-we`,
        exerciseId: 'press',
        status: 'done',
        sets: Array.from({ length: sets }, (_, i) =>
          aBilateralSet({ id: `${date}-${i}`, position: i }),
        ),
      }),
    ],
  });

// Wednesday 14 October 2026: the week goes from Monday 12 to Sunday 18.
function observe(weeksAgo: number) {
  let volume: WeeklyVolume | undefined;
  new ObserveWeeklyVolume(
    new InMemoryProfileRepository({ ...defaultProfile(), daysPerWeek: 3 }),
    new InMemoryWorkoutRepository(null, [
      on('2026-10-05', 2),
      on('2026-10-12', 3),
      on('2026-10-13', 1),
    ]),
    { observeAll: (o) => (o.next([PRESS]), () => {}) },
    () => new Date('2026-10-14T12:00:00Z'),
    localDate,
  ).execute(weeksAgo, { next: (value) => (volume = value), error: jest.fn() });
  return volume!;
}

describe('ObserveWeeklyVolume', () => {
  it('RF-PROG-06.AC1, RN-PROG-04: this week, 1 per primary muscle and 0.5 per secondary', () => {
    const volume = observe(0);

    expect(volume).toMatchObject({
      weekStart: '2026-10-12',
      weekEnd: '2026-10-18',
      workouts: 2,
      goal: 3,
    });
    expect(volume.muscles.slice(0, 3)).toEqual([
      { muscle: 'chest', sets: 4 },
      { muscle: 'shoulders', sets: 2 },
      { muscle: 'triceps', sets: 2 },
    ]);
    expect(volume.muscles.at(-1)).toMatchObject({ sets: 0 });
  });

  it('RF-PROG-06.AC2: an earlier week', () => {
    const volume = observe(1);

    expect(volume).toMatchObject({ weekStart: '2026-10-05', workouts: 1 });
    expect(volume.muscles[0]).toEqual({ muscle: 'chest', sets: 2 });
  });
});
