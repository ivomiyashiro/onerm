import { emailProblem, type EmailProblem } from '@/domain/rules/auth/credentials';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';
import { EnterAccount } from '@/domain/usecases/enter-account';

export type SignInResult =
  | { status: 'invalid'; email: EmailProblem | null; passwordMissing: boolean }
  /** `pendingMerge`: a guest device, whose data waits for the union (07 §4.3). */
  | { status: 'done'; userId: string; pendingMerge: boolean }
  | { status: 'wrongCredentials' }
  /** RN-AUTH-07: the device has the data of another account. */
  | { status: 'otherAccount' }
  | { status: 'offline' }
  | { status: 'failed' };

/** RF-AUTH-03: signs in; the device then belongs to that account (or keeps belonging to it). */
export class SignIn {
  private readonly enter: EnterAccount;

  constructor(
    private readonly gateway: Pick<AuthGateway, 'signIn' | 'signOut'>,
    account: Pick<AccountRepository, 'readOwner' | 'savePendingMigration' | 'saveOwnerEmail'>,
  ) {
    this.enter = new EnterAccount(gateway, account);
  }

  async execute(input: { email: string; password: string }): Promise<SignInResult> {
    const email = emailProblem(input.email);
    const passwordMissing = input.password === '';
    if (email !== null || passwordMissing) return { status: 'invalid', email, passwordMissing };

    const outcome = await this.gateway.signIn(input.email.trim(), input.password);
    if (outcome.status === 'emailTaken' || outcome.status === 'useGoogle') {
      return { status: 'failed' };
    }
    if (outcome.status !== 'signedIn') return outcome;

    const entry = await this.enter.execute({
      userId: outcome.userId,
      email: input.email.trim(),
    });
    if (entry.status === 'otherAccount') return entry;
    return {
      status: 'done',
      userId: outcome.userId,
      pendingMerge: entry.status === 'pendingMerge',
    };
  }
}
