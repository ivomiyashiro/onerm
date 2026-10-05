import type { Profile } from '@/domain/models/profile';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** The profile of the current owner (guest or user). Writes go to the local database first. */
export interface ProfileRepository {
  /** Emits null before onboarding creates the profile. */
  observe(observer: Observer<Profile | null>): Unsubscribe;
  save(profile: Profile): Promise<void>;
}
