import type { AccountState } from '@/domain/models/account';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

/**
 * At app start: whose data this is and whether the session is still there (RF-AUTH-06.AC1). It
 * reads the local database and the stored session only, so it works without a connection.
 */
export class ReadAccount {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'storedSession'>,
    private readonly account: Pick<AccountRepository, 'readOwner' | 'readOwnerEmail'>,
  ) {}

  async execute(): Promise<AccountState> {
    const owner = await this.account.readOwner();
    if (owner.kind === 'guest') return { kind: 'guest' };
    const stored = await this.gateway.storedSession();
    // No session, or the session of someone else: the data stays, the person has to come back in.
    const alive = stored !== null && stored.userId === owner.userId;
    return {
      kind: 'user',
      userId: owner.userId,
      // Without a live session the kept email says which account can come back (RN-AUTH-07).
      email: (alive ? stored.email : null) ?? (await this.account.readOwnerEmail()),
      sessionExpired: !alive,
    };
  }
}
