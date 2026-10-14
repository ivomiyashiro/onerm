import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { FakeDevicePermissions } from '@/domain/testing/in-memory-repositories';
import { useRestPermissionsSetting } from '@/presentation/features/profile/use-rest-permissions-setting';
import { restUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function renderSetting(permissions: FakeDevicePermissions) {
  const hook = await renderHook(() => useRestPermissionsSetting(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <UseCasesProvider useCases={someUseCases(restUseCasesOver({ permissions }))}>
        {children}
      </UseCasesProvider>
    ),
  });
  return hook;
}

describe('useRestPermissionsSetting (S21, #146)', () => {
  it('with both permissions nothing is missing; the switch opens the settings to turn it off', async () => {
    const permissions = new FakeDevicePermissions('granted', true);
    const { result } = await renderSetting(permissions);

    expect(result.current.state).toEqual({ status: 'ready', missing: null });
    await act(() => result.current.actions.toggle());

    expect(permissions.opened).toEqual(['notifications']);
  });

  it('never asked: the switch shows the system prompt, and allowing it is enough', async () => {
    const permissions = new FakeDevicePermissions('undetermined', true, true);
    const { result } = await renderSetting(permissions);

    await act(() => result.current.actions.toggle());

    expect(result.current.state).toEqual({ status: 'ready', missing: null });
    expect(permissions.opened).toEqual([]);
  });

  it('RF-ENT-06.AC7: blocked notifications send the switch to the phone settings', async () => {
    const permissions = new FakeDevicePermissions('denied', true, false);
    const { result } = await renderSetting(permissions);

    expect(result.current.state).toEqual({ status: 'ready', missing: 'notifications' });
    await act(() => result.current.actions.toggle());

    expect(permissions.opened).toEqual(['notifications']);
  });

  it('RF-ENT-06.AC10: without exact alarms, «Permitir» opens D17 and then the settings', async () => {
    const permissions = new FakeDevicePermissions('granted', false);
    const { result } = await renderSetting(permissions);

    expect(result.current.state).toEqual({ status: 'ready', missing: 'exactAlarms' });
    await act(() => result.current.actions.allowExactAlarms());
    expect(result.current.exactAlarmsDialog).toBe(true);
    await act(() => result.current.actions.openExactAlarmSettings());

    expect(result.current.exactAlarmsDialog).toBe(false);
    expect(permissions.opened).toEqual(['exactAlarms']);
  });

  it('refusing the system prompt sends the switch on to the phone settings', async () => {
    const permissions = new FakeDevicePermissions('undetermined', true, false);
    const { result } = await renderSetting(permissions);

    await act(() => result.current.actions.toggle());

    expect(result.current.state).toEqual({ status: 'ready', missing: 'notifications' });
    expect(permissions.opened).toEqual(['notifications']);
  });
});
