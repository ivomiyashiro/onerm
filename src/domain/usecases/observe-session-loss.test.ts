import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveSessionLoss } from '@/domain/usecases/observe-session-loss';

describe('ObserveSessionLoss (RF-AUTH-06.AC4)', () => {
  it("is told when the session is lost and the device has a user's data", async () => {
    const gateway = new FakeAuthGateway();
    const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
    const lost = jest.fn();
    new ObserveSessionLoss(gateway, account).execute(lost);

    gateway.loseSession();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(lost).toHaveBeenCalledTimes(1);
  });

  it('a guest has no session to lose: nothing to tell', async () => {
    const gateway = new FakeAuthGateway();
    const lost = jest.fn();
    new ObserveSessionLoss(gateway, new InMemoryAccountRepository()).execute(lost);

    gateway.loseSession();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(lost).not.toHaveBeenCalled();
  });

  it('stops listening when unsubscribed', async () => {
    const gateway = new FakeAuthGateway();
    const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
    const lost = jest.fn();
    const stop = new ObserveSessionLoss(gateway, account).execute(lost);

    stop();
    gateway.loseSession();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(lost).not.toHaveBeenCalled();
  });
});
