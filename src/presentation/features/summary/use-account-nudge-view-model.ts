import { useEffect, useState } from 'react';

import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export interface AccountNudgeViewModel {
  /** D13 is open (RF-AUTH-01.AC5). */
  visible: boolean;
  actions: {
    /** «Ahora no»: it doesn't come back for 7 days. */
    notNow(): Promise<void>;
    /** «Crear cuenta»: counts as answered too. */
    createAccount(): Promise<void>;
  };
}

/**
 * D13 · Guardá tu progreso: shown over S12 to a guest who just finished a workout, if the last
 * answer was 7 days ago or more. `enabled` waits for the summary to be there.
 */
export function useAccountNudgeViewModel(
  enabled: boolean,
  onCreateAccount: () => void,
): AccountNudgeViewModel {
  const { readAccountNudge, answerAccountNudge } = useUseCases();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    readAccountNudge.execute().then(
      (due) => active && setVisible(due),
      // Not being able to read it only means not asking this time.
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [enabled, readAccountNudge]);

  async function answer() {
    setVisible(false);
    try {
      await answerAccountNudge.execute();
    } catch {
      // A failed local write: it may be offered again, which is harmless.
    }
  }

  return {
    visible,
    actions: {
      notNow: answer,
      createAccount: async () => {
        await answer();
        onCreateAccount();
      },
    },
  };
}
