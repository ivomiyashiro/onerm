import { emailProblem, type EmailProblem } from '@/domain/rules/auth/credentials';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

export type SignInResult =
  | { status: 'invalid'; email: EmailProblem | null; passwordMissing: boolean }
  | { status: 'done'; userId: string }
  | { status: 'wrongCredentials' }
  /** RN-AUTH-07: the device has the data of another account. */
  | { status: 'otherAccount' }
  | { status: 'offline' }
  | { status: 'failed' };

/** RF-AUTH-03: signs in; the device then belongs to that account (or keeps belonging to it). */
export class SignIn {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'signIn' | 'signOut'>,
    private readonly account: Pick<AccountRepository, 'readOwner' | 'saveOwner'>,
  ) {}

  async execute(input: { email: string; password: string }): Promise<SignInResult> {
    const email = emailProblem(input.email);
    const passwordMissing = input.password === '';
    if (email !== null || passwordMissing) return { status: 'invalid', email, passwordMissing };

    const outcome = await this.gateway.signIn(input.email.trim(), input.password);
    if (outcome.status === 'emailTaken' || outcome.status === 'useGoogle') {
      return { status: 'failed' };
    }
    if (outcome.status !== 'signedIn') return outcome;

    // RN-AUTH-07: only the account whose data is here can come back. The session just opened is
    // closed, so none of this device's data can ever be uploaded to the other account.
    const owner = await this.account.readOwner();
    if (owner.kind === 'user' && owner.userId !== outcome.userId) {
      await this.gateway.signOut();
      return { status: 'otherAccount' };
    }

    await this.account.saveOwner({ kind: 'user', userId: outcome.userId });
    return { status: 'done', userId: outcome.userId };
  }
}
