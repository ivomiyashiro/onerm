import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

export type OpenRecoveryLinkResult =
  /** `alreadyIn`: the device was already signed in to this account, so leaving must not sign out. */
  | { status: 'ready'; email: string | null; alreadyIn: boolean }
  | { status: 'invalidLink' }
  /** RN-AUTH-07: the device has the data of another account. */
  | { status: 'otherAccount' }
  | { status: 'offline' }
  | { status: 'failed' };

/** RF-AUTH-08.AC2, AC3: opens the recovery link, to set the new password next. */
export class OpenRecoveryLink {
  constructor(
    private readonly gateway: Pick<
      AuthGateway,
      'recoveryLinkUser' | 'openRecoveryLink' | 'signOut' | 'storedSession'
    >,
    private readonly account: Pick<AccountRepository, 'readOwner'>,
  ) {}

  async execute(input: { url: string }): Promise<OpenRecoveryLinkResult> {
    // RN-AUTH-07: only the account whose data is here can come back. The link of another one is
    // refused before opening it, so the session already on the device is not touched.
    const owner = await this.account.readOwner();
    const linkUser = this.gateway.recoveryLinkUser(input.url);
    if (owner.kind === 'user' && linkUser !== null && linkUser !== owner.userId) {
      return { status: 'otherAccount' };
    }

    // Opening the link replaces the stored session: whether one of this account was alive decides
    // what leaving without saving does.
    const before = await this.gateway.storedSession();
    const outcome = await this.gateway.openRecoveryLink(input.url);
    if (outcome.status !== 'opened') return outcome;

    // A link whose account couldn't be read before: closed now, as in SignIn.
    if (owner.kind === 'user' && owner.userId !== outcome.userId) {
      await this.gateway.signOut();
      return { status: 'otherAccount' };
    }
    return { status: 'ready', email: outcome.email, alreadyIn: before?.userId === outcome.userId };
  }
}
