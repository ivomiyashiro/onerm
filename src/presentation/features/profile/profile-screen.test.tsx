import { render, screen, userEvent, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine } from '@/domain/testing/builders';
import {
  FakeAuthGateway,
  FakeDevicePermissions,
  InMemoryAccountRepository,
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
} from '@/domain/testing/in-memory-repositories';
import type { SyncResult } from '@/domain/repositories/sync-engine';
import type { LocalSyncState } from '@/domain/repositories/sync-state-repository';
import { SyncNow } from '@/domain/usecases/sync-now';
import type { SyncActivity } from '@/domain/usecases/sync-scheduler';
import { BackUpBeforeSignOut, ConfirmSignOut, PrepareSignOut } from '@/domain/usecases/sign-out';
import { AdjustActiveRoutine } from '@/domain/usecases/adjust-active-routine';
import { ObserveProfile } from '@/domain/usecases/observe-profile';
import { UpdateProfile } from '@/domain/usecases/update-profile';
import { ProfileScreen } from '@/presentation/features/profile/profile-screen';
import { dialogs } from '@/presentation/strings/dialogs';
import { onboarding } from '@/presentation/strings/onboarding';
import { profile as text } from '@/presentation/strings/profile';
import type { AccountState } from '@/domain/models/account';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import {
  restUseCasesOver,
  someUseCases,
  syncStatusOver,
  idleSync,
} from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

async function renderScreen(
  profile: Profile | null = defaultProfile(),
  permissions = new FakeDevicePermissions(),
  accountState: AccountState = { kind: 'guest' },
  /** The backup before signing out; by default it can't reach the server. */
  syncNow: () => Promise<SyncResult> = async () => 'failed',
  /** The backup status; by default nothing pending and never synced. */
  backup: { local?: LocalSyncState; activity?: SyncActivity } = {},
) {
  const store = createAppStore();
  store.getState().setAccount(accountState);
  const account = new InMemoryAccountRepository(
    accountState.kind === 'user' ? { kind: 'user', userId: accountState.userId } : undefined,
  );
  const profiles = new InMemoryProfileRepository(profile);
  const routines = new InMemoryRoutineRepository([aRoutine()]);
  const useCases = someUseCases({
    ...restUseCasesOver({ permissions }),
    prepareSignOut: new PrepareSignOut(account),
    backUpBeforeSignOut: new BackUpBeforeSignOut({ syncNow }, account),
    observeSyncStatus: syncStatusOver(
      backup.local ?? {
        owner: 'guest',
        pending: 0,
        conflicts: 0,
        lastSyncedAt: null,
        restoreCompleted: true,
      },
      {
        observeActivity: (listener) => {
          listener(
            backup.activity ?? { running: false, lastResult: null, online: true, restoring: null },
          );
          return () => {};
        },
      },
    ),
    syncNow: new SyncNow({ syncNow }),
    confirmSignOut: new ConfirmSignOut(new FakeAuthGateway(), account, idleSync),
    observeProfile: new ObserveProfile(profiles),
    updateProfile: new UpdateProfile(profiles, routines),
    adjustActiveRoutine: new AdjustActiveRoutine(profiles, routines),
  });
  const callbacks = {
    onSignUp: jest.fn(),
    onSignIn: jest.fn(),
    onAbout: jest.fn(),
    onGoToWorkout: jest.fn(),
    onIncrements: jest.fn(),
    onSeeRejectedChanges: jest.fn(),
  };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AppStoreProvider store={store}>
        <UseCasesProvider useCases={useCases}>
          <ProfileScreen {...callbacks} />
        </UseCasesProvider>
      </AppStoreProvider>
    </SafeAreaProvider>,
  );
  return { profiles, account, store, ...callbacks };
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

  describe('account (RF-AUTH-01.AC4, RF-AUTH-07)', () => {
    const USER: AccountState = {
      kind: 'user',
      userId: 'u1',
      email: 'ana@mail.com',
      sessionExpired: false,
    };

    it('guest: says the data is only on this phone and offers to create an account', async () => {
      const { onSignUp } = await renderScreen();

      expect(screen.getByText(text.sync.guest)).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: text.rows.signOut })).not.toBeOnTheScreen();
      await userEvent.press(screen.getAllByRole('button', { name: text.sync.createAccount })[0]);
      expect(onSignUp).toHaveBeenCalledTimes(1);
    });

    it('RF-AUTH-06.AC4: expired session: says so and «Volver a entrar» opens S02 with the email', async () => {
      const { onSignIn } = await renderScreen(defaultProfile(), undefined, {
        ...USER,
        sessionExpired: true,
      });

      expect(screen.getByText(text.sync.sessionExpired)).toBeOnTheScreen();
      await userEvent.press(screen.getByRole('button', { name: text.sync.signInAgain }));
      expect(onSignIn).toHaveBeenCalledWith('ana@mail.com');
    });

    it("user: shows the email and «Cerrar sesión», not the guest's invitation", async () => {
      await renderScreen(defaultProfile(), undefined, USER);

      expect(screen.getByText('ana@mail.com')).toBeOnTheScreen();
      expect(screen.queryByText(text.sync.guest)).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: text.rows.signOut })).toBeOnTheScreen();
    });

    it('RF-SYNC-06.AC1: backed up, with how long ago', async () => {
      await renderScreen(defaultProfile(), undefined, USER, undefined, {
        local: {
          owner: 'guest',
          pending: 0,
          conflicts: 0,
          lastSyncedAt: new Date(Date.now() - 2 * 60_000),
          restoreCompleted: true,
        },
      });

      expect(screen.getByText(text.sync.synced(text.sync.minutes(2)))).toBeOnTheScreen();
    });

    it('RF-SYNC-06.AC5: after a network error «Reintentar» syncs right away', async () => {
      let asked = 0;
      await renderScreen(
        defaultProfile(),
        undefined,
        USER,
        async () => {
          asked++;
          return 'synced';
        },
        {
          local: {
            owner: 'guest',
            pending: 1,
            conflicts: 0,
            lastSyncedAt: null,
            restoreCompleted: true,
          },
          activity: { running: false, lastResult: 'failed', online: true, restoring: null },
        },
      );

      expect(screen.getByText(text.sync.networkError)).toBeOnTheScreen();
      await userEvent.press(screen.getByRole('button', { name: text.sync.retry }));
      expect(asked).toBe(1);
    });

    it('RF-SYNC-07.AC1: «Respaldar ahora» syncs right away, backed up or with changes waiting', async () => {
      let asked = 0;
      const syncNow = async () => {
        asked++;
        return 'synced' as const;
      };
      await renderScreen(defaultProfile(), undefined, USER, syncNow, {
        local: {
          owner: 'user',
          pending: 2,
          conflicts: 0,
          lastSyncedAt: null,
          restoreCompleted: true,
        },
      });

      expect(screen.getByText(text.sync.pendingOnline(2))).toBeOnTheScreen();
      await userEvent.press(screen.getByRole('button', { name: text.sync.backUpNow }));

      expect(asked).toBe(1);
    });

    it('RF-SYNC-07.AC1: also when everything is backed up', async () => {
      await renderScreen(defaultProfile(), undefined, USER, undefined, {
        local: {
          owner: 'user',
          pending: 0,
          conflicts: 0,
          lastSyncedAt: new Date(),
          restoreCompleted: true,
        },
      });

      expect(screen.getByRole('button', { name: text.sync.backUpNow })).toBeOnTheScreen();
    });

    it('RF-SYNC-07.AC2: without connection it isn’t offered; the changes go up when it comes back', async () => {
      await renderScreen(defaultProfile(), undefined, USER, undefined, {
        local: {
          owner: 'user',
          pending: 2,
          conflicts: 0,
          lastSyncedAt: null,
          restoreCompleted: true,
        },
        activity: { running: false, lastResult: null, online: false, restoring: null },
      });

      expect(screen.getByText(text.sync.pendingOffline(2))).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: text.sync.backUpNow })).not.toBeOnTheScreen();
    });

    it('RN-SYNC-11: the rejected changes are counted apart', async () => {
      await renderScreen(defaultProfile(), undefined, USER, undefined, {
        local: {
          owner: 'guest',
          pending: 3,
          conflicts: 2,
          lastSyncedAt: null,
          restoreCompleted: true,
        },
      });

      expect(screen.getByText(text.sync.conflict(2))).toBeOnTheScreen();
    });

    it('RF-SYNC-06.AC4: «Ver» opens the rejected changes', async () => {
      const { onSeeRejectedChanges } = await renderScreen(
        defaultProfile(),
        undefined,
        USER,
        undefined,
        {
          local: {
            owner: 'guest',
            pending: 0,
            conflicts: 1,
            lastSyncedAt: null,
            restoreCompleted: true,
          },
        },
      );

      await userEvent.press(screen.getByRole('button', { name: text.sync.see }));

      expect(onSeeRejectedChanges).toHaveBeenCalledTimes(1);
    });

    it("AC1: signing out with nothing pending leaves the device as a guest's", async () => {
      const { store } = await renderScreen(defaultProfile(), undefined, USER);

      await userEvent.press(screen.getByRole('button', { name: text.rows.signOut }));

      expect(store.getState().account).toEqual({ kind: 'guest' });
    });

    it('AC2: while the pending changes go up the button says so and is busy', async () => {
      const backingUp = () => new Promise<SyncResult>(() => {});
      const { account } = await renderScreen(defaultProfile(), undefined, USER, backingUp);
      account.pendingChanges = 2;

      await userEvent.press(screen.getByRole('button', { name: text.rows.signOut }));

      expect(
        await screen.findByRole('button', { name: text.rows.signingOutBackingUp, busy: true }),
      ).toBeOnTheScreen();
    });

    it('AC3: changes the backup could not upload show D03 with «Cancelar» first and the destructive action', async () => {
      const { account, store } = await renderScreen(defaultProfile(), undefined, USER);
      account.pendingChanges = 2;

      await userEvent.press(screen.getByRole('button', { name: text.rows.signOut }));

      expect(await screen.findByText(dialogs.D03.title(2))).toBeOnTheScreen();
      expect(store.getState().account).toMatchObject({ kind: 'user' });
      await userEvent.press(screen.getByRole('button', { name: dialogs.D03.signOutDestructive }));
      expect(store.getState().account).toEqual({ kind: 'guest' });
    });

    it('AC4: a workout in progress shows D14 and goes to the workout', async () => {
      const { account, onGoToWorkout } = await renderScreen(defaultProfile(), undefined, USER);
      account.workoutInProgress = true;

      await userEvent.press(screen.getByRole('button', { name: text.rows.signOut }));

      expect(await screen.findByText(dialogs.D14.title)).toBeOnTheScreen();
      await userEvent.press(screen.getByRole('button', { name: dialogs.D14.goToWorkout }));
      expect(onGoToWorkout).toHaveBeenCalledTimes(1);
    });
  });
});
