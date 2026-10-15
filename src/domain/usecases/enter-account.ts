import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

export type EnterAccountResult =
  /** The account whose data is on the device is back in. */
  | { status: 'entered' }
  /** A guest device: its data waits for the union with the account (07 §4.3, RF-AUTH-05). */
  | { status: 'pendingMerge' }
  /** RN-AUTH-07: the device has the data of another account. */
  | { status: 'otherAccount' };

/**
 * The single way into an account, once the provider has authenticated the person (sign-up,
 * sign-in, Google, a recovery link). The device only becomes the account's at the end of the
 * union (07 §4.3 step 6), so here a guest device only notes which account it waits for (step 0).
 */
export class EnterAccount {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'signOut'>,
    private readonly account: Pick<
      AccountRepository,
      'readOwner' | 'savePendingMigration' | 'saveOwnerEmail'
    >,
  ) {}

  async execute(input: { userId: string; email: string | null }): Promise<EnterAccountResult> {
    const owner = await this.account.readOwner();
    if (owner.kind === 'guest') {
      await this.account.savePendingMigration(input.userId);
      return { status: 'pendingMerge' };
    }
    // Only the account whose data is here can come back. The session just opened is closed, so
    // none of this device's data can ever be uploaded to the other account.
    if (owner.userId !== input.userId) {
      await this.gateway.signOut();
      return { status: 'otherAccount' };
    }
    if (input.email !== null) await this.account.saveOwnerEmail(input.email);
    return { status: 'entered' };
  }
}
