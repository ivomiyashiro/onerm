import { useState, type ReactNode } from 'react';

import { createDependencies, type Storage } from '@/di/create-dependencies';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

/**
 * Creates the dependencies once per app launch and provides them to the whole tree. `storage` is
 * the app's database unless a test passes another one.
 */
export function AppProviders({ children, storage }: { children: ReactNode; storage?: Storage }) {
  const [{ useCases, appStore }] = useState(() => createDependencies(storage));

  return (
    <UseCasesProvider useCases={useCases}>
      <AppStoreProvider store={appStore}>{children}</AppStoreProvider>
    </UseCasesProvider>
  );
}
