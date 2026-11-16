import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';

/**
 * RF-AUTH-01: «Continuar sin cuenta» creates the guest's profile with the defaults (RN-PERF-02),
 * which the onboarding then fills in, and opens its first question. Offline, like everything else.
 */
export class StartAsGuest {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'get' | 'save'>,
    private readonly onboarding: Pick<OnboardingRepository, 'saveStep'>,
  ) {}

  async execute(): Promise<void> {
    const profile = await this.profiles.get();
    if (profile === null) await this.profiles.save(defaultProfile());
    await this.onboarding.saveStep('level');
  }
}
