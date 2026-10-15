import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { SignIn } from '@/domain/usecases/sign-in';

function setup() {
  const gateway = new FakeAuthGateway();
  const account = new InMemoryAccountRepository();
  return { gateway, account, signIn: new SignIn(gateway, account) };
}

const credentials = { email: 'ana@mail.com', password: 'x' };

describe('SignIn (RF-AUTH-03)', () => {
  it('AC1: signs in and the device belongs to the account', async () => {
    const { signIn, account } = setup();

    await expect(signIn.execute(credentials)).resolves.toEqual({ status: 'done', userId: 'u1' });

    expect(account.owner).toEqual({ kind: 'user', userId: 'u1' });
  });

  it('does not send an email without domain nor an empty password', async () => {
    const { signIn, gateway } = setup();

    await expect(signIn.execute({ email: 'ana@mail', password: '' })).resolves.toEqual({
      status: 'invalid',
      email: 'missingDomain',
      passwordMissing: true,
    });
    expect(gateway.requests).toEqual([]);
  });

  it('AC2: wrong credentials, without saying which one failed', async () => {
    const { signIn, gateway, account } = setup();
    gateway.outcome = { status: 'wrongCredentials' };

    await expect(signIn.execute(credentials)).resolves.toEqual({ status: 'wrongCredentials' });

    expect(account.owner).toEqual({ kind: 'guest' });
  });

  it('AC3: without a connection the person keeps using the app as a guest', async () => {
    const { signIn, gateway, account } = setup();
    gateway.outcome = { status: 'offline' };

    await expect(signIn.execute(credentials)).resolves.toEqual({ status: 'offline' });

    expect(account.owner).toEqual({ kind: 'guest' });
  });

  it('AC5 (RN-AUTH-07): another account is refused and its session is closed', async () => {
    const { signIn, gateway, account } = setup();
    account.owner = { kind: 'user', userId: 'a' };
    gateway.outcome = { status: 'signedIn', userId: 'b' };

    await expect(signIn.execute(credentials)).resolves.toEqual({ status: 'otherAccount' });

    expect(gateway.signedOut).toBe(1);
    expect(account.owner).toEqual({ kind: 'user', userId: 'a' });
  });

  it('AC4 of RF-AUTH-06 (RN-AUTH-07): the same account can come back in', async () => {
    const { signIn, gateway, account } = setup();
    account.owner = { kind: 'user', userId: 'u1' };

    await expect(signIn.execute(credentials)).resolves.toEqual({ status: 'done', userId: 'u1' });

    expect(gateway.signedOut).toBe(0);
  });
});
