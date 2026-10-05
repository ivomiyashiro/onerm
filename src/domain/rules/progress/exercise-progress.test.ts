import { exerciseProgress } from '@/domain/rules/progress/exercise-progress';
import { anExposure } from '@/domain/testing/builders';

const day = (n: number) => new Date(Date.UTC(2026, 8, n, 12));

describe('RN-PROG-01/02 · progress of an exercise', () => {
  it('AC1 · one point per EE with an e1RM, with its precision', () => {
    const progress = exerciseProgress([
      anExposure([[60, 8, 2]], { workoutId: 'w1', finishedAt: day(1) }),
      anExposure([[60, 10, 2]], { workoutId: 'w2', finishedAt: day(4) }),
    ]);

    expect(progress.map((point) => [point.workoutId, point.e1rm?.precision])).toEqual([
      ['w1', 'standard'],
      ['w2', 'approximate'],
    ]);
    expect(progress[0].e1rm?.value).toBeCloseTo(80, 9);
    expect(progress[0].at).toEqual(day(1));
  });

  it('AC2 · the best set of each exposure: the heaviest, then the most reps', () => {
    const [point] = exerciseProgress([
      anExposure([
        [60, 10, 2],
        [62.5, 6, 1],
        [62.5, 7, 0],
        [55, 12, 2],
      ]),
    ]);

    expect(point.bestSet).toEqual({ loadKg: 62.5, reps: 7 });
  });

  it('AC5 · an exposure without an e1RM still has its best set', () => {
    const [point] = exerciseProgress([anExposure([[30, 16, 2]])]);

    expect(point.e1rm).toBeNull();
    expect(point.bestSet).toEqual({ loadKg: 30, reps: 16 });
  });

  it('AC6 · bodyweight: the most reps and the total reps, without e1RM (ADR-0005)', () => {
    const [point] = exerciseProgress([
      anExposure([
        [null, 15, null],
        [null, 14, null],
        [null, 12, null],
      ]),
    ]);

    expect(point).toMatchObject({ e1rm: null, bestSet: null, maxReps: 15, totalReps: 41 });
  });
});
