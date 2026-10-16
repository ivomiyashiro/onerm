import { StyleSheet, View } from 'react-native';

import { Button } from '@/presentation/components/button/button';
import { SwitchRow } from '@/presentation/components/choice/switch-row';
import { Dialog } from '@/presentation/components/overlay/dialog';
import { Text } from '@/presentation/components/text';
import { useRestPermissionsSetting } from '@/presentation/features/profile/use-rest-permissions-setting';
import { dialogs } from '@/presentation/strings/dialogs';
import { profile as text } from '@/presentation/strings/profile';
import { colors, space, typography } from '@/presentation/theme';

/**
 * S21 · «Notificaciones del descanso» (08 §6; Figma «S21 · Perfil (invitado)» and «Permiso de
 * notificaciones denegado»): on when the rest notice can arrive with the screen locked.
 */
export function RestNotificationsRow() {
  const { state, exactAlarmsDialog, actions } = useRestPermissionsSetting();
  const missing = state.status === 'ready' ? state.missing : null;
  const help =
    missing === 'notifications'
      ? text.permissions.notificationsBlocked
      : missing === 'exactAlarms'
        ? text.permissions.exactAlarmsOff
        : text.rows.restNotificationsHelp;

  return (
    <View style={styles.row}>
      <SwitchRow
        label={text.rows.restNotifications}
        help={help}
        value={state.status === 'ready' && missing === null}
        disabled={state.status !== 'ready'}
        onChange={() => void actions.toggle()}
      >
        <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>
          {text.rows.restNotifications}
        </Text>
        <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{help}</Text>
      </SwitchRow>
      {missing === 'notifications' && (
        <Button
          variant="tertiary"
          label={text.permissions.openPhoneSettings}
          onPress={() => void actions.openNotificationSettings()}
        />
      )}
      {missing === 'exactAlarms' && (
        <Button
          variant="tertiary"
          label={text.permissions.allow}
          onPress={actions.allowExactAlarms}
        />
      )}
      <Dialog
        visible={exactAlarmsDialog}
        title={dialogs.D17.title}
        body={dialogs.D17.body}
        actions={[
          {
            label: dialogs.D17.openSettings,
            kind: 'advance',
            onPress: () => void actions.openExactAlarmSettings(),
          },
          { label: dialogs.D17.notNow, kind: 'plain', onPress: actions.closeDialog },
        ]}
        onDismiss={actions.closeDialog}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space.s8,
    paddingVertical: space.s10,
    paddingHorizontal: space.s16,
    borderTopWidth: 1,
    borderTopColor: colors.borderHair,
  },
});
