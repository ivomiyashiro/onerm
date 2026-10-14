import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { LoadUnit } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aBilateralSet,
  anExercise,
  aRoutine,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { useExerciseProgressViewModel } from '@/presentation/features/progress/use-exercise-progress-view-model';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

const PRESS = anExercise({ id: 'press', name: 'Press de pecho' });
const PUSH_UP = anExercise({ id: 'push-up', name: 'Flexiones', loadType: 'bodyweight' });

const on = (date: string, exerciseId: string, loadKg: number | null, reps: number, rir = 2) =>
  aWorkout({
    id: `${date}-${exerciseId}`,
    startedAt: new Date(`${date}T11:00:00Z`),
    finishedAt: new Date(`${date}T12:00:00Z`),
    exercises: [
      aWorkoutExercise({
        id: `${date}-${exerciseId}-we`,
        exerciseId,
        plannedExerciseId: exerciseId,
        loadType: loadKg === null ? 'bodyweight' : 'external',
        status: 'done',
        sets: [aBilateralSet({ id: `${date}-${exerciseId}-s`, loadKg, reps, rir })],
      }),
    ],
  });

async function renderViewModel(
  exerciseId: string,
  finished: Workout[],
  { unit = 'kg' as LoadUnit, useCases = undefined as UseCases | undefined } = {},
) {
  return renderHook(() => useExerciseProgressViewModel(exerciseId), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <UseCasesProvider
        useCases={
          useCases ??
          someUseCases(
            routineUseCasesOver({
              routines: new InMemoryRoutineRepository([aRoutine()]),
              templates: new InMemoryRoutineTemplateRepository(),
              profiles: new InMemoryProfileRepository({ ...defaultProfile(), unit }),
              workouts: new InMemoryWorkoutRepository(null, finished),
              exercises: [PRESS, PUSH_UP],
              now: () => new Date('2026-10-14T12:00:00Z'),
            }),
          )
        }
      >
        {children}
      </UseCasesProvider>
    ),
  });
}

const HISTORY = [
  on('2026-06-01', 'press', 60, 8),
  on('2026-09-20', 'press', 62.5, 8),
  on('2026-10-10', 'press', 60, 14, 1),
];

describe('useExerciseProgressViewModel', () => {
  it('loading until the progress arrives', async () => {
    const { result } = await renderViewModel('press', [], { useCases: someUseCases() });

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('RF-PROG-04.AC1, AC2: the e1RM over «3 meses», hollow when approximate, and best sets', async () => {
    const { result } = await renderViewModel('press', HISTORY);

    expect(result.current.period).toBe('threeMonths');
    expect(result.current.state).toMatchObject({
      status: 'content',
      cards: [{ label: 'Máximo estimado' }, { label: 'Mayor carga', value: '62,5 kg × 8' }],
      chart: { title: 'Máximo estimado en kg', legend: true },
      bestSets: [
        { date: '10 oct', set: '60 kg × 14' },
        { date: '20 sep', set: '62,5 kg × 8' },
      ],
    });
    // 60 × 14 RIR 1 → RTF 15: inside the formula but approximate (P-10).
    const points =
      result.current.state.status === 'content' ? result.current.state.chart.points : [];
    expect(points.map((p) => p.hollow)).toEqual([false, true]);
  });

  it('RF-PROG-04.AC3: «Todo» brings the older exposures', async () => {
    const { result } = await renderViewModel('press', HISTORY);

    await act(() => result.current.actions.choosePeriod('all'));

    expect(result.current.state).toMatchObject({ chart: { points: { length: 3 } } });
  });

  it('RF-PROG-04.AC5: without any e1RM, the reps of the best set', async () => {
    const { result } = await renderViewModel('press', [on('2026-10-10', 'press', 8, 18, 0)]);

    expect(result.current.state).toMatchObject({
      cards: [{ label: 'Mejor serie', value: '8 kg × 18' }, { label: 'Repeticiones totales' }],
      chart: { title: 'Repeticiones de la mejor serie (8 kg)', legend: false },
    });
  });

  it('RF-PROG-04.AC6: bodyweight follows the reps, without e1RM or best sets', async () => {
    const { result } = await renderViewModel('push-up', [
      on('2026-10-01', 'push-up', null, 12),
      on('2026-10-10', 'push-up', null, 15),
    ]);

    expect(result.current.state).toMatchObject({
      cards: [
        { label: 'Máximas reps', value: '15' },
        { label: 'Reps totales', value: '15' },
      ],
      chart: { title: 'Máximas repeticiones por entrenamiento', points: [{}, { record: true }] },
      bestSets: [],
    });
  });

  it('RF-PROG-04.AC7: in lb', async () => {
    const { result } = await renderViewModel('press', HISTORY, { unit: 'lb' });

    expect(result.current.state).toMatchObject({
      chart: { title: 'Máximo estimado en lb' },
      cards: [{}, { value: '137,8 lb × 8' }],
    });
  });

  it('missing without exposures of the exercise', async () => {
    const { result } = await renderViewModel('press', []);

    expect(result.current.state).toEqual({ status: 'missing' });
  });
});
