import { useEffect, useState } from 'react';

import type { LoadIncrements } from '@/domain/models/profile';
import type { LoadUnit } from '@/domain/models/vocabulary';
import type { LoadSetting } from '@/domain/usecases/update-load-setting';
import { loadNumber, parseDecimal } from '@/presentation/strings/numbers';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type IncrementsState =
  | { status: 'loading' }
  | { status: 'content'; unit: LoadUnit; increments: LoadIncrements; barWeight: number }
  | { status: 'error' };

/** The sheet of one value: what is typed, and whether «Guardar» rejected it. */
export interface EditingSetting {
  setting: LoadSetting;
  text: string;
  error: boolean;
}

export interface IncrementsViewModel {
  state: IncrementsState;
  editing: EditingSetting | null;
  actions: {
    edit(setting: LoadSetting): void;
    type(text: string): void;
    save(): Promise<void>;
    close(): void;
    retry(): void;
  };
}

/** S21 › Incrementos de peso (RF-PERF-06, RN-PERF-08): the values of the active unit. */
export function useIncrementsViewModel(): IncrementsViewModel {
  const { observeProfile, updateLoadSetting } = useUseCases();
  const [state, setState] = useState<IncrementsState>({ status: 'loading' });
  const [editing, setEditing] = useState<EditingSetting | null>(null);
  // Changing it re-runs the effect, which subscribes again.
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      observeProfile.execute({
        next: (profile) =>
          setState(
            profile === null
              ? { status: 'error' }
              : {
                  status: 'content',
                  unit: profile.unit,
                  increments:
                    profile.unit === 'kg' ? profile.loadIncrementsKg : profile.loadIncrementsLb,
                  barWeight: profile.unit === 'kg' ? profile.barWeightKg : profile.barWeightLb,
                },
          ),
        error: () => setState({ status: 'error' }),
      }),
    [observeProfile, attempt],
  );

  function edit(setting: LoadSetting) {
    if (state.status !== 'content') return;
    const value = setting === 'bar' ? state.barWeight : state.increments[setting];
    setEditing({ setting, text: loadNumber(value, state.unit), error: false });
  }

  async function save() {
    if (editing === null) return;
    const value = parseDecimal(editing.text);
    try {
      if (value === null) throw new RangeError('Not a number');
      await updateLoadSetting.execute(editing.setting, value);
      setEditing(null);
    } catch {
      // Out of range, not a number or a failed write: the sheet stays with the error.
      setEditing({ ...editing, error: true });
    }
  }

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  return {
    state,
    editing,
    actions: {
      edit,
      type: (text) => setEditing((current) => current && { ...current, text, error: false }),
      save,
      close: () => setEditing(null),
      retry,
    },
  };
}
