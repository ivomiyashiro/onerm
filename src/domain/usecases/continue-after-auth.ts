import type { Profile } from '@/domain/models/profile';
import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { firstValue } from '@/domain/usecases/observe-together';

/**
 * After signing up or in from the welcome screen: the device has no profile yet, so the onboarding
 * begins as it does for a guest. Restoring the account's own data arrives with the sync (F8,
 * 07 §4.2); until then the onboarding is the way in. From S21 the profile already exists and
 * nothing changes.
 */
export class ContinueAfterAuth {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe' | 'save'>,
    private readonly onboarding: Pick<OnboardingRepository, 'saveStep'>,
  ) {}

  async execute(): Promise<void> {
    const profile = await firstValue<Profile | null>((o) => this.profiles.observe(o));
    if (profile !== null) return;
    await this.profiles.save(defaultProfile());
    await this.onboarding.saveStep('level');
  }
}
