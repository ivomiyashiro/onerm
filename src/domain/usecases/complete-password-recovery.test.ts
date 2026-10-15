import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { CompletePasswordRecovery } from '@/domain/usecases/complete-password-recovery';

function setup() {
  const gateway = new FakeAuthGateway();
  const account = new InMemoryAccountRepository();
  return { gateway, account, complete: new CompletePasswordRecovery(gateway, account) };
}

describe('CompletePasswordRecovery (RF-AUTH-08.AC2)', () => {
  it('sets the new password, and the device now belongs to the account', async () => {
    const { complete, gateway, account } = setup();

    await expect(complete.execute({ password: 'contraseña-nueva' })).resolves.toEqual({
      status: 'done',
      userId: 'u1',
    });

    expect(gateway.newPasswords).toEqual(['contraseña-nueva']);
    expect(account.owner).toEqual({ kind: 'user', userId: 'u1' });
  });

  it('RN-AUTH-01: a short password is not sent', async () => {
    const { complete, gateway, account } = setup();

    await expect(complete.execute({ password: '123' })).resolves.toEqual({
      status: 'invalid',
      password: 'tooShort',
    });

    expect(gateway.newPasswords).toEqual([]);
    expect(account.owner).toEqual({ kind: 'guest' });
  });

  it.each(['offline', 'failed'] as const)('«%s» keeps the owner as it was', async (status) => {
    const { complete, gateway, account } = setup();
    gateway.newPasswordOutcome = { status };

    await expect(complete.execute({ password: 'contraseña-nueva' })).resolves.toEqual({ status });

    expect(account.owner).toEqual({ kind: 'guest' });
  });

  it('leaving without saving closes the recovery session', async () => {
    const { complete, gateway } = setup();

    await complete.cancel();

    expect(gateway.signedOut).toBe(1);
  });
});
