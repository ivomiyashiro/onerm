import { render, screen, userEvent, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine } from '@/domain/testing/builders';
import {
  FakeDevicePermissions,
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
} from '@/domain/testing/in-memory-repositories';
import { AdjustActiveRoutine } from '@/domain/usecases/adjust-active-routine';
import { ObserveProfile } from '@/domain/usecases/observe-profile';
import { UpdateProfile } from '@/domain/usecases/update-profile';
import { ProfileScreen } from '@/presentation/features/profile/profile-screen';
import { dialogs } from '@/presentation/strings/dialogs';
import { onboarding } from '@/presentation/strings/onboarding';
import { profile as text } from '@/presentation/strings/profile';
import { restUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

async function renderScreen(
  profile: Profile | null = defaultProfile(),
  permissions = new FakeDevicePermissions(),
) {
  const profiles = new InMemoryProfileRepository(profile);
  const routines = new InMemoryRoutineRepository([aRoutine()]);
  const useCases = someUseCases({
    ...restUseCasesOver({ permissions }),
    observeProfile: new ObserveProfile(profiles),
    updateProfile: new UpdateProfile(profiles, routines),
    adjustActiveRoutine: new AdjustActiveRoutine(profiles, routines),
  });
  const callbacks = {
    onSignUp: jest.fn(),
    onSignIn: jest.fn(),
    onAbout: jest.fn(),
    onIncrements: jest.fn(),
  };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases}>
        <ProfileScreen {...callbacks} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { profiles, ...callbacks };
}

describe('ProfileScreen (S21)', () => {
  it('#146: «Notificaciones del descanso» is on with both permissions', async () => {
    await renderScreen();

    expect(await screen.findByText(text.rows.restNotificationsHelp)).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: text.rows.restNotifications })).toHaveProp(
      'value',
      true,
    );
  });

  it('RF-ENT-06.AC7: blocked notifications say so and open the phone settings', async () => {
    const permissions = new FakeDevicePermissions('denied');
    const user = userEvent.setup();
    await renderScreen(defaultProfile(), permissions);

    expect(await screen.findByText(text.permissions.notificationsBlocked)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: text.permissions.openPhoneSettings }));

    expect(permissions.opened).toEqual(['notifications']);
  });

  it('RF-ENT-06.AC10: without exact alarms, «Permitir» opens D17', async () => {
    const user = userEvent.setup();
    await renderScreen(defaultProfile(), new FakeDevicePermissions('granted', false));

    await user.press(await screen.findByRole('button', { name: text.permissions.allow }));

    expect(screen.getByRole('header', { name: dialogs.D17.title })).toBeOnTheScreen();
  });

  it('content: each setting with its value', async () => {
    await renderScreen({ ...defaultProfile(), goal: 'hypertrophy', unit: 'lb' });

    expect(screen.getByRole('button', { name: text.rows.level })).toHaveAccessibilityValue({
      text: 'Novato',
    });
    expect(screen.getByRole('button', { name: text.rows.goal })).toHaveAccessibilityValue({
      text: 'Ganar músculo',
    });
    expect(screen.getByRole('button', { name: text.rows.unit })).toHaveAccessibilityValue({
      text: 'lb',
    });
  });

  it('RF-AUTH-01.AC4: the guest sees that the data is only on this phone, and «Crear cuenta»', async () => {
    const { onSignUp } = await renderScreen();

    expect(screen.getByText(text.sync.guest)).toBeOnTheScreen();
    await userEvent.press(screen.getAllByRole('button', { name: text.sync.createAccount })[0]);
    expect(onSignUp).toHaveBeenCalled();
  });

  it('RF-PERF-05.AC2: the effort sheet saves numeric RIR', async () => {
    const { profiles } = await renderScreen();

    await userEvent.press(screen.getByRole('button', { name: text.rows.effort }));
    await userEvent.press(screen.getByRole('radio', { name: text.sheets.rir.title }));
    await userEvent.press(screen.getByRole('button', { name: text.sheets.save }));

    expect(profiles.profile).toMatchObject({ effortMode: 'rir', effortModeExplicit: true });
  });

  it('RF-PERF-03.AC2: a new goal with an active routine shows D06', async () => {
    await renderScreen({ ...defaultProfile(), activeRoutineId: 'routine-1' });

    await userEvent.press(screen.getByRole('button', { name: text.rows.goal }));
    await userEvent.press(screen.getByRole('radio', { name: onboarding.goal.strength.title }));
    await userEvent.press(screen.getByRole('button', { name: text.sheets.save }));

    expect(screen.getByText(dialogs.D06.body('ganar fuerza'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: dialogs.D06.adjust })).toBeOnTheScreen();
  });

  it('RF-PERF-06: «Incrementos de peso» opens its screen', async () => {
    const { onIncrements } = await renderScreen();

    await userEvent.press(screen.getByRole('button', { name: text.rows.increments }));

    expect(onIncrements).toHaveBeenCalled();
  });

  it('error: a failed read offers to retry', async () => {
    await renderScreen(null);

    expect(screen.getByRole('button', { name: text.readError.retry })).toBeOnTheScreen();
    expect(within(screen.getByTestId('sync-status')).getByText(text.sync.guest)).toBeOnTheScreen();
  });
});
