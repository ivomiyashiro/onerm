import { useState, type ReactNode } from 'react';

import { createDependencies } from '@/di/create-dependencies';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

/** Creates the dependencies once per app launch and provides them to the whole tree. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [{ useCases, appStore }] = useState(createDependencies);

  return (
    <UseCasesProvider useCases={useCases}>
      <AppStoreProvider store={appStore}>{children}</AppStoreProvider>
    </UseCasesProvider>
  );
}
