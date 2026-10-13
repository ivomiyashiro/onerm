import type { Profile } from '@/domain/models/profile';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { ProfileRepository } from '@/domain/repositories/profile-repository';

/** S21: the profile as stored. Null before the onboarding creates it. */
export class ObserveProfile {
  constructor(private readonly profiles: Pick<ProfileRepository, 'observe'>) {}

  execute(observer: Observer<Profile | null>): Unsubscribe {
    return this.profiles.observe(observer);
  }
}
