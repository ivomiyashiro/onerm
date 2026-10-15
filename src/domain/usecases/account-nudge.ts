import { isNudgeDue } from '@/domain/rules/auth/account-nudge';
import type { AccountRepository } from '@/domain/repositories/account-repository';

/**
 * D13 (RF-AUTH-01.AC5): after finishing a workout as a guest, the app suggests creating an account,
 * not more than once every 7 days and never during a workout in progress.
 */
export class ReadAccountNudge {
  constructor(
    private readonly account: Pick<
      AccountRepository,
      'readOwner' | 'readLastNudgeAt' | 'hasWorkoutInProgress'
    >,
    private readonly now: () => Date,
  ) {}

  async execute(): Promise<boolean> {
    if ((await this.account.readOwner()).kind !== 'guest') return false;
    if (await this.account.hasWorkoutInProgress()) return false;
    return isNudgeDue(await this.account.readLastNudgeAt(), this.now());
  }
}

/** The person answered D13, either way: it won't come back for 7 days. */
export class AnswerAccountNudge {
  constructor(
    private readonly account: Pick<AccountRepository, 'saveLastNudgeAt'>,
    private readonly now: () => Date,
  ) {}

  async execute(): Promise<void> {
    await this.account.saveLastNudgeAt(this.now());
  }
}
