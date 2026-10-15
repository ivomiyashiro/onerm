import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

/**
 * RF-AUTH-06.AC4: tells when the server revokes or refuses to renew the session of the account
 * whose data is on the device. The data and the pending changes stay (RN-AUTH-07).
 */
export class ObserveSessionLoss {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'onSessionLost'>,
    private readonly account: Pick<AccountRepository, 'readOwner'>,
  ) {}

  execute(listener: () => void): () => void {
    let active = true;
    const stop = this.gateway.onSessionLost(() => {
      this.account.readOwner().then(
        (owner) => {
          if (active && owner.kind === 'user') listener();
        },
        // If the owner can't be read, nothing is told: the next start reads the stored session.
        () => undefined,
      );
    });
    return () => {
      active = false;
      stop();
    };
  }
}
