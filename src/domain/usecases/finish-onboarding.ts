import type { Profile } from '@/domain/models/profile';
import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { firstValue } from '@/domain/usecases/observe-together';

/**
 * Leaving S06, whichever the choice (RF-PERF-02.AC2, AC3, AC5): the onboarding is done, so the
 * app opens on the tabs from now on (08 §3). "Now" comes in, like every date of the domain.
 */
export class FinishOnboarding {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe' | 'save'>,
    private readonly onboarding: Pick<OnboardingRepository, 'saveStep'>,
    private readonly now: () => Date,
  ) {}

  async execute(): Promise<void> {
    const profile =
      (await firstValue<Profile | null>((o) => this.profiles.observe(o))) ?? defaultProfile();
    await this.profiles.save({ ...profile, onboardingCompletedAt: this.now() });
    await this.onboarding.saveStep(null);
  }
}
