import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type RestPermissionsSetting =
  | { status: 'loading' }
  /** What the rest notice still needs (RF-ENT-06.AC7, AC10); null when it can be scheduled. */
  | { status: 'ready'; missing: 'notifications' | 'exactAlarms' | null };

export interface RestPermissionsSettingViewModel {
  state: RestPermissionsSetting;
  /** D17 opened from S21 (08 §2). */
  exactAlarmsDialog: boolean;
  actions: {
    /** The switch: asks when the system still can, otherwise the phone's settings. */
    toggle(): Promise<void>;
    openNotificationSettings(): Promise<void>;
    /** «Permitir» of the exact alarms: D17 first. */
    allowExactAlarms(): void;
    openExactAlarmSettings(): Promise<void>;
    closeDialog(): void;
  };
}

/**
 * S21 · «Notificaciones del descanso» (08 §6, decision D3 of the F5 review): the state of both
 * permissions the rest notice needs, read again when the app comes back from the settings.
 */
export function useRestPermissionsSetting(): RestPermissionsSettingViewModel {
  const { readRestPermissions, askRestPermission } = useUseCases();
  const [state, setState] = useState<RestPermissionsSetting>({ status: 'loading' });
  const [exactAlarmsDialog, setExactAlarmsDialog] = useState(false);

  const read = useCallback(
    () => readRestPermissions.execute({ neverAsked: 'missing' }),
    [readRestPermissions],
  );
  const show = useCallback(
    (missing: 'notifications' | 'exactAlarms' | null) => setState({ status: 'ready', missing }),
    [],
  );

  // On mount, and back from the phone's settings.
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void read().then((missing) => {
        if (active) show(missing);
      });
    refresh();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [read, show]);

  return {
    state,
    exactAlarmsDialog,
    actions: {
      async toggle() {
        if (state.status !== 'ready') return;
        if (state.missing === 'exactAlarms') return setExactAlarmsDialog(true);
        if (state.missing === null) {
          // An app can't take a permission back: only the phone's settings can.
          return askRestPermission.openNotificationSettings();
        }
        // The system prompt, if it still shows; a refused permission only changes in settings.
        const next = await askRestPermission.allow();
        const missing = await read();
        show(missing);
        if (missing === 'notifications') await askRestPermission.openNotificationSettings();
        else if (next === 'exactAlarms') setExactAlarmsDialog(true);
      },
      openNotificationSettings: () => askRestPermission.openNotificationSettings(),
      allowExactAlarms: () => setExactAlarmsDialog(true),
      async openExactAlarmSettings() {
        setExactAlarmsDialog(false);
        await askRestPermission.openExactAlarmSettings();
      },
      closeDialog: () => setExactAlarmsDialog(false),
    },
  };
}
