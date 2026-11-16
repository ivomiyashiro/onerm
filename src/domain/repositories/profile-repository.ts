import type { Profile } from '@/domain/models/profile';
import type { Observer, Unsubscribe } from '@/domain/observer';

/** The profile of the current owner (guest or user). Writes go to the local database first. */
export interface ProfileRepository {
  /** Emits null before onboarding creates the profile. */
  observe(observer: Observer<Profile | null>): Unsubscribe;
  /** The same as `observe`'s first value, read once: for a command that reads before it writes. */
  get(): Promise<Profile | null>;
  save(profile: Profile): Promise<void>;
}
