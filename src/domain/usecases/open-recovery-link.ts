import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

export type OpenRecoveryLinkResult =
  | { status: 'ready'; email: string | null }
  | { status: 'invalidLink' }
  /** RN-AUTH-07: the device has the data of another account. */
  | { status: 'otherAccount' }
  | { status: 'offline' }
  | { status: 'failed' };

/** RF-AUTH-08.AC2, AC3: opens the recovery link, to set the new password next. */
export class OpenRecoveryLink {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'openRecoveryLink' | 'signOut'>,
    private readonly account: Pick<AccountRepository, 'readOwner'>,
  ) {}

  async execute(input: { url: string }): Promise<OpenRecoveryLinkResult> {
    const outcome = await this.gateway.openRecoveryLink(input.url);
    if (outcome.status !== 'opened') return outcome;

    // RN-AUTH-07, as in SignIn: only the account whose data is here can come back, so the session
    // the link opened is closed before anything can be uploaded to it.
    const owner = await this.account.readOwner();
    if (owner.kind === 'user' && owner.userId !== outcome.userId) {
      await this.gateway.signOut();
      return { status: 'otherAccount' };
    }
    return { status: 'ready', email: outcome.email };
  }
}
