import type { OnboardingStep } from '@/domain/models/onboarding';
import type { Profile } from '@/domain/models/profile';
import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import { withProfileChanges, type ProfileChanges } from '@/domain/rules/profile/profile-changes';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { firstValue } from '@/domain/usecases/observe-together';

/**
 * RF-PERF-01: saves an answer of S05 and the step to resume from (AC6). «Saltear» saves no answer
 * and goes to the recommendation: the profile already holds the given answers and, for the rest,
 * the defaults (AC4, RN-PERF-02). The answer goes first, so a failed step only repeats a question.
 */
export class AnswerOnboarding {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe' | 'save'>,
    private readonly onboarding: Pick<OnboardingRepository, 'saveStep'>,
  ) {}

  async execute(answer: ProfileChanges, next: OnboardingStep): Promise<void> {
    const profile =
      (await firstValue<Profile | null>((o) => this.profiles.observe(o))) ?? defaultProfile();
    await this.profiles.save(withProfileChanges(profile, answer));
    await this.onboarding.saveStep(next);
  }
}
