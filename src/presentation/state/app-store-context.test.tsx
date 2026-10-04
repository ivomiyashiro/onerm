import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider, useAppStore } from '@/presentation/state/app-store-context';

describe('useAppStore', () => {
  it('reads the selected value and re-renders when it changes', async () => {
    const store = createAppStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppStoreProvider store={store}>{children}</AppStoreProvider>
    );
    const { result } = await renderHook(() => useAppStore((state) => state.syncStatus), {
      wrapper,
    });

    await act(() => store.getState().setSyncStatus({ kind: 'syncing' }));

    expect(result.current).toEqual({ kind: 'syncing' });
  });

  it('fails with a clear error outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useAppStore((state) => state.owner))).rejects.toThrow(
      'useAppStore must be used inside AppStoreProvider',
    );
  });
});
