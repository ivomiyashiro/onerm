import type { OnboardingStep } from '@/domain/models/onboarding';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** The onboarding step saved on this device (local only, 07 §2.4). */
export interface OnboardingRepository {
  /** Null when no step was saved: the onboarding didn't start, or it ended. */
  observeStep(observer: Observer<OnboardingStep | null>): Unsubscribe;
  saveStep(step: OnboardingStep | null): Promise<void>;
}
