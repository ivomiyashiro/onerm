import { emailProblem, type EmailProblem } from '@/domain/rules/auth/credentials';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

export type RequestPasswordResetResult =
  | { status: 'invalid'; email: EmailProblem }
  /** The same answer whether the account exists or not (RN-AUTH-02). */
  | { status: 'sent' }
  | { status: 'offline' }
  | { status: 'failed' };

/** RF-AUTH-08.AC1: asks for the recovery link. */
export class RequestPasswordReset {
  constructor(private readonly gateway: Pick<AuthGateway, 'requestPasswordReset'>) {}

  async execute(input: { email: string }): Promise<RequestPasswordResetResult> {
    const problem = emailProblem(input.email);
    if (problem !== null) return { status: 'invalid', email: problem };
    return { status: await this.gateway.requestPasswordReset(input.email.trim()) };
  }
}
