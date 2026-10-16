import type { GuestSummary, GuestUnion } from '@/domain/repositories/guest-union';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import {
  CancelGuestUnion,
  FinishGuestUnion,
  ReadPendingUnion,
  StartGuestUnion,
} from '@/domain/usecases/guest-union';

function fakeUnion(summary: GuestSummary, accountHasData: boolean | 'offline' = false) {
  const united: { userId: string; email: string | null; keepGuestData: boolean }[] = [];
  const union: GuestUnion = {
    guestSummary: async () => summary,
    accountHasData: async () => accountHasData,
    unite: async (input) => {
      united.push(input);
      return 'done';
    },
  };
  return { union, united };
}

const ANA = { userId: 'u1', email: 'ana@mail.com' };
const NOTHING: GuestSummary = { workouts: 0, routines: 0, workoutInProgress: false };
const SOME: GuestSummary = { workouts: 3, routines: 1, workoutInProgress: false };

describe('StartGuestUnion (07 §4.3)', () => {
  it('AC5: a guest without data is united without asking', async () => {
    const { union, united } = fakeUnion(NOTHING, true);

    await expect(new StartGuestUnion(union).execute(ANA)).resolves.toEqual({ kind: 'united' });
    expect(united).toEqual([{ ...ANA, keepGuestData: true }]);
  });

  it('AC7: an account without data takes the guest data without asking', async () => {
    const { union, united } = fakeUnion(SOME, false);

    await expect(new StartGuestUnion(union).execute(ANA)).resolves.toEqual({ kind: 'united' });
    expect(united).toEqual([{ ...ANA, keepGuestData: true }]);
  });

  it('AC2: both with data, it asks with the guest counts (D01)', async () => {
    const { union, united } = fakeUnion(SOME, true);

    await expect(new StartGuestUnion(union).execute(ANA)).resolves.toEqual({
      kind: 'ask',
      summary: SOME,
    });
    expect(united).toEqual([]);
  });

  it('without connection it waits: the device stays the guest’s', async () => {
    const { union, united } = fakeUnion(SOME, 'offline');

    await expect(new StartGuestUnion(union).execute(ANA)).resolves.toEqual({ kind: 'offline' });
    expect(united).toEqual([]);
  });
});

describe('FinishGuestUnion (RF-AUTH-05.AC3, AC4)', () => {
  it('«Sumar» keeps the guest data; «Descartar» does not', async () => {
    const { union, united } = fakeUnion(SOME, true);
    const finish = new FinishGuestUnion(union);

    await finish.execute({ ...ANA, choice: 'merge' });
    await finish.execute({ ...ANA, choice: 'discard' });

    expect(united.map((u) => u.keepGuestData)).toEqual([true, false]);
  });
});

describe('CancelGuestUnion (RF-AUTH-05.AC9)', () => {
  it('closes the session and the device stays the guest’s, with nothing waiting', async () => {
    const gateway = new FakeAuthGateway();
    const account = new InMemoryAccountRepository();
    account.pendingMigration = 'u1';

    await new CancelGuestUnion(gateway, account).execute();

    expect(gateway.signedOut).toBe(1);
    expect(account.pendingMigration).toBeNull();
    expect(account.owner).toEqual({ kind: 'guest' });
  });
});

describe('ReadPendingUnion (RF-AUTH-05.AC10)', () => {
  it('a union left halfway resumes with the stored session', async () => {
    const account = new InMemoryAccountRepository();
    account.pendingMigration = 'u1';
    const gateway = new FakeAuthGateway(undefined, { userId: 'u1', email: 'ana@mail.com' });

    await expect(new ReadPendingUnion(gateway, account).execute()).resolves.toEqual(ANA);
  });

  it('without that session there is nothing to resume, and the wait is dropped', async () => {
    const account = new InMemoryAccountRepository();
    account.pendingMigration = 'u1';
    const gateway = new FakeAuthGateway();

    await expect(new ReadPendingUnion(gateway, account).execute()).resolves.toBeNull();
    expect(account.pendingMigration).toBeNull();
  });
});
