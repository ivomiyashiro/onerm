import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aRoutineTemplate, anExercise } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { TemplateScreen } from '@/presentation/features/routines/template-screen';
import { common } from '@/presentation/strings/common';
import { dialogs } from '@/presentation/strings/dialogs';
import { routines as text } from '@/presentation/strings/routines';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

const FB3 = aRoutineTemplate({
  id: 'PLT-FB3',
  name: 'Cuerpo completo A/B',
  days: [
    {
      id: 'A',
      name: 'Día A',
      position: 0,
      exercises: [
        { id: 'A1', exerciseId: 'leg-press', position: 0, role: 'main', sets: 3 },
        { id: 'A2', exerciseId: 'curl', position: 1, role: 'accessory', sets: 2 },
      ],
    },
  ],
});

async function renderScreen({
  profile = { ...defaultProfile(), goal: 'hypertrophy' } as Profile | null,
  useCases = undefined as UseCases | undefined,
} = {}) {
  const repositories = {
    routines: new InMemoryRoutineRepository([aRoutine({ id: 'mine', name: 'Mi rutina' })]),
    templates: new InMemoryRoutineTemplateRepository([FB3]),
    profiles: new InMemoryProfileRepository(profile),
    workouts: new InMemoryWorkoutRepository(),
  };
  const callbacks = { onBack: jest.fn(), onAdopted: jest.fn(), onGoToWorkout: jest.fn() };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider
        useCases={
          useCases ??
          someUseCases(
            routineUseCasesOver({
              ...repositories,
              exercises: [
                anExercise({ id: 'leg-press', name: 'Prensa de piernas' }),
                anExercise({ id: 'curl', name: 'Curl de bíceps' }),
              ],
              newId: () => 'new-1',
            }),
          )
        }
      >
        <TemplateScreen templateId="PLT-FB3" {...callbacks} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { ...callbacks, ...repositories, user: userEvent.setup() };
}

describe('TemplateScreen (S14)', () => {
  it('loading: only the top bar', async () => {
    await renderScreen({ useCases: someUseCases() });

    expect(screen.getByRole('header', { name: text.template.label })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: text.template.use })).not.toBeOnTheScreen();
  });

  it('RF-RUT-01.AC2: the days, exercises and sets with the prescription for the goal', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: 'Cuerpo completo A/B' })).toBeOnTheScreen();
    expect(
      screen.getByText(text.template.prescription('ganar músculo', '6–10', 2)),
    ).toBeOnTheScreen();
    expect(screen.getByText(text.template.dayTitle('Día A', 2))).toBeOnTheScreen();
    expect(screen.getByText('Prensa de piernas')).toBeOnTheScreen();
    expect(screen.getByText(text.template.exerciseLine(3, '6–10', 'main'))).toBeOnTheScreen();
    expect(screen.getByText(text.template.exerciseLine(2, '10–15', 'accessory'))).toBeOnTheScreen();
  });

  it('with the strength goal warns that the templates use no barbell (11 §7)', async () => {
    await renderScreen({ profile: { ...defaultProfile(), goal: 'strength' } });

    expect(screen.getByText(text.template.strengthWarning)).toBeOnTheScreen();
  });

  it('RF-RUT-01.AC3: «¿Por qué esta rutina?» gives its criteria in plain language with their sources', async () => {
    const { user } = await renderScreen();

    await user.press(screen.getByRole('button', { name: text.template.why }));

    expect(screen.getByText(text.template.rationale['PLT-FB3'])).toBeOnTheScreen();
    for (const { title, sources } of text.template.criteria['PLT-FB3']) {
      expect(screen.getByText(title)).toBeOnTheScreen();
      expect(screen.getByText(sources)).toBeOnTheScreen();
    }
    await user.press(screen.getByRole('button', { name: common.understood }));
    expect(screen.queryByText(text.template.rationale['PLT-FB3'])).not.toBeOnTheScreen();
  });

  it('RF-RUT-02.AC1: «Usar esta rutina» adopts it and goes on', async () => {
    const { user, profiles, onAdopted } = await renderScreen();

    await user.press(screen.getByRole('button', { name: text.template.use }));

    expect(profiles.profile?.activeRoutineId).toBe('new-1');
    expect(onAdopted).toHaveBeenCalled();
  });

  it('RF-RUT-02.AC2: with an active routine D07 says it stays in Mis rutinas', async () => {
    const { user, onAdopted } = await renderScreen({
      profile: { ...defaultProfile(), activeRoutineId: 'mine' },
    });

    await user.press(screen.getByRole('button', { name: text.template.use }));
    expect(screen.getByText(dialogs.D07.body('Mi rutina'))).toBeOnTheScreen();
    await user.press(screen.getAllByRole('button', { name: dialogs.D07.use }).at(-1)!);

    expect(onAdopted).toHaveBeenCalled();
  });

  it('error: shows the read error and retries', async () => {
    const { profiles, user } = await renderScreen();
    await act(() => profiles.fail());

    await user.press(screen.getByRole('button', { name: text.list.readError.retry }));

    expect(screen.getByRole('header', { name: 'Cuerpo completo A/B' })).toBeOnTheScreen();
  });

  it('the back button goes back', async () => {
    const { user, onBack } = await renderScreen();

    await user.press(screen.getByRole('button', { name: common.back }));

    expect(onBack).toHaveBeenCalled();
  });
});
