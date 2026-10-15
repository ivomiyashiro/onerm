import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { ContinueWithGoogle } from '@/domain/usecases/continue-with-google';

function setup(owner: 'guest' | string = 'guest') {
  const gateway = new FakeAuthGateway();
  const account = new InMemoryAccountRepository(
    owner === 'guest' ? { kind: 'guest' } : { kind: 'user', userId: owner },
  );
  return { gateway, account, google: new ContinueWithGoogle(gateway, account) };
}

describe('ContinueWithGoogle (RF-AUTH-04)', () => {
  it('AC1, AC2: signs in and the device now belongs to the account', async () => {
    const { google, account } = setup();

    await expect(google.execute()).resolves.toEqual({
      status: 'done',
      userId: 'u1',
      email: 'ana@gmail.com',
    });

    expect(account.owner).toEqual({ kind: 'user', userId: 'u1' });
  });

  it.each([
    ['AC3', { status: 'useYourPassword' }],
    ['AC4', { status: 'cancelled' }],
    ['AC5', { status: 'offline' }],
    ['error', { status: 'failed' }],
  ] as const)(
    '%s: passes the answer through and the device keeps its owner',
    async (_ac, outcome) => {
      const { google, gateway, account } = setup();
      gateway.googleOutcome = outcome;

      await expect(google.execute()).resolves.toEqual(outcome);

      expect(account.owner).toEqual({ kind: 'guest' });
    },
  );

  it('RN-AUTH-07: another account than the one whose data is here is refused and closed', async () => {
    const { google, gateway, account } = setup('someone-else');

    await expect(google.execute()).resolves.toEqual({ status: 'otherAccount' });

    expect(gateway.signedOut).toBe(1);
    expect(account.owner).toEqual({ kind: 'user', userId: 'someone-else' });
  });

  it('RN-AUTH-07: the same account goes through', async () => {
    const { google, gateway } = setup('u1');

    await expect(google.execute()).resolves.toMatchObject({ status: 'done' });

    expect(gateway.signedOut).toBe(0);
  });
});
