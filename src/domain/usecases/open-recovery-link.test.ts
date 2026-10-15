import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { OpenRecoveryLink } from '@/domain/usecases/open-recovery-link';

const LINK = 'onerm://new-password#access_token=a&refresh_token=r&type=recovery';

function setup(owner: 'guest' | string = 'guest') {
  const gateway = new FakeAuthGateway();
  const account = new InMemoryAccountRepository(
    owner === 'guest' ? { kind: 'guest' } : { kind: 'user', userId: owner },
  );
  return { gateway, account, open: new OpenRecoveryLink(gateway, account) };
}

describe('OpenRecoveryLink (RF-AUTH-08.AC2, AC3)', () => {
  it('AC2: a good link leaves the screen ready for the new password', async () => {
    const { open, gateway } = setup();

    await expect(open.execute({ url: LINK })).resolves.toEqual({
      status: 'ready',
      email: 'ana@mail.com',
    });

    expect(gateway.openedLinks).toEqual([LINK]);
    expect(gateway.signedOut).toBe(0);
  });

  it('AC3: an expired or used link is not valid', async () => {
    const { open, gateway } = setup();
    gateway.linkOutcome = { status: 'invalidLink' };

    await expect(open.execute({ url: LINK })).resolves.toEqual({ status: 'invalidLink' });
  });

  it.each(['offline', 'failed'] as const)('passes «%s» through', async (status) => {
    const { open, gateway } = setup();
    gateway.linkOutcome = { status };

    await expect(open.execute({ url: LINK })).resolves.toEqual({ status });
  });

  it('RN-AUTH-07: the link of another account is refused and its session closed', async () => {
    const { open, gateway } = setup('someone-else');

    await expect(open.execute({ url: LINK })).resolves.toEqual({ status: 'otherAccount' });

    expect(gateway.signedOut).toBe(1);
  });

  it('RN-AUTH-07: the link of the account whose data is here goes through', async () => {
    const { open, gateway } = setup('u1');

    await expect(open.execute({ url: LINK })).resolves.toMatchObject({ status: 'ready' });

    expect(gateway.signedOut).toBe(0);
  });
});
