import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import { useStartupViewModel } from '@/presentation/features/startup/use-startup-view-model';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

/** Fake database: the test decides when the preparation ends and how. */
function fakeDatabase() {
  const pending: { resolve(): void; reject(error: Error): void }[] = [];
  const prepare = jest.fn(
    () => new Promise<void>((resolve, reject) => pending.push({ resolve, reject })),
  );
  return {
    database: { prepare },
    prepare,
    succeed: () => act(async () => pending.shift()?.resolve()),
    fail: () => act(async () => pending.shift()?.reject(new Error('migration 0001 failed'))),
  };
}

async function renderViewModel(database: { prepare(): Promise<void> }) {
  const useCases = {
    observeExercises: new ObserveExercises({ observeAll: () => () => {} }),
    prepareLocalData: new PrepareLocalData(database),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
  );
  return renderHook(() => useStartupViewModel(), { wrapper });
}

describe('useStartupViewModel (07 §6)', () => {
  it('prepares the local data once, on mount', async () => {
    const fake = fakeDatabase();

    const { result } = await renderViewModel(fake.database);

    expect(result.current.state).toEqual({ status: 'preparing' });
    expect(fake.prepare).toHaveBeenCalledTimes(1);
  });

  it('is ready when the migrations end', async () => {
    const fake = fakeDatabase();
    const { result } = await renderViewModel(fake.database);

    await fake.succeed();

    expect(result.current.state).toEqual({ status: 'ready' });
  });

  it('shows the error when a migration fails', async () => {
    const fake = fakeDatabase();
    const { result } = await renderViewModel(fake.database);

    await fake.fail();

    expect(result.current.state).toEqual({ status: 'error' });
  });

  it('retry prepares again and ends ready', async () => {
    const fake = fakeDatabase();
    const { result } = await renderViewModel(fake.database);
    await fake.fail();

    await act(async () => result.current.actions.retry());

    expect(result.current.state).toEqual({ status: 'preparing' });
    expect(fake.prepare).toHaveBeenCalledTimes(2);
    await fake.succeed();
    expect(result.current.state).toEqual({ status: 'ready' });
  });
});
