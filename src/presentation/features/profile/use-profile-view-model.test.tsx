import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine } from '@/domain/testing/builders';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
} from '@/domain/testing/in-memory-repositories';
import type { SyncResult } from '@/domain/repositories/sync-engine';
import { BackUpBeforeSignOut, ConfirmSignOut, PrepareSignOut } from '@/domain/usecases/sign-out';
import { AdjustActiveRoutine } from '@/domain/usecases/adjust-active-routine';
import { ObserveProfile } from '@/domain/usecases/observe-profile';
import { UpdateProfile } from '@/domain/usecases/update-profile';
import { useProfileViewModel } from '@/presentation/features/profile/use-profile-view-model';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const WITH_ROUTINE: Profile = { ...defaultProfile(), activeRoutineId: 'routine-1' };

async function renderViewModel(profile: Profile | null = WITH_ROUTINE) {
  const profiles = new InMemoryProfileRepository(profile);
  const routines = new InMemoryRoutineRepository([aRoutine()]);
  const store = createAppStore();
  const gateway = new FakeAuthGateway();
  const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
  // The backup: what it leaves pending (by default, everything), and a gate the test can hold.
  const backup = { leftPending: null as number | null, gate: Promise.resolve() };
  const sync = {
    syncNow: async (): Promise<SyncResult> => {
      await backup.gate;
      if (backup.leftPending !== null) account.pendingChanges = backup.leftPending;
      return 'synced';
    },
  };
  store.getState().setAccount({
    kind: 'user',
    userId: 'u1',
    email: 'ana@mail.com',
    sessionExpired: false,
  });
  const useCases = someUseCases({
    prepareSignOut: new PrepareSignOut(account),
    backUpBeforeSignOut: new BackUpBeforeSignOut(sync, account),
    confirmSignOut: new ConfirmSignOut(gateway, account),
    observeProfile: new ObserveProfile(profiles),
    updateProfile: new UpdateProfile(profiles, routines),
    adjustActiveRoutine: new AdjustActiveRoutine(profiles, routines),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProvider store={store}>
      <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
    </AppStoreProvider>
  );
  const hook = await renderHook(() => useProfileViewModel(), { wrapper });
  return { ...hook, profiles, routines, store, account, gateway, backup };
}

describe('useProfileViewModel', () => {
  it('is loading until the profile arrives', async () => {
    const { result } = await renderHook(() => useProfileViewModel(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AppStoreProvider store={createAppStore()}>
          <UseCasesProvider useCases={someUseCases()}>{children}</UseCasesProvider>
        </AppStoreProvider>
      ),
    });

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('content: the stored profile', async () => {
    const { result } = await renderViewModel();

    expect(result.current.state).toEqual({ status: 'content', profile: WITH_ROUTINE });
  });

  it('a sheet opens with the current value and «Guardar» saves the chosen one', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => result.current.actions.open('days'));
    expect(result.current.sheet).toEqual({ setting: 'days', draft: { daysPerWeek: 3 } });

    await act(() => result.current.actions.choose({ daysPerWeek: 5 }));
    await act(() => result.current.actions.save());

    expect(profiles.profile?.daysPerWeek).toBe(5);
    expect(result.current.sheet).toBeNull();
    expect(result.current.dialog).toBeNull();
  });

  it('RF-PERF-03.AC2: a new goal with an active routine asks with D06; «Ajustar» adjusts it', async () => {
    const { result, routines } = await renderViewModel();

    await act(() => result.current.actions.open('goal'));
    await act(() => result.current.actions.choose({ goal: 'strength' }));
    await act(() => result.current.actions.save());
    expect(result.current.dialog).toEqual({ kind: 'adjust', goal: 'strength' });

    await act(() => result.current.actions.adjust());

    expect(routines.routines[0].days[0].exercises[0].prescription.repRange).toEqual({
      min: 4,
      max: 6,
    });
    expect(result.current.dialog).toBeNull();
  });

  it('RN-PERF-03: a new level asks with D06 too', async () => {
    const { result } = await renderViewModel();

    await act(() => result.current.actions.open('level'));
    await act(() => result.current.actions.choose({ level: 'advanced' }));
    await act(() => result.current.actions.save());

    expect(result.current.dialog).toEqual({ kind: 'adjust', level: 'advanced' });
  });

  it('RF-PERF-03.AC2: «Dejar como está» leaves the routine as it was', async () => {
    const { result, routines } = await renderViewModel();
    const before = routines.routines[0];

    await act(() => result.current.actions.open('goal'));
    await act(() => result.current.actions.choose({ goal: 'strength' }));
    await act(() => result.current.actions.save());
    await act(() => result.current.actions.keep());

    expect(routines.routines[0]).toBe(before);
    expect(result.current.dialog).toBeNull();
  });

  it('closing a sheet saves nothing', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => result.current.actions.open('unit'));
    await act(() => result.current.actions.choose({ unit: 'lb' }));
    await act(() => result.current.actions.close());

    expect(profiles.profile?.unit).toBe('kg');
  });

  it('error: a failed read, and retry reads again', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => profiles.fail());
    expect(result.current.state).toEqual({ status: 'error' });

    await act(() => result.current.actions.retry());
    expect(result.current.state.status).toBe('content');
  });

  describe('sign out (RF-AUTH-07)', () => {
    it("AC1: with nothing pending it signs out at once and the device is a guest's again", async () => {
      const { result, store, account, gateway } = await renderViewModel();

      await act(() => result.current.actions.signOut());

      expect(result.current.signOutDialog).toBeNull();
      expect(store.getState().account).toEqual({ kind: 'guest' });
      expect(account.cleared).toBe(1);
      expect(gateway.signedOut).toBe(1);
    });

    it('AC2: with pending changes it backs up first, and signs out once all is up', async () => {
      const { result, store, account, backup } = await renderViewModel();
      account.pendingChanges = 3;
      let open!: () => void;
      backup.gate = new Promise((resolve) => (open = resolve));
      backup.leftPending = 0;

      let signingOut!: Promise<void>;
      await act(async () => {
        signingOut = result.current.actions.signOut();
      });
      expect(result.current.backingUp).toBe(true);
      expect(account.cleared).toBe(0);

      await act(async () => {
        open();
        await signingOut;
      });
      expect(result.current.backingUp).toBe(false);
      expect(result.current.signOutDialog).toBeNull();
      expect(store.getState().account).toEqual({ kind: 'guest' });
    });

    /** Signs out with 3 pending changes and a backup that leaves them all. */
    async function signOutWithChangesLeft() {
      const rendered = await renderViewModel();
      rendered.account.pendingChanges = 3;
      await act(() => rendered.result.current.actions.signOut());
      return rendered;
    }

    it('AC3: with changes left after the backup it asks first (D03) and nothing is signed out yet', async () => {
      const { result, store, account } = await signOutWithChangesLeft();

      expect(result.current.backingUp).toBe(false);
      expect(result.current.signOutDialog).toEqual({ kind: 'pending', count: 3 });
      expect(store.getState().account).toMatchObject({ kind: 'user' });
      expect(account.cleared).toBe(0);
    });

    it('AC3: «Cerrar sesión igual» signs out and «Cancelar» keeps everything', async () => {
      const { result, store, account } = await signOutWithChangesLeft();

      await act(async () => result.current.actions.closeSignOutDialog());
      expect(result.current.signOutDialog).toBeNull();
      expect(account.cleared).toBe(0);

      await act(() => result.current.actions.confirmSignOut());
      expect(store.getState().account).toEqual({ kind: 'guest' });
      expect(account.cleared).toBe(1);
    });

    it('AC4: a workout in progress asks to finish it first (D14)', async () => {
      const { result, account } = await renderViewModel();
      account.workoutInProgress = true;
      account.pendingChanges = 3;

      await act(() => result.current.actions.signOut());

      expect(result.current.signOutDialog).toEqual({ kind: 'workoutInProgress' });
      expect(account.cleared).toBe(0);
    });
  });
});
