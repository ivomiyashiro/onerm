import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Exercise } from '@/domain/models/exercise';
import type { Workout } from '@/domain/models/workout';
import type { Observer } from '@/domain/repositories/observer';
import { aBilateralSet, aWorkout, aWorkoutExercise, anExercise } from '@/domain/testing/builders';
import { ObserveExerciseDetail } from '@/domain/usecases/observe-exercise-detail';
import { ObserveSyncActivity } from '@/domain/usecases/observe-sync-activity';
import type { SyncActivity } from '@/domain/usecases/sync-scheduler';
import { ExerciseDetailScreen } from '@/presentation/features/exercises/exercise-detail-screen';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const ROW = anExercise({
  id: 'row',
  name: 'Remo con mancuerna a una mano',
  primaryMuscles: ['back'],
  secondaryMuscles: ['biceps', 'shoulders'],
  primaryEquipment: 'dumbbell',
  equipment: ['dumbbell'],
  isUnilateral: true,
  technique: {
    steps: ['Apoyá una rodilla en el banco.', 'Llevá la mancuerna hacia la cadera.'],
    mistakes: ['Girar el torso.'],
  },
  attributions: [{ source: 'wger', license: 'CC BY-SA 4.0', attribution: 'wger.de' }],
});

const LEG_PRESS = anExercise({
  id: 'row',
  name: 'Prensa de piernas',
  primaryEquipment: 'machine',
  equipment: ['machine'],
  machine: 'leg-press',
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

const WITH_ROW: Workout = aWorkout({
  status: 'finished',
  finishedAt: new Date('2026-10-01T10:00:00Z'),
  exercises: [aWorkoutExercise({ exerciseId: 'row', sets: [aBilateralSet()] })],
});

async function renderScreen() {
  const exerciseObservers = new Set<Observer<Exercise | null>>();
  const workoutObservers = new Set<Observer<Workout[]>>();
  const observeExerciseDetail = new ObserveExerciseDetail(
    {
      observeById(_id, observer) {
        exerciseObservers.add(observer);
        return () => exerciseObservers.delete(observer);
      },
    },
    {
      observeFinished(observer) {
        workoutObservers.add(observer);
        return () => workoutObservers.delete(observer);
      },
    },
  );
  const activityListeners = new Set<(activity: SyncActivity) => void>();
  const observeSyncActivity = new ObserveSyncActivity({
    observeActivity(listener) {
      activityListeners.add(listener);
      listener({ running: false, lastResult: null, online: null, restoring: null });
      return () => activityListeners.delete(listener);
    },
  });
  const onBack = jest.fn();
  const onOpenProgress = jest.fn();
  const onOpenVideo = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={someUseCases({ observeExerciseDetail, observeSyncActivity })}>
        <ExerciseDetailScreen
          exerciseId="row"
          onBack={onBack}
          onOpenProgress={onOpenProgress}
          onOpenVideo={onOpenVideo}
        />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return {
    onBack,
    onOpenProgress,
    onOpenVideo,
    setOnline: (online: boolean) =>
      act(() => {
        activityListeners.forEach((l) =>
          l({ running: false, lastResult: null, online, restoring: null }),
        );
      }),
    emit: (exercise: Exercise | null, workouts: Workout[] = []) =>
      act(() => {
        exerciseObservers.forEach((o) => o.next(exercise));
        workoutObservers.forEach((o) => o.next(workouts));
      }),
    fail: () =>
      act(() => {
        exerciseObservers.forEach((o) => o.error(new Error('disk')));
      }),
  };
}

describe('ExerciseDetailScreen (S17)', () => {
  it('RF-CAT-02.AC1: shows name, equipment, unilateral, muscles, technique and source', async () => {
    const { emit } = await renderScreen();

    await emit(ROW);

    expect(screen.getByRole('header', { name: catalog.detail.title })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: ROW.name })).toBeOnTheScreen();
    expect(screen.getByText(catalog.equipment.dumbbell)).toBeOnTheScreen();
    expect(screen.getByText(catalog.detail.unilateral)).toBeOnTheScreen();
    expect(screen.getByText(catalog.detail.primary)).toBeOnTheScreen();
    expect(screen.getByText(catalog.muscles.back)).toBeOnTheScreen();
    expect(screen.getByText(catalog.detail.secondary)).toBeOnTheScreen();
    expect(screen.getByText(catalog.muscles.biceps)).toBeOnTheScreen();
    expect(screen.getByText(catalog.muscles.shoulders)).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: catalog.detail.howTo })).toBeOnTheScreen();
    expect(screen.getByText('Apoyá una rodilla en el banco.')).toBeOnTheScreen();
    expect(screen.getByText('Llevá la mancuerna hacia la cadera.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: catalog.detail.mistakes })).toBeOnTheScreen();
    expect(screen.getByText(/Girar el torso\./)).toBeOnTheScreen();
    expect(screen.getByText(catalog.detail.source('wger', 'CC BY-SA 4.0'))).toBeOnTheScreen();
  });

  it('RF-CAT-02.AC2: with logged sets offers «Ver mi progreso», which opens it', async () => {
    const user = userEvent.setup();
    const { emit, onOpenProgress } = await renderScreen();
    await emit(ROW, [WITH_ROW]);

    await user.press(screen.getByRole('button', { name: catalog.detail.seeProgress }));

    expect(onOpenProgress).toHaveBeenCalledWith('row');
  });

  it('RF-CAT-02.AC2: without logged sets there is no «Ver mi progreso»', async () => {
    const { emit } = await renderScreen();

    await emit(ROW);

    expect(
      screen.queryByRole('button', { name: catalog.detail.seeProgress }),
    ).not.toBeOnTheScreen();
  });

  it('RF-CAT-02.AC3: without a technique the section is hidden', async () => {
    const { emit } = await renderScreen();

    await emit({ ...ROW, technique: null });

    expect(screen.queryByText(catalog.detail.howTo)).not.toBeOnTheScreen();
    expect(screen.queryByText(catalog.detail.mistakes)).not.toBeOnTheScreen();
  });

  it('RF-CAT-02.AC4: a machine exercise shows the picture of its machine and how to recognize it', async () => {
    const { emit } = await renderScreen();

    await emit(LEG_PRESS);

    expect(
      screen.getByRole('image', { name: catalog.machines['leg-press'].picture }),
    ).toBeOnTheScreen();
    expect(screen.getByText(catalog.machines['leg-press'].hint)).toBeOnTheScreen();
  });

  it('RF-CAT-02.AC4: an exercise that is not done on a machine has no picture', async () => {
    const { emit } = await renderScreen();

    await emit(ROW);

    expect(screen.queryByRole('image')).not.toBeOnTheScreen();
  });

  it('RF-CAT-02.AC5: «Ver un video» opens the curated video, or a YouTube search', async () => {
    const user = userEvent.setup();
    const { emit, onOpenVideo } = await renderScreen();
    await emit({ ...ROW, videoUrl: 'https://youtu.be/abc' });

    await user.press(screen.getByRole('button', { name: catalog.detail.video }));
    await emit(ROW);
    await user.press(screen.getByRole('button', { name: catalog.detail.video }));

    expect(onOpenVideo.mock.calls).toEqual([
      ['https://youtu.be/abc'],
      [
        'https://www.youtube.com/results?search_query=Remo%20con%20mancuerna%20a%20una%20mano%20t%C3%A9cnica',
      ],
    ]);
    expect(screen.getByText(catalog.detail.videoOnline)).toBeOnTheScreen();
  });

  it('RF-CAT-02.AC6: offline, «Ver un video» is disabled and says why', async () => {
    const user = userEvent.setup();
    const { emit, setOnline, onOpenVideo } = await renderScreen();
    await emit(ROW);

    await setOnline(false);
    await user.press(screen.getByRole('button', { name: catalog.detail.video }));

    expect(screen.getByRole('button', { name: catalog.detail.video })).toBeDisabled();
    expect(screen.getByText(catalog.detail.videoOffline)).toBeOnTheScreen();
    expect(onOpenVideo).not.toHaveBeenCalled();
  });

  it('a bilateral exercise without secondary muscles shows neither', async () => {
    const { emit } = await renderScreen();

    await emit({ ...ROW, isUnilateral: false, secondaryMuscles: [] });

    expect(screen.queryByText(catalog.detail.unilateral)).not.toBeOnTheScreen();
    expect(screen.queryByText(catalog.detail.secondary)).not.toBeOnTheScreen();
  });

  it('deprecated: says it is no longer in the catalog (RN-CAT-01)', async () => {
    const { emit } = await renderScreen();

    await emit({ ...ROW, deprecatedAt: new Date('2026-09-01T00:00:00Z') });

    expect(screen.getByText(catalog.detail.deprecated)).toBeOnTheScreen();
  });

  it('notFound: says the exercise is not available yet (RN-CAT-04)', async () => {
    const { emit } = await renderScreen();

    await emit(null);

    expect(screen.getByText(catalog.detail.notYetAvailable)).toBeOnTheScreen();
  });

  it('loading: only the top bar', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: catalog.detail.title })).toBeOnTheScreen();
    expect(screen.queryByText(catalog.detail.primary)).not.toBeOnTheScreen();
  });

  it('error: shows the read error and retries', async () => {
    const user = userEvent.setup();
    const { fail, emit } = await renderScreen();
    await fail();

    await user.press(screen.getByRole('button', { name: common.retry }));
    await emit(ROW);

    expect(screen.getByRole('header', { name: ROW.name })).toBeOnTheScreen();
  });

  it('the back button goes back', async () => {
    const user = userEvent.setup();
    const { onBack } = await renderScreen();

    await user.press(screen.getByRole('button', { name: common.back }));

    expect(onBack).toHaveBeenCalled();
  });
});
