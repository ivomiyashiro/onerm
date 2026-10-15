import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';

/** What S21 does when the person taps «Cerrar sesión» (RF-AUTH-07). */
export type SignOutPlan =
  /** D14: a workout in progress blocks it (AC4). */
  | { kind: 'blockedByWorkout' }
  /** D03: changes that would be lost (AC3). Uploading them first arrives with the sync (#45). */
  | { kind: 'pending'; count: number }
  /** AC1: nothing to lose. */
  | { kind: 'ready' };

export class PrepareSignOut {
  constructor(
    private readonly account: Pick<
      AccountRepository,
      'hasWorkoutInProgress' | 'countPendingChanges'
    >,
  ) {}

  async execute(): Promise<SignOutPlan> {
    if (await this.account.hasWorkoutInProgress()) return { kind: 'blockedByWorkout' };
    const count = await this.account.countPendingChanges();
    return count > 0 ? { kind: 'pending', count } : { kind: 'ready' };
  }
}

/**
 * Signs out for good: the session goes and so does the user's data on the device (07 §4.4). The
 * person already confirmed D03 if there were pending changes.
 */
export class ConfirmSignOut {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'signOut'>,
    private readonly account: Pick<AccountRepository, 'hasWorkoutInProgress' | 'clearUserData'>,
  ) {}

  async execute(): Promise<{ status: 'done' } | { status: 'blockedByWorkout' }> {
    // Checked again: a workout may have started since the plan.
    if (await this.account.hasWorkoutInProgress()) return { status: 'blockedByWorkout' };
    await this.gateway.signOut();
    await this.account.clearUserData();
    return { status: 'done' };
  }
}
