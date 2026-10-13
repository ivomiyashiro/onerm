import type { AppDatabase } from '@/data/db/app-database';
import { observeQuery } from '@/data/db/observe-query';
import { appState } from '@/data/db/schema';
import type { TableChanges } from '@/data/db/table-changes';
import type { OnboardingStep } from '@/domain/models/onboarding';
import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** `app_state.onboarding_step` stores the step's number: 1–3 for the questions, 4 for S06. */
const STEPS: readonly OnboardingStep[] = ['level', 'goal', 'days', 'recommendation'];

/** The onboarding step, in the single row of `app_state` (07 §2.4). */
export class SqliteOnboardingRepository implements OnboardingRepository {
  constructor(
    private readonly db: () => AppDatabase,
    private readonly changes: TableChanges,
  ) {}

  observeStep(observer: Observer<OnboardingStep | null>): Unsubscribe {
    return observeQuery(
      this.changes,
      [appState],
      () => {
        const stored = this.db().select().from(appState).get()?.onboardingStep ?? null;
        return stored === null ? null : (STEPS[stored - 1] ?? null);
      },
      observer,
    );
  }

  async saveStep(step: OnboardingStep | null): Promise<void> {
    const onboardingStep = step === null ? null : STEPS.indexOf(step) + 1;
    this.db()
      .insert(appState)
      .values({ onboardingStep })
      .onConflictDoUpdate({ target: appState.id, set: { onboardingStep } })
      .run();
  }
}
