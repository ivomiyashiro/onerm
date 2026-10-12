import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Exercise } from '@/domain/models/exercise';
import type { Observer } from '@/domain/repositories/observer';
import { anExercise } from '@/domain/testing/builders';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { ExerciseSearchScreen } from '@/presentation/features/exercises/exercise-search-screen';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';
import { someUseCases } from '@/presentation/use-cases/testing';

jest.useFakeTimers();

const CHEST_PRESS = anExercise({
  id: 'chest-press',
  name: 'Press de pecho en máquina',
  primaryMuscles: ['chest'],
  primaryEquipment: 'machine',
  equipment: ['machine'],
});
const LAT_PULLDOWN = anExercise({
  id: 'lat-pulldown',
  name: 'Jalón al pecho',
  primaryMuscles: ['back'],
  primaryEquipment: 'cable',
  equipment: ['cable'],
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

async function renderScreen() {
  const observers = new Set<Observer<Exercise[]>>();
  const useCases = someUseCases({
    observeExercises: new ObserveExercises({
      observeAll(observer) {
        observers.add(observer);
        return () => observers.delete(observer);
      },
    }),
  });
  const onBack = jest.fn();
  const onOpenExercise = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases}>
        <ExerciseSearchScreen onBack={onBack} onOpenExercise={onOpenExercise} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return {
    onBack,
    onOpenExercise,
    emit: (exercises: Exercise[]) => act(() => observers.forEach((o) => o.next(exercises))),
    fail: () =>
      act(() => {
        observers.forEach((o) => o.error(new Error('disk I/O error')));
        observers.clear();
      }),
  };
}

describe('ExerciseSearchScreen (S16)', () => {
  it('loading: shows the skeleton rows under the search', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: catalog.search.title })).toBeOnTheScreen();
    expect(screen.getByLabelText(catalog.search.placeholder)).toBeOnTheScreen();
    expect(
      screen.getAllByTestId('exercise-skeleton', { includeHiddenElements: true }),
    ).toHaveLength(5);
  });

  it('content: shows the count and every result, and a result opens the detail', async () => {
    const user = userEvent.setup();
    const { emit, onOpenExercise } = await renderScreen();
    await emit([CHEST_PRESS, LAT_PULLDOWN]);

    expect(screen.getByText(catalog.search.count(2))).toBeOnTheScreen();
    expect(screen.getByText('Pecho · Máquina')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Jalón al pecho' }));

    expect(onOpenExercise).toHaveBeenCalledWith(LAT_PULLDOWN);
  });

  it('RF-CAT-01.AC1: typing narrows the results', async () => {
    const user = userEvent.setup();
    const { emit } = await renderScreen();
    await emit([CHEST_PRESS, LAT_PULLDOWN]);

    await user.type(screen.getByLabelText(catalog.search.placeholder), 'jalon');

    expect(screen.getByText(catalog.search.count(1))).toBeOnTheScreen();
    expect(screen.queryByText(CHEST_PRESS.name)).not.toBeOnTheScreen();
  });

  it('RF-CAT-01.AC3: an equipment chip filters and shows as chosen', async () => {
    const user = userEvent.setup();
    const { emit } = await renderScreen();
    await emit([CHEST_PRESS, LAT_PULLDOWN]);

    await user.press(screen.getByRole('checkbox', { name: catalog.equipment.cable }));

    expect(screen.getByRole('checkbox', { name: catalog.equipment.cable })).toBeChecked();
    expect(screen.queryByText(CHEST_PRESS.name)).not.toBeOnTheScreen();
  });

  it('RF-CAT-01.AC3: «Más filtros» offers every muscle in a sheet', async () => {
    const user = userEvent.setup();
    const { emit } = await renderScreen();
    await emit([CHEST_PRESS, LAT_PULLDOWN]);

    await user.press(screen.getByRole('button', { name: catalog.search.moreFilters }));
    expect(screen.getByRole('header', { name: catalog.search.moreFilters })).toBeOnTheScreen();
    await user.press(screen.getByRole('checkbox', { name: catalog.muscles.back }));
    await user.press(screen.getByRole('button', { name: common.close }));

    expect(screen.getByRole('checkbox', { name: catalog.muscles.back })).toBeChecked();
    expect(screen.getByText(catalog.search.count(1))).toBeOnTheScreen();
  });

  it('RF-CAT-01.AC4: no results shows the message and «Limpiar filtros» clears the search', async () => {
    const user = userEvent.setup();
    const { emit } = await renderScreen();
    await emit([CHEST_PRESS, LAT_PULLDOWN]);
    await user.type(screen.getByLabelText(catalog.search.placeholder), 'press francés pierna');

    expect(screen.getByRole('header', { name: catalog.search.empty.title })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: catalog.search.empty.action }));

    expect(screen.getByLabelText(catalog.search.placeholder)).toHaveDisplayValue('');
    expect(screen.getByText(catalog.search.count(2))).toBeOnTheScreen();
  });

  it('error: shows the read error and retries', async () => {
    const user = userEvent.setup();
    const { fail, emit } = await renderScreen();
    await fail();

    expect(screen.getByRole('header', { name: catalog.search.readError.title })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: common.retry }));
    await emit([CHEST_PRESS]);

    expect(screen.getByText(CHEST_PRESS.name)).toBeOnTheScreen();
  });

  it('the back button goes back', async () => {
    const user = userEvent.setup();
    const { onBack } = await renderScreen();

    await user.press(screen.getByRole('button', { name: common.back }));

    expect(onBack).toHaveBeenCalled();
  });
});
