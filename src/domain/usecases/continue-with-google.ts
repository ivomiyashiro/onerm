import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

export type ContinueWithGoogleResult =
  | { status: 'done'; userId: string; email: string }
  | { status: 'cancelled' }
  | { status: 'useYourPassword' }
  /** RN-AUTH-07: the device has the data of another account. */
  | { status: 'otherAccount' }
  | { status: 'offline' }
  | { status: 'failed' };

/** RF-AUTH-04: signs in (or creates the account) with Google; the device then belongs to it. */
export class ContinueWithGoogle {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'signInWithGoogle' | 'signOut'>,
    private readonly account: Pick<AccountRepository, 'readOwner' | 'saveOwner'>,
  ) {}

  async execute(): Promise<ContinueWithGoogleResult> {
    const outcome = await this.gateway.signInWithGoogle();
    if (outcome.status !== 'signedIn') return outcome;

    // RN-AUTH-07, as in SignIn: only the account whose data is here can come back, so the
    // session just opened is closed before anything can be uploaded to the other account.
    const owner = await this.account.readOwner();
    if (owner.kind === 'user' && owner.userId !== outcome.userId) {
      await this.gateway.signOut();
      return { status: 'otherAccount' };
    }

    await this.account.saveOwner({ kind: 'user', userId: outcome.userId });
    return { status: 'done', userId: outcome.userId, email: outcome.email };
  }
}
