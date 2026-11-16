import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type { SyncStateRepository } from '@/domain/repositories/sync-state-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';

/**
 * After signing up or in from the welcome screen: the device has no profile yet, so the onboarding
 * begins as it does for a guest. A device restoring the account waits for it to end (S23): the
 * onboarding runs only if the account had no profile (07 §4.2). From S21 the profile already
 * exists and nothing changes.
 */
export class ContinueAfterAuth {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'get' | 'save'>,
    private readonly onboarding: Pick<OnboardingRepository, 'saveStep'>,
    private readonly syncState: Pick<SyncStateRepository, 'get'>,
  ) {}

  /**
   * `evenIfRestoring`: S23 «Continuar» after the restoration was cut short (RF-SYNC-03.AC2). If
   * the account's profile arrives later, the newer local one wins LWW (known limitation, 07 §4.2).
   */
  async execute({ evenIfRestoring = false } = {}): Promise<void> {
    const profile = await this.profiles.get();
    if (profile !== null) return;
    // The account's own profile may still be on its way (07 §4.2): a new one would win LWW.
    const { restoreCompleted } = await this.syncState.get();
    if (!restoreCompleted && !evenIfRestoring) return;
    await this.profiles.save(defaultProfile());
    await this.onboarding.saveStep('level');
  }
}
