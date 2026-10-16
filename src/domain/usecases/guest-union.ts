import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';
import type { GuestSummary, GuestUnion } from '@/domain/repositories/guest-union';

/** The account a guest device waits to be united with (07 §4.3 step 0). */
export interface PendingUnion {
  userId: string;
  email: string | null;
}

export type UnionStart =
  /** Nothing to ask: the device is the account's now. */
  | { kind: 'united' }
  /** D01: both have data (RF-AUTH-05.AC2). */
  | { kind: 'ask'; summary: GuestSummary }
  /** Without connection: it waits, and the device stays the guest's. */
  | { kind: 'offline' };

/** RN-AUTH-05: a routine or a finished workout. */
const hasData = ({ workouts, routines }: GuestSummary) => workouts > 0 || routines > 0;

/** Steps 1–4 of 07 §4.3: unites without asking when only one side has data. */
export class StartGuestUnion {
  constructor(private readonly union: GuestUnion) {}

  async execute(pending: PendingUnion): Promise<UnionStart> {
    const summary = await this.union.guestSummary();
    if (hasData(summary)) {
      const accountHasData = await this.union.accountHasData(pending.userId);
      if (accountHasData === 'offline') return { kind: 'offline' };
      if (accountHasData) return { kind: 'ask', summary };
    }
    // AC5 (the guest has nothing) and AC7 (the account has nothing): everything goes to it.
    const result = await this.union.unite({ ...pending, keepGuestData: true });
    return result === 'offline' ? { kind: 'offline' } : { kind: 'united' };
  }
}

/** Step 5: D01 «Sumar a mi cuenta» (AC3) or D01b «Descartar» (AC4). */
export class FinishGuestUnion {
  constructor(private readonly union: Pick<GuestUnion, 'unite'>) {}

  execute({
    choice,
    ...pending
  }: PendingUnion & { choice: 'merge' | 'discard' }): Promise<'done' | 'offline'> {
    return this.union.unite({ ...pending, keepGuestData: choice === 'merge' });
  }
}

/** D01 «Cancelar» (AC9): the session closes and the device stays the guest's, untouched. */
export class CancelGuestUnion {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'signOut'>,
    private readonly account: Pick<AccountRepository, 'savePendingMigration'>,
  ) {}

  async execute(): Promise<void> {
    await this.gateway.signOut();
    await this.account.savePendingMigration(null);
  }
}

/**
 * AC10: a union left halfway (the app closed) resumes from step 1 with the stored session. If
 * that session is gone, nothing can be united: the wait is dropped and the guest stays.
 */
export class ReadPendingUnion {
  constructor(
    private readonly gateway: Pick<AuthGateway, 'storedSession'>,
    private readonly account: Pick<
      AccountRepository,
      'readPendingMigration' | 'savePendingMigration'
    >,
  ) {}

  async execute(): Promise<PendingUnion | null> {
    const userId = await this.account.readPendingMigration();
    if (userId === null) return null;
    const session = await this.gateway.storedSession();
    if (session?.userId === userId) return { userId, email: session.email };
    await this.account.savePendingMigration(null);
    return null;
  }
}
