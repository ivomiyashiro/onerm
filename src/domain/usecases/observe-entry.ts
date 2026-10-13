import type { OnboardingStep } from '@/domain/models/onboarding';
import type { Profile } from '@/domain/models/profile';
import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import { observeTogether } from '@/domain/usecases/observe-together';

/** Where the app opens (08 §3): S01, the onboarding (S05, S06) or the tabs. */
export type Entry =
  { kind: 'welcome' } | { kind: 'onboarding'; step: OnboardingStep } | { kind: 'app' };

/**
 * The entry flow of 08 §3, from the local profile: none yet → S01; the onboarding pending → its
 * saved step, or the first question (RF-PERF-01.AC6); done → the app.
 */
export class ObserveEntry {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe'>,
    private readonly onboarding: Pick<OnboardingRepository, 'observeStep'>,
  ) {}

  execute(observer: Observer<Entry>): Unsubscribe {
    return observeTogether<[Profile | null, OnboardingStep | null]>(
      [(o) => this.profiles.observe(o), (o) => this.onboarding.observeStep(o)],
      {
        next: ([profile, step]) => observer.next(entryOf(profile, step)),
        error: observer.error,
      },
    );
  }
}

function entryOf(profile: Profile | null, step: OnboardingStep | null): Entry {
  if (profile === null) return { kind: 'welcome' };
  if (profile.onboardingCompletedAt !== null) return { kind: 'app' };
  return { kind: 'onboarding', step: step ?? 'level' };
}
