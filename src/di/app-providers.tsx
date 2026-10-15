import { useState, type ReactNode } from 'react';

import { createDependencies, type Device, type Storage } from '@/di/create-dependencies';
import type { AuthGateway } from '@/domain/repositories/auth-gateway';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

/**
 * Creates the dependencies once per app launch and provides them to the whole tree. `storage` is
 * the app's database and `device` the phone, unless a test passes others.
 */
export function AppProviders({
  children,
  storage,
  device,
  auth,
}: {
  children: ReactNode;
  storage?: Storage;
  device?: Device;
  auth?: AuthGateway;
}) {
  const [{ useCases, appStore }] = useState(() =>
    createDependencies(storage, undefined, device, auth),
  );

  return (
    <UseCasesProvider useCases={useCases}>
      <AppStoreProvider store={appStore}>{children}</AppStoreProvider>
    </UseCasesProvider>
  );
}
