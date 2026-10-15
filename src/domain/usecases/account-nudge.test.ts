import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { AnswerAccountNudge, ReadAccountNudge } from '@/domain/usecases/account-nudge';

const NOW = new Date('2026-10-15T12:00:00Z');

function setup() {
  const account = new InMemoryAccountRepository();
  return {
    account,
    read: new ReadAccountNudge(account, () => NOW),
    answer: new AnswerAccountNudge(account, () => NOW),
  };
}

describe('account nudge (RF-AUTH-01.AC5, AC6, D13)', () => {
  it('AC5: a guest who finished a workout sees it the first time', async () => {
    const { read } = setup();

    await expect(read.execute()).resolves.toBe(true);
  });

  it('AC5: answering it hides it, for at least 7 days', async () => {
    const { read, answer, account } = setup();

    await answer.execute();

    expect(account.lastNudgeAt).toEqual(NOW);
    await expect(read.execute()).resolves.toBe(false);
  });

  it('AC6: it comes back after 7 days', async () => {
    const { read, account } = setup();
    account.lastNudgeAt = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);

    await expect(read.execute()).resolves.toBe(true);
  });

  it('a user already has an account: never offered', async () => {
    const { read, account } = setup();
    account.owner = { kind: 'user', userId: 'u1' };

    await expect(read.execute()).resolves.toBe(false);
  });

  it('never while a workout is in progress', async () => {
    const { read, account } = setup();
    account.workoutInProgress = true;

    await expect(read.execute()).resolves.toBe(false);
  });
});
