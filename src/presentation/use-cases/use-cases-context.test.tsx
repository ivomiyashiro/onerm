import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import { UseCasesProvider, useUseCases } from '@/presentation/use-cases/use-cases-context';

describe('useUseCases', () => {
  it('returns the use cases of the nearest provider', async () => {
    const repository: ExerciseRepository = { observeAll: () => () => {} };
    const useCases = {
      observeExercises: new ObserveExercises(repository),
      prepareLocalData: new PrepareLocalData({ prepare: async () => {} }),
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
    );

    const { result } = await renderHook(() => useUseCases(), { wrapper });

    expect(result.current).toBe(useCases);
  });

  it('fails with a clear error outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useUseCases())).rejects.toThrow(
      'useUseCases must be used inside UseCasesProvider',
    );
  });
});
