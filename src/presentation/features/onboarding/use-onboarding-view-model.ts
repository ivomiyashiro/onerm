import { useEffect, useRef, useState } from 'react';

import type { OnboardingStep } from '@/domain/models/onboarding';
import type { ProfileChanges } from '@/domain/rules/profile/profile-changes';
import type { OnboardingAnswers } from '@/domain/usecases/observe-entry';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

/** The three questions of S05, in order (RF-PERF-01). */
export const QUESTIONS = ['level', 'goal', 'days'] as const;
export type Question = (typeof QUESTIONS)[number];

export type OnboardingState =
  { status: 'loading' } | { status: 'content'; step: Question; answers: OnboardingAnswers };

export interface OnboardingViewModel {
  state: OnboardingState;
  actions: {
    /** Chooses an option; «Siguiente» saves it. */
    select(answer: Partial<OnboardingAnswers>): void;
    next(): Promise<void>;
    back(): void;
    /** RF-PERF-01.AC4: the unconfirmed choice of this question is not saved. */
    skip(): Promise<void>;
  };
}

const afterQuestion = (step: Question): OnboardingStep =>
  QUESTIONS[QUESTIONS.indexOf(step) + 1] ?? 'recommendation';

/** What each question saves from the answers. */
const ANSWER: Record<Question, (answers: OnboardingAnswers) => ProfileChanges> = {
  level: ({ level }) => ({ level }),
  goal: ({ goal }) => ({ goal }),
  days: ({ daysPerWeek }) => ({ daysPerWeek }),
};

/**
 * S05 · Onboarding (RF-PERF-01). Starts on the saved step with the saved answers (AC6); from
 * there the steps move here, and each «Siguiente» saves. When the last one is saved the entry
 * flow moves on to S06 by itself. A failed read shows the startup error (EntryGate).
 */
export function useOnboardingViewModel(): OnboardingViewModel {
  const { observeEntry, answerOnboarding } = useUseCases();
  const [state, setState] = useState<OnboardingState>({ status: 'loading' });
  // A ref, not state: two taps in the same frame must save only once.
  const saving = useRef(false);

  useEffect(() => {
    let started = false;
    return observeEntry.execute({
      next: (entry) => {
        if (started || entry.kind !== 'onboarding' || entry.step === 'recommendation') return;
        started = true;
        setState({ status: 'content', step: entry.step, answers: entry.answers });
      },
      error: () => {},
    });
  }, [observeEntry]);

  async function save(changes: ProfileChanges, step: OnboardingStep) {
    if (saving.current) return;
    saving.current = true;
    try {
      await answerOnboarding.execute(changes, step);
      if (step !== 'recommendation') {
        setState((current) => (current.status === 'content' ? { ...current, step } : current));
      }
    } catch {
      // A failed local write: the question stays, and «Siguiente» tries again.
    } finally {
      saving.current = false;
    }
  }

  function select(answer: Partial<OnboardingAnswers>) {
    setState((current) =>
      current.status === 'content'
        ? { ...current, answers: { ...current.answers, ...answer } }
        : current,
    );
  }

  async function next() {
    if (state.status !== 'content') return;
    await save(ANSWER[state.step](state.answers), afterQuestion(state.step));
  }

  function back() {
    if (state.status !== 'content') return;
    const previous = QUESTIONS[QUESTIONS.indexOf(state.step) - 1];
    if (previous !== undefined) setState({ ...state, step: previous });
  }

  async function skip() {
    await save({}, 'recommendation');
  }

  return { state, actions: { select, next, back, skip } };
}
