import {
  emailProblem,
  passwordProblem,
  type EmailProblem,
  type PasswordProblem,
} from '@/domain/rules/auth/credentials';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

export type SignUpResult =
  /** The form isn't sent (RF-AUTH-02.AC2): each field says what is wrong with it. */
  | { status: 'invalid'; email: EmailProblem | null; password: PasswordProblem | null }
  | { status: 'done'; userId: string }
  | { status: 'emailTaken' }
  | { status: 'useGoogle' }
  | { status: 'otherAccount' }
  | { status: 'offline' }
  | { status: 'failed' };

/**
 * RF-AUTH-02: creates the account and, if it works, the device now belongs to it. The guest's data
 * is united with the account afterwards (RF-AUTH-05).
 */
export class SignUp {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'signUp'>,
    private readonly account: Pick<AccountRepository, 'readOwner' | 'saveOwner'>,
  ) {}

  async execute(input: { email: string; password: string }): Promise<SignUpResult> {
    const email = emailProblem(input.email);
    const password = passwordProblem(input.password);
    if (email !== null || password !== null) return { status: 'invalid', email, password };

    // RN-AUTH-07: the device already has the data of an account, a new one can't take it.
    if ((await this.account.readOwner()).kind === 'user') return { status: 'otherAccount' };

    const outcome = await this.gateway.signUp(input.email.trim(), input.password);
    if (outcome.status === 'wrongCredentials') return { status: 'failed' };
    if (outcome.status !== 'signedIn') return outcome;

    await this.account.saveOwner({ kind: 'user', userId: outcome.userId });
    return { status: 'done', userId: outcome.userId };
  }
}
