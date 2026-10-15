import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { SignUp } from '@/domain/usecases/sign-up';

function setup() {
  const gateway = new FakeAuthGateway();
  const account = new InMemoryAccountRepository();
  return { gateway, account, signUp: new SignUp(gateway, account) };
}

const valid = { email: ' ana@mail.com ', password: 'contraseña-larga' };

describe('SignUp (RF-AUTH-02)', () => {
  it("AC1: creates the account; the guest's data waits for the union (07 §4.3)", async () => {
    const { signUp, gateway, account } = setup();

    await expect(signUp.execute(valid)).resolves.toEqual({
      status: 'done',
      userId: 'u1',
      pendingMerge: true,
    });

    expect(account.pendingMigration).toBe('u1');
    expect(account.owner).toEqual({ kind: 'guest' });
    expect(gateway.requests).toEqual([
      { kind: 'signUp', email: 'ana@mail.com', password: 'contraseña-larga' },
    ]);
  });

  it('AC2: an invalid email or password is not sent, and says which field is wrong', async () => {
    const { signUp, gateway } = setup();

    await expect(signUp.execute({ email: 'ana@mail', password: '123' })).resolves.toEqual({
      status: 'invalid',
      email: 'missingDomain',
      password: 'tooShort',
    });
    expect(gateway.requests).toEqual([]);
  });

  it.each([
    ['AC3', { status: 'emailTaken' }],
    ['AC5', { status: 'useGoogle' }],
    ['AC4', { status: 'offline' }],
  ] as const)(
    '%s: passes the answer through and the device keeps its owner',
    async (_ac, outcome) => {
      const { signUp, gateway, account } = setup();
      gateway.outcome = outcome;

      await expect(signUp.execute(valid)).resolves.toEqual(outcome);

      expect(account.owner).toEqual({ kind: 'guest' });
    },
  );

  it('RN-AUTH-07: a device with the data of an account cannot create another one', async () => {
    const { signUp, gateway, account } = setup();
    account.owner = { kind: 'user', userId: 'a' };

    await expect(signUp.execute(valid)).resolves.toEqual({ status: 'otherAccount' });

    expect(gateway.requests).toEqual([]);
  });
});
