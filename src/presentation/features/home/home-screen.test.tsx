import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aPrescription,
  aRoutine,
  aRoutineDay,
  aRoutineExercise,
  anExercise,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { HomeScreen } from '@/presentation/features/home/home-screen';
import { home } from '@/presentation/strings/home';
import { routines as routineText } from '@/presentation/strings/routines';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

const FULL_BODY = aRoutine({
  name: 'Cuerpo completo A/B',
  days: [
    aRoutineDay({
      name: 'Día A',
      exercises: [
        aRoutineExercise({
          exerciseId: 'leg-press',
          prescription: aPrescription({ sets: 3, repRange: { min: 8, max: 12 }, restSeconds: 120 }),
        }),
      ],
    }),
  ],
});

async function renderScreen({
  profile = { ...defaultProfile(), activeRoutineId: 'routine-1' } as Profile | null,
  useCases = undefined as UseCases | undefined,
} = {}) {
  const repositories = {
    routines: new InMemoryRoutineRepository([FULL_BODY]),
    templates: new InMemoryRoutineTemplateRepository(),
    profiles: new InMemoryProfileRepository(profile),
    workouts: new InMemoryWorkoutRepository(),
  };
  const callbacks = { onChooseRoutine: jest.fn(), onCreateRoutine: jest.fn() };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider
        useCases={
          useCases ??
          someUseCases(
            routineUseCasesOver({
              ...repositories,
              exercises: [anExercise({ id: 'leg-press', name: 'Prensa de piernas' })],
            }),
          )
        }
      >
        <HomeScreen {...callbacks} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { ...callbacks, ...repositories, user: userEvent.setup() };
}

describe('HomeScreen (S07)', () => {
  it('loading: placeholders', async () => {
    await renderScreen({ useCases: someUseCases() });

    expect(
      screen.getAllByTestId('home-skeleton', { includeHiddenElements: true }),
    ).not.toHaveLength(0);
  });

  it('RF-RUT-02.AC1: «Hoy toca» the next day, with its routine, totals and exercises', async () => {
    await renderScreen();

    expect(screen.getByText(home.todayIs)).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Día A' })).toBeOnTheScreen();
    expect(screen.getByText('Cuerpo completo A/B')).toBeOnTheScreen();
    expect(screen.getByText(home.stats.exercises(1))).toBeOnTheScreen();
    expect(screen.getByText(home.stats.approxMinutes(8))).toBeOnTheScreen();
    expect(screen.getByText(home.todayList)).toBeOnTheScreen();
    expect(screen.getByText('Prensa de piernas')).toBeOnTheScreen();
    expect(screen.getByText(routineText.template.setsByRange(3, '8–12'))).toBeOnTheScreen();
  });

  it('RF-RUT-08.AC2: without an active routine offers «Elegir una rutina» and «Crear rutina»', async () => {
    const { user, onChooseRoutine, onCreateRoutine } = await renderScreen({
      profile: defaultProfile(),
    });

    expect(screen.getByText(home.noRoutine.title)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: home.noRoutine.chooseRoutine }));
    await user.press(screen.getByRole('button', { name: home.noRoutine.createRoutine }));

    expect(onChooseRoutine).toHaveBeenCalled();
    expect(onCreateRoutine).toHaveBeenCalled();
  });

  it('error: shows the read error and retries', async () => {
    const { routines, user } = await renderScreen();
    await act(() => routines.fail());

    expect(screen.getByText(home.readError.title)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: home.readError.retry }));

    expect(screen.getByRole('header', { name: 'Día A' })).toBeOnTheScreen();
  });
});
