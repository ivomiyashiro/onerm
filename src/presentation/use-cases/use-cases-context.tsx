import { createContext, useContext, type ReactNode } from 'react';

import type { ActivateRoutine } from '@/domain/usecases/activate-routine';
import type { AdoptTemplate } from '@/domain/usecases/adopt-template';
import type { AnswerOnboarding } from '@/domain/usecases/answer-onboarding';
import type { DeleteRoutine } from '@/domain/usecases/delete-routine';
import type { FinishOnboarding } from '@/domain/usecases/finish-onboarding';
import type { ObserveEntry } from '@/domain/usecases/observe-entry';
import type { ObserveExerciseDetail } from '@/domain/usecases/observe-exercise-detail';
import type { ObserveExercises } from '@/domain/usecases/observe-exercises';
import type { ObserveNextDay } from '@/domain/usecases/observe-next-day';
import type { ObserveRecommendation } from '@/domain/usecases/observe-recommendation';
import type { ObserveRoutines } from '@/domain/usecases/observe-routines';
import type { ObserveTemplate } from '@/domain/usecases/observe-template';
import type { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import type { StartAsGuest } from '@/domain/usecases/start-as-guest';

/**
 * The use cases ViewModels can call (ADR-0011 §4). The composition root (`src/di`) creates them
 * with the real repositories; tests create them with fake ones.
 */
export interface UseCases {
  observeExercises: ObserveExercises;
  observeExerciseDetail: ObserveExerciseDetail;
  observeRoutines: ObserveRoutines;
  observeTemplate: ObserveTemplate;
  observeNextDay: ObserveNextDay;
  adoptTemplate: AdoptTemplate;
  activateRoutine: ActivateRoutine;
  deleteRoutine: DeleteRoutine;
  prepareLocalData: PrepareLocalData;
  observeEntry: ObserveEntry;
  startAsGuest: StartAsGuest;
  answerOnboarding: AnswerOnboarding;
  observeRecommendation: ObserveRecommendation;
  finishOnboarding: FinishOnboarding;
}

const UseCasesContext = createContext<UseCases | null>(null);

export function UseCasesProvider({
  useCases,
  children,
}: {
  useCases: UseCases;
  children: ReactNode;
}) {
  return <UseCasesContext.Provider value={useCases}>{children}</UseCasesContext.Provider>;
}

export function useUseCases(): UseCases {
  const useCases = useContext(UseCasesContext);
  if (useCases === null) {
    throw new Error('useUseCases must be used inside UseCasesProvider');
  }
  return useCases;
}
