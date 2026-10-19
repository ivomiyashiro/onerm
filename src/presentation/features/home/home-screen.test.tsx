import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aBilateralSet,
  aPrescription,
  aRoutine,
  aRoutineDay,
  aRoutineExercise,
  anExercise,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { HomeScreen } from '@/presentation/features/home/home-screen';
import { home } from '@/presentation/strings/home';
import {
  backupNoticeOver,
  routineUseCasesOver,
  someUseCases,
} from '@/presentation/use-cases/testing';
import { profile as profileText } from '@/presentation/strings/profile';
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

/** Day A done on Monday 2026-10-05: the leg press at 100 kg × 12, the top of its range. */
const LAST_TIME = aWorkout({
  exercises: [
    aWorkoutExercise({
      exerciseId: 'leg-press',
      plannedExerciseId: 'leg-press',
      status: 'done',
      sets: [0, 1, 2].map((position) =>
        aBilateralSet({ id: `s${position}`, position, loadKg: 100, reps: 12, rir: 2 }),
      ),
    }),
  ],
});

async function renderScreen({
  profile = { ...defaultProfile(), activeRoutineId: 'routine-1' } as Profile | null,
  useCases = undefined as UseCases | undefined,
  finished = [] as ReturnType<typeof aWorkout>[],
} = {}) {
  const repositories = {
    routines: new InMemoryRoutineRepository([FULL_BODY]),
    templates: new InMemoryRoutineTemplateRepository(),
    profiles: new InMemoryProfileRepository(profile),
    workouts: new InMemoryWorkoutRepository(null, finished),
  };
  const callbacks = {
    onChooseRoutine: jest.fn(),
    onCreateRoutine: jest.fn(),
    onChangeDay: jest.fn(),
  };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider
        useCases={
          useCases ??
          someUseCases(
            routineUseCasesOver({
              ...repositories,
              exercises: [anExercise({ id: 'leg-press', name: 'Prensa de piernas' })],
              // Wednesday 2026-10-07: LAST_TIME, on Monday, is this week.
              now: () => new Date('2026-10-07T12:00:00Z'),
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
    expect(screen.getByText(home.meta('Cuerpo completo A/B', 1, 8))).toBeOnTheScreen();
    expect(screen.getByText(home.todayList)).toBeOnTheScreen();
    expect(screen.getAllByText('Prensa de piernas').length).toBeGreaterThan(0);
  });

  it('RF-ENT-01.AC8: it starts with the suggestion of the first exercise, and the week so far', async () => {
    await renderScreen({ finished: [LAST_TIME] });

    expect(screen.getByText(home.startsWith)).toBeOnTheScreen();
    expect(screen.getByLabelText(home.weekName(1, defaultProfile().daysPerWeek))).toBeOnTheScreen();
  });

  it('RF-ENT-01.AC8: each exercise says what changes with a badge, the main one highlighted', async () => {
    await renderScreen({ finished: [LAST_TIME] });

    // 3 × 12 at the top of 8–12 → more load (RN-SUG-03), and the leg press is a main exercise.
    expect(screen.getByText(home.mainBadge(home.badges.up))).toBeOnTheScreen();
  });

  it('#196: an exercise never done shows no suggestion and no «Calibrar» pill', async () => {
    await renderScreen();

    expect(screen.getAllByText('Prensa de piernas').length).toBeGreaterThan(0);
    expect(screen.queryByText('Calibrar')).not.toBeOnTheScreen();
  });

  it('RF-ENT-01.AC3: «Cambiar día» opens the choice of day', async () => {
    const { user, onChangeDay } = await renderScreen();

    await user.press(screen.getByRole('button', { name: home.changeDay }));

    expect(onChangeDay).toHaveBeenCalled();
  });

  it('a one-word day name is shown whole', async () => {
    const routines = new InMemoryRoutineRepository([
      { ...FULL_BODY, days: [{ ...FULL_BODY.days[0], name: 'Pierna' }] },
    ]);
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <UseCasesProvider
          useCases={someUseCases(
            routineUseCasesOver({
              routines,
              templates: new InMemoryRoutineTemplateRepository(),
              profiles: new InMemoryProfileRepository({
                ...defaultProfile(),
                activeRoutineId: 'routine-1',
              }),
              workouts: new InMemoryWorkoutRepository(),
            }),
          )}
        >
          <HomeScreen
            onChooseRoutine={jest.fn()}
            onCreateRoutine={jest.fn()}
            onChangeDay={jest.fn()}
          />
        </UseCasesProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByRole('header', { name: 'Pierna' })).toBeOnTheScreen();
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

  it('RF-SYNC-06.AC2: a discreet notice of the changes not backed up, never a dialog', async () => {
    await renderScreen({
      useCases: someUseCases({
        observeBackupNotice: backupNoticeOver({
          owner: 'guest',
          pending: 2,
          conflicts: 0,
          lastSyncedAt: null,
          restoreCompleted: true,
        }),
      }),
    });

    expect(screen.getByText(profileText.sync.pendingOnline(2))).toBeOnTheScreen();
  });

  it('RF-SYNC-03.AC2: a restoration not finished says the suggestions may lack data', async () => {
    await renderScreen({
      useCases: someUseCases({
        observeBackupNotice: backupNoticeOver({
          owner: 'user',
          pending: 0,
          conflicts: 0,
          lastSyncedAt: null,
          restoreCompleted: false,
        }),
      }),
    });

    expect(screen.getByText(home.restoreIncomplete)).toBeOnTheScreen();
  });
});
