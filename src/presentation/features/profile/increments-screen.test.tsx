import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { InMemoryProfileRepository } from '@/domain/testing/in-memory-repositories';
import { ObserveProfile } from '@/domain/usecases/observe-profile';
import { UpdateLoadSetting } from '@/domain/usecases/update-load-setting';
import { IncrementsScreen } from '@/presentation/features/profile/increments-screen';
import { profile as text } from '@/presentation/strings/profile';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

async function renderScreen() {
  const profiles = new InMemoryProfileRepository(defaultProfile());
  const useCases = someUseCases({
    observeProfile: new ObserveProfile(profiles),
    updateLoadSetting: new UpdateLoadSetting(profiles),
  });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases}>
        <IncrementsScreen onBack={jest.fn()} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { profiles };
}

describe('IncrementsScreen (S21, RF-PERF-06)', () => {
  it('AC1: the default increments and the bar, in kg', async () => {
    await renderScreen();

    expect(screen.getByRole('button', { name: 'Barra' })).toHaveAccessibilityValue({
      text: '2,5 kg',
    });
    expect(
      screen.getByRole('button', { name: text.increments.barWeight }),
    ).toHaveAccessibilityValue({ text: '20 kg' });
    expect(screen.getByText(text.increments.lbNote)).toBeOnTheScreen();
  });

  it('AC2: a row opens its sheet and «Guardar» saves the typed value', async () => {
    const { profiles } = await renderScreen();

    await userEvent.press(screen.getByRole('button', { name: 'Mancuerna' }));
    const field = screen.getByDisplayValue('2');
    await userEvent.clear(field);
    await userEvent.type(field, '2,5');
    await userEvent.press(screen.getByRole('button', { name: text.sheets.save }));

    expect(profiles.profile?.loadIncrementsKg.dumbbell).toBe(2.5);
  });

  it('an out-of-range value shows the error and is not saved', async () => {
    const { profiles } = await renderScreen();

    await userEvent.press(screen.getByRole('button', { name: 'Máquina' }));
    const field = screen.getByDisplayValue('5');
    await userEvent.clear(field);
    await userEvent.type(field, '80');
    await userEvent.press(screen.getByRole('button', { name: text.sheets.save }));

    expect(screen.getByText(text.increments.invalid(50, 'kg'))).toBeOnTheScreen();
    expect(profiles.profile?.loadIncrementsKg.machine).toBe(5);
  });
});
