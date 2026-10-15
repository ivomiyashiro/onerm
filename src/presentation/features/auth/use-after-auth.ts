import { useCallback } from 'react';

import { useAppStore } from '@/presentation/state/app-store-context';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

/** What every way into an account ends with (sign-up, sign-in, Google, a recovery link). */
export interface AccountEntry {
  userId: string;
  email: string | null;
  /** A guest device: its data waits for the union with the account (07 §4.3). */
  pendingMerge: boolean;
}

/**
 * After the person is in: the store follows whose the device is, and a device without a profile
 * starts the onboarding. A guest device stays the guest's until the union (07 §4.3, #43), so the
 * store keeps it as a guest.
 */
export function useAfterAuth(): (entry: AccountEntry) => Promise<void> {
  const { continueAfterAuth } = useUseCases();
  const setAccount = useAppStore((s) => s.setAccount);
  return useCallback(
    async (entry: AccountEntry) => {
      if (!entry.pendingMerge) {
        setAccount({
          kind: 'user',
          userId: entry.userId,
          email: entry.email,
          sessionExpired: false,
        });
      }
      await continueAfterAuth.execute().catch(() => undefined);
    },
    [continueAfterAuth, setAccount],
  );
}
