import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { EnterAccount } from '@/domain/usecases/enter-account';

function setup(owner: 'guest' | string = 'guest') {
  const gateway = new FakeAuthGateway();
  const account = new InMemoryAccountRepository(
    owner === 'guest' ? { kind: 'guest' } : { kind: 'user', userId: owner },
  );
  return { gateway, account, enter: new EnterAccount(gateway, account) };
}

const ANA = { userId: 'u1', email: 'ana@mail.com' };

describe('EnterAccount (07 §4.3, RN-AUTH-07)', () => {
  it("07 §4.3 step 0: a guest device waits for the union; the data stays the guest's", async () => {
    const { enter, account } = setup();

    await expect(enter.execute(ANA)).resolves.toEqual({ status: 'pendingMerge' });

    expect(account.pendingMigration).toBe('u1');
    expect(account.owner).toEqual({ kind: 'guest' });
  });

  it("RF-SYNC-03: a device without a profile or a guest's data becomes the account's, to restore it (07 §4.3 steps 3 → 6)", async () => {
    const { enter, account } = setup();
    account.emptyDevice = true;

    await expect(enter.execute(ANA)).resolves.toEqual({ status: 'entered' });

    expect(account.owner).toEqual({ kind: 'user', userId: 'u1' });
    expect(account.ownerEmail).toBe('ana@mail.com');
    expect(account.pendingMigration).toBeNull();
  });

  it('the account whose data is here comes back in, and its email is kept (RN-AUTH-07)', async () => {
    const { enter, account, gateway } = setup('u1');

    await expect(enter.execute(ANA)).resolves.toEqual({ status: 'entered' });

    expect(account.ownerEmail).toBe('ana@mail.com');
    expect(account.owner).toEqual({ kind: 'user', userId: 'u1' });
    expect(gateway.signedOut).toBe(0);
  });

  it('RN-AUTH-07: another account is refused and its session closed', async () => {
    const { enter, account, gateway } = setup('someone-else');

    await expect(enter.execute(ANA)).resolves.toEqual({ status: 'otherAccount' });

    expect(gateway.signedOut).toBe(1);
    expect(account.owner).toEqual({ kind: 'user', userId: 'someone-else' });
    expect(account.ownerEmail).toBeNull();
  });
});
