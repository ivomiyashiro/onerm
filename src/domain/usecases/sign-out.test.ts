import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import type { SyncResult } from '@/domain/repositories/sync-engine';
import { BackUpBeforeSignOut, ConfirmSignOut, PrepareSignOut } from '@/domain/usecases/sign-out';

function setup() {
  const gateway = new FakeAuthGateway(undefined, { userId: 'u1', email: 'ana@mail.com' });
  const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
  return {
    gateway,
    account,
    prepare: new PrepareSignOut(account),
    confirm: new ConfirmSignOut(gateway, account, { whenIdle: async () => {} }),
  };
}

describe('Sign out (RF-AUTH-07)', () => {
  it('AC1: with nothing pending it is ready, and confirming removes the user data', async () => {
    const { prepare, confirm, gateway, account } = setup();

    await expect(prepare.execute()).resolves.toEqual({ kind: 'ready' });
    await expect(confirm.execute()).resolves.toEqual({ status: 'done' });

    expect(gateway.signedOut).toBe(1);
    expect(account.cleared).toBe(1);
    expect(account.owner).toEqual({ kind: 'guest' });
  });

  it('AC3: pending changes are counted so D03 can warn about them', async () => {
    const { prepare, account } = setup();
    account.pendingChanges = 4;

    await expect(prepare.execute()).resolves.toEqual({ kind: 'pending', count: 4 });
  });

  it('AC4: a workout in progress blocks it (D14), even if there are pending changes', async () => {
    const { prepare, account } = setup();
    account.workoutInProgress = true;
    account.pendingChanges = 4;

    await expect(prepare.execute()).resolves.toEqual({ kind: 'blockedByWorkout' });
  });

  it('does not sign out if a workout started after the plan was made', async () => {
    const { confirm, gateway, account } = setup();
    account.workoutInProgress = true;

    await expect(confirm.execute()).resolves.toEqual({ status: 'blockedByWorkout' });

    expect(gateway.signedOut).toBe(0);
    expect(account.cleared).toBe(0);
  });
});

describe('ConfirmSignOut and a sync in flight (F8 judge, RN-AUTH-07)', () => {
  it('closes the session, waits for the running sync, and only then clears the device', async () => {
    const steps: string[] = [];
    const gateway = new FakeAuthGateway(undefined, { userId: 'u1', email: 'ana@mail.com' });
    const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
    let finishSync: () => void = () => {};
    const sync = {
      whenIdle: () =>
        new Promise<void>((resolve) => {
          steps.push('waiting for the sync');
          finishSync = () => {
            steps.push('sync ended');
            resolve();
          };
        }),
    };
    const clear = account.clearUserData.bind(account);
    account.clearUserData = async () => {
      steps.push('cleared');
      await clear();
    };

    const done = new ConfirmSignOut(gateway, account, sync).execute();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(gateway.signedOut).toBe(1);
    expect(steps).toEqual(['waiting for the sync']);

    finishSync();
    await done;
    expect(steps).toEqual(['waiting for the sync', 'sync ended', 'cleared']);
  });
});

describe('Back up before signing out (RF-AUTH-07.AC2, AC3)', () => {
  function backUpWith(account: InMemoryAccountRepository, result: SyncResult, leftPending: number) {
    return new BackUpBeforeSignOut(
      {
        syncNow: async () => {
          account.pendingChanges = leftPending;
          return result;
        },
      },
      account,
    );
  }

  it('AC2: when the sync uploads everything, it is ready to sign out', async () => {
    const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
    account.pendingChanges = 4;

    await expect(backUpWith(account, 'synced', 0).execute()).resolves.toEqual({ kind: 'ready' });
  });

  it('AC3: when changes are left (no connection, a rejected one), D03 counts them', async () => {
    const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
    account.pendingChanges = 4;

    await expect(backUpWith(account, 'failed', 4).execute()).resolves.toEqual({
      kind: 'pending',
      count: 4,
    });
  });
});
