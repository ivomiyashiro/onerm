import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aRoutineTemplate, aWorkout } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { RoutinesScreen } from '@/presentation/features/routines/routines-screen';
import { dialogs } from '@/presentation/strings/dialogs';
import { routines as text } from '@/presentation/strings/routines';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

const FULL_BODY = aRoutine({ id: 'active', name: 'Cuerpo completo' });
const LEGS = aRoutine({ id: 'legs', name: 'Mi rutina de pierna' });
const IN_PROGRESS = aWorkout({ status: 'in_progress', finishedAt: null });

async function renderScreen({
  profile = { ...defaultProfile(), activeRoutineId: 'active' } as Profile | null,
  routines = [FULL_BODY, LEGS] as Routine[],
  inProgress = null as Workout | null,
  useCases = undefined as UseCases | undefined,
  initialSection = undefined as 'mine' | 'templates' | undefined,
} = {}) {
  const repositories = {
    routines: new InMemoryRoutineRepository(routines),
    templates: new InMemoryRoutineTemplateRepository([
      aRoutineTemplate({ id: 'PLT-FB3', name: 'Cuerpo completo A/B' }),
    ]),
    profiles: new InMemoryProfileRepository(profile),
    workouts: new InMemoryWorkoutRepository(inProgress),
  };
  const callbacks = {
    onOpenTemplate: jest.fn(),
    onCreateRoutine: jest.fn(),
    onEditRoutine: jest.fn(),
    onGoToWorkout: jest.fn(),
  };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases ?? someUseCases(routineUseCasesOver(repositories))}>
        <RoutinesScreen initialSection={initialSection} {...callbacks} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { ...callbacks, ...repositories, user: userEvent.setup() };
}

const card = (name: string) => screen.getByText(name);
const openMenu = (user: ReturnType<typeof userEvent.setup>, routine: string) =>
  user.press(screen.getByRole('button', { name: text.list.options(routine) }));

describe('RoutinesScreen (S13)', () => {
  it('loading: placeholders under the header', async () => {
    await renderScreen({ useCases: someUseCases() });

    expect(screen.getByRole('header', { name: text.list.title })).toBeOnTheScreen();
    expect(
      screen.getAllByTestId('routines-skeleton', { includeHiddenElements: true }),
    ).not.toHaveLength(0);
  });

  it('content: Mis rutinas with the active routine marked', async () => {
    await renderScreen();

    expect(screen.getByRole('tab', { name: text.list.mine })).toBeSelected();
    expect(card('Cuerpo completo')).toBeOnTheScreen();
    expect(card('Mi rutina de pierna')).toBeOnTheScreen();
    expect(screen.getAllByText(text.list.active)).toHaveLength(1);
  });

  it('empty: without own routines offers the templates', async () => {
    const { user } = await renderScreen({ routines: [] });

    expect(screen.getByText(text.list.empty.title)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: text.list.empty.action }));

    expect(screen.getByRole('tab', { name: text.list.templates })).toBeSelected();
  });

  it('RF-RUT-01.AC1: Plantillas lists each template, the recommended one marked, and opens it', async () => {
    const { user, onOpenTemplate } = await renderScreen();
    await user.press(screen.getByRole('tab', { name: text.list.templates }));

    expect(screen.getByText(text.list.recommended)).toBeOnTheScreen();
    expect(screen.getByText(text.list.summary(3, 'novice', 8))).toBeOnTheScreen();
    expect(screen.getByText(text.list.templatesHelp)).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Cuerpo completo A\/B/ }));
    expect(onOpenTemplate).toHaveBeenCalledWith('PLT-FB3');
  });

  it('«Elegir una rutina» from Inicio opens on Plantillas', async () => {
    await renderScreen({ initialSection: 'templates' });

    expect(screen.getByRole('tab', { name: text.list.templates })).toBeSelected();
  });

  it('error: shows the read error and retries', async () => {
    const { routines, user } = await renderScreen();
    await act(() => routines.fail());

    expect(screen.getByText(text.list.readError.title)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: text.list.readError.retry }));

    expect(card('Cuerpo completo')).toBeOnTheScreen();
  });

  it('RF-RUT-07.AC1: Activar from the menu asks with D07 and marks the new active routine', async () => {
    const { user, profiles } = await renderScreen();

    await openMenu(user, 'Mi rutina de pierna');
    await user.press(screen.getByRole('button', { name: text.list.menu.activate }));
    expect(
      screen.getByRole('header', { name: dialogs.D07.title('Mi rutina de pierna') }),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: dialogs.D07.use }));

    expect(profiles.profile?.activeRoutineId).toBe('legs');
  });

  it('the active routine has no «Activar» in its menu', async () => {
    const { user } = await renderScreen();

    await openMenu(user, 'Cuerpo completo');

    expect(screen.queryByRole('button', { name: text.list.menu.activate })).not.toBeOnTheScreen();
  });

  it('RF-RUT-08.AC1: Eliminar rutina asks with D11 and the routine leaves the list', async () => {
    const { user } = await renderScreen();

    await openMenu(user, 'Mi rutina de pierna');
    await user.press(screen.getByRole('button', { name: text.list.menu.delete }));
    expect(
      screen.getByRole('header', { name: dialogs.D11.title('Mi rutina de pierna') }),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: dialogs.D11.deleteDestructive }));

    expect(screen.queryByText('Mi rutina de pierna')).not.toBeOnTheScreen();
  });

  it('RF-RUT-07.AC2: with a workout in progress shows D14, which goes to the workout', async () => {
    const { user, onGoToWorkout } = await renderScreen({ inProgress: IN_PROGRESS });

    await openMenu(user, 'Mi rutina de pierna');
    await user.press(screen.getByRole('button', { name: text.list.menu.activate }));
    expect(screen.getByText(dialogs.D14.body('changeRoutine'))).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: dialogs.D14.goToWorkout }));

    expect(onGoToWorkout).toHaveBeenCalled();
  });

  it('«Crear rutina» and «Editar» open the editor', async () => {
    const { user, onCreateRoutine, onEditRoutine } = await renderScreen();

    await user.press(screen.getByRole('button', { name: text.list.create }));
    await openMenu(user, 'Mi rutina de pierna');
    await user.press(screen.getByRole('button', { name: text.list.menu.edit }));

    expect(onCreateRoutine).toHaveBeenCalled();
    expect(onEditRoutine).toHaveBeenCalledWith('legs');
  });
});
