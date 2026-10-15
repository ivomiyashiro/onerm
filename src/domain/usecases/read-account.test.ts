import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { ReadAccount } from '@/domain/usecases/read-account';

describe('ReadAccount (RF-AUTH-06)', () => {
  it('a guest has no session to check', async () => {
    const read = new ReadAccount(new FakeAuthGateway(), new InMemoryAccountRepository());

    await expect(read.execute()).resolves.toEqual({ kind: 'guest' });
  });

  it('AC1: a user with a stored session is signed in, with or without a connection', async () => {
    const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
    const read = new ReadAccount(new FakeAuthGateway(undefined, 'u1'), account);

    await expect(read.execute()).resolves.toEqual({
      kind: 'user',
      userId: 'u1',
      sessionExpired: false,
    });
  });

  it('AC4: a user without a session keeps the data and is told the session expired', async () => {
    const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
    const read = new ReadAccount(new FakeAuthGateway(undefined, null), account);

    await expect(read.execute()).resolves.toEqual({
      kind: 'user',
      userId: 'u1',
      sessionExpired: true,
    });
  });

  it('a stored session of another user counts as expired for this data', async () => {
    const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
    const read = new ReadAccount(new FakeAuthGateway(undefined, 'u2'), account);

    await expect(read.execute()).resolves.toMatchObject({ sessionExpired: true });
  });
});
