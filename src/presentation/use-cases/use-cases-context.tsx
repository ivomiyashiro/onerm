import { createContext, useContext, type ReactNode } from 'react';

import type { ObserveExercises } from '@/domain/usecases/observe-exercises';

/**
 * The use cases ViewModels can call (ADR-0011 §4). The composition root (`src/di`) creates them
 * with the real repositories; tests create them with fake ones.
 */
export interface UseCases {
  observeExercises: ObserveExercises;
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
