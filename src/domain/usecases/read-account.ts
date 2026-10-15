import type { AccountState } from '@/domain/models/account';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

/**
 * At app start: whose data this is and whether the session is still there (RF-AUTH-06.AC1). It
 * reads the local database and the stored session only, so it works without a connection.
 */
export class ReadAccount {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'storedUserId'>,
    private readonly account: Pick<AccountRepository, 'readOwner'>,
  ) {}

  async execute(): Promise<AccountState> {
    const owner = await this.account.readOwner();
    if (owner.kind === 'guest') return { kind: 'guest' };
    const stored = await this.gateway.storedUserId();
    // No session, or the session of someone else: the data stays, the person has to come back in.
    return { kind: 'user', userId: owner.userId, sessionExpired: stored !== owner.userId };
  }
}
