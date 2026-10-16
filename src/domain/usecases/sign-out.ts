import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';
import type { SyncResult } from '@/domain/repositories/sync-engine';

/** What S21 does when the person taps «Cerrar sesión» (RF-AUTH-07). */
export type SignOutPlan =
  /** D14: a workout in progress blocks it (AC4). */
  | { kind: 'blockedByWorkout' }
  /** D03: changes that would be lost (AC3). */
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
 * RF-AUTH-07.AC2: with pending changes, they are uploaded first («Respaldando tus datos…»). If
 * something is left (no connection, the server failed, a rejected change), D03 says how much (AC3).
 */
export class BackUpBeforeSignOut {
  constructor(
    private readonly sync: { syncNow(): Promise<SyncResult> },
    private readonly account: Pick<AccountRepository, 'countPendingChanges'>,
  ) {}

  async execute(): Promise<SignOutPlan> {
    await this.sync.syncNow();
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
    /** The sync that may be running (RN-AUTH-07): the device is cleared once it ends. */
    private readonly sync: { whenIdle(): Promise<void> },
  ) {}

  async execute(): Promise<{ status: 'done' } | { status: 'blockedByWorkout' }> {
    // Checked again: a workout may have started since the plan.
    if (await this.account.hasWorkoutInProgress()) return { status: 'blockedByWorkout' };
    // Without the session no new sync touches the account's data; one already writing ends
    // first, so nothing of it lands on the device after it is cleared.
    await this.gateway.signOut();
    await this.sync.whenIdle();
    await this.account.clearUserData();
    return { status: 'done' };
  }
}
