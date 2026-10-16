import type { OnboardingStep } from '@/domain/models/onboarding';
import type { Profile } from '@/domain/models/profile';
import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type {
  LocalSyncState,
  SyncStateRepository,
} from '@/domain/repositories/sync-state-repository';
import { observeTogether } from '@/domain/usecases/observe-together';

/** What S05 asks; the profile holds the defaults until each one is answered (RN-PERF-02). */
export type OnboardingAnswers = Pick<Profile, 'level' | 'goal' | 'daysPerWeek'>;

/** Where the app opens (08 §3): S01, the onboarding (S05, S06) or the tabs. */
export type Entry =
  | { kind: 'welcome' }
  /** S23: the account is being restored and its profile hasn't arrived (RF-SYNC-03). */
  | { kind: 'restoring' }
  | { kind: 'onboarding'; step: OnboardingStep; answers: OnboardingAnswers }
  | { kind: 'app' };

/**
 * The entry flow of 08 §3, from the local profile: none yet → S01, or S23 while the account is
 * being restored; the onboarding pending → its saved step, or the first question
 * (RF-PERF-01.AC6); done → the app.
 */
export class ObserveEntry {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly onboarding: Pick<OnboardingRepository, 'observeStep'>,
    private readonly syncState: Pick<SyncStateRepository, 'observe'>,
  ) {}

  execute(observer: Observer<Entry>): Unsubscribe {
    return observeTogether<[Profile | null, OnboardingStep | null, LocalSyncState]>(
      [
        (o) => this.profiles.observe(o),
        (o) => this.onboarding.observeStep(o),
        (o) => this.syncState.observe(o),
      ],
      {
        next: ([profile, step, { restoreCompleted }]) =>
          observer.next(
            profile === null && !restoreCompleted ? { kind: 'restoring' } : entryOf(profile, step),
          ),
        error: observer.error,
      },
    );
  }
}

function entryOf(profile: Profile | null, step: OnboardingStep | null): Entry {
  if (profile === null) return { kind: 'welcome' };
  if (profile.onboardingCompletedAt !== null) return { kind: 'app' };
  const { level, goal, daysPerWeek } = profile;
  return { kind: 'onboarding', step: step ?? 'level', answers: { level, goal, daysPerWeek } };
}
