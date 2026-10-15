import { passwordProblem, type PasswordProblem } from '@/domain/rules/auth/credentials';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';
import { EnterAccount } from '@/domain/usecases/enter-account';

export type CompletePasswordRecoveryResult =
  | { status: 'invalid'; password: PasswordProblem }
  /** `pendingMerge`: a guest device, whose data waits for the union (07 §4.3). */
  | { status: 'done'; userId: string; pendingMerge: boolean }
  /** RN-AUTH-07: the device has the data of another account. */
  | { status: 'otherAccount' }
  | { status: 'offline' }
  | { status: 'failed' };

/** RF-AUTH-08.AC2: sets the new password; the person is then signed in to the account. */
export class CompletePasswordRecovery {
  private readonly enter: EnterAccount;

  constructor(
    private readonly gateway: Pick<AuthGateway, 'setNewPassword' | 'signOut'>,
    account: Pick<AccountRepository, 'readOwner' | 'savePendingMigration' | 'saveOwnerEmail'>,
  ) {
    this.enter = new EnterAccount(gateway, account);
  }

  async execute(input: { password: string }): Promise<CompletePasswordRecoveryResult> {
    const problem = passwordProblem(input.password);
    if (problem !== null) return { status: 'invalid', password: problem };

    const outcome = await this.gateway.setNewPassword(input.password);
    if (outcome.status !== 'done') return outcome;

    const entry = await this.enter.execute({ userId: outcome.userId, email: outcome.email });
    if (entry.status === 'otherAccount') return entry;
    return {
      status: 'done',
      userId: outcome.userId,
      pendingMerge: entry.status === 'pendingMerge',
    };
  }

  /** The person left without saving: the recovery session must not stay open on the device. */
  async cancel(): Promise<void> {
    await this.gateway.signOut();
  }
}
