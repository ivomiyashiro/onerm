import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { ConfirmSignOut, PrepareSignOut } from '@/domain/usecases/sign-out';

function setup() {
  const gateway = new FakeAuthGateway(undefined, 'u1');
  const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
  return {
    gateway,
    account,
    prepare: new PrepareSignOut(account),
    confirm: new ConfirmSignOut(gateway, account),
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
