import { passwordProblem, type PasswordProblem } from '@/domain/rules/auth/credentials';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

export type CompletePasswordRecoveryResult =
  | { status: 'invalid'; password: PasswordProblem }
  | { status: 'done'; userId: string }
  | { status: 'offline' }
  | { status: 'failed' };

/** RF-AUTH-08.AC2: sets the new password; the person is then signed in to the account. */
export class CompletePasswordRecovery {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'setNewPassword' | 'signOut'>,
    private readonly account: Pick<AccountRepository, 'saveOwner'>,
  ) {}

  async execute(input: { password: string }): Promise<CompletePasswordRecoveryResult> {
    const problem = passwordProblem(input.password);
    if (problem !== null) return { status: 'invalid', password: problem };

    const outcome = await this.gateway.setNewPassword(input.password);
    if (outcome.status !== 'done') return outcome;

    await this.account.saveOwner({ kind: 'user', userId: outcome.userId });
    return outcome;
  }

  /** The person left without saving: the recovery session must not stay open on the device. */
  async cancel(): Promise<void> {
    await this.gateway.signOut();
  }
}
