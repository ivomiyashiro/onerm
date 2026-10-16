import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';
import { EnterAccount } from '@/domain/usecases/enter-account';

export type ContinueWithGoogleResult =
  /** `pendingMerge`: a guest device, whose data waits for the union (07 §4.3). */
  | { status: 'done'; userId: string; email: string; pendingMerge: boolean }
  | { status: 'cancelled' }
  | { status: 'useYourPassword' }
  /** RN-AUTH-07: the device has the data of another account. */
  | { status: 'otherAccount' }
  | { status: 'offline' }
  | { status: 'failed' };

/** RF-AUTH-04: signs in (or creates the account) with Google; the device then belongs to it. */
export class ContinueWithGoogle {
  private readonly enter: EnterAccount;

  constructor(
    private readonly gateway: Pick<AuthGateway, 'signInWithGoogle' | 'signOut'>,
    account: Pick<
      AccountRepository,
      'readOwner' | 'savePendingMigration' | 'saveOwnerEmail' | 'saveOwner' | 'isEmptyDevice'
    >,
  ) {
    this.enter = new EnterAccount(gateway, account);
  }

  async execute(): Promise<ContinueWithGoogleResult> {
    const outcome = await this.gateway.signInWithGoogle();
    if (outcome.status !== 'signedIn') return outcome;

    const entry = await this.enter.execute({ userId: outcome.userId, email: outcome.email });
    if (entry.status === 'otherAccount') return entry;
    return {
      status: 'done',
      userId: outcome.userId,
      email: outcome.email,
      pendingMerge: entry.status === 'pendingMerge',
    };
  }
}
