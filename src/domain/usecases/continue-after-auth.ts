import type { Profile } from '@/domain/models/profile';
import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';
import type {
  LocalSyncState,
  SyncStateRepository,
} from '@/domain/repositories/sync-state-repository';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { firstValue } from '@/domain/usecases/observe-together';

/**
 * After signing up or in from the welcome screen: the device has no profile yet, so the onboarding
 * begins as it does for a guest. A device restoring the account waits for it to end (S23): the
 * onboarding runs only if the account had no profile (07 §4.2). From S21 the profile already
 * exists and nothing changes.
 */
export class ContinueAfterAuth {
  constructor(
    private readonly profiles: Pick<ProfileRepository, 'observe' | 'save'>,
    private readonly onboarding: Pick<OnboardingRepository, 'saveStep'>,
    private readonly syncState: Pick<SyncStateRepository, 'observe'>,
  ) {}

  async execute(): Promise<void> {
    const profile = await firstValue<Profile | null>((o) => this.profiles.observe(o));
    if (profile !== null) return;
    // The account's own profile may still be on its way (07 §4.2): a new one would win LWW.
    const { restoreCompleted } = await firstValue<LocalSyncState>((o) => this.syncState.observe(o));
    if (!restoreCompleted) return;
    await this.profiles.save(defaultProfile());
    await this.onboarding.saveStep('level');
  }
}
