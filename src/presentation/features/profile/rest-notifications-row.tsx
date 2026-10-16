import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/presentation/components/button/button';
import { Dialog } from '@/presentation/components/overlay/dialog';
import { Text } from '@/presentation/components/text';
import { useRestPermissionsSetting } from '@/presentation/features/profile/use-rest-permissions-setting';
import { dialogs } from '@/presentation/strings/dialogs';
import { profile as text } from '@/presentation/strings/profile';
import { colors, size, space, typography } from '@/presentation/theme';

/**
 * S21 · «Notificaciones del descanso» (08 §6; Figma «S21 · Perfil (invitado)» and «Permiso de
 * notificaciones denegado»): on when the rest notice can arrive with the screen locked.
 */
export function RestNotificationsRow() {
  const { state, exactAlarmsDialog, actions } = useRestPermissionsSetting();
  const missing = state.status === 'ready' ? state.missing : null;
  const on = state.status === 'ready' && missing === null;
  const disabled = state.status !== 'ready';
  const help =
    missing === 'notifications'
      ? text.permissions.notificationsBlocked
      : missing === 'exactAlarms'
        ? text.permissions.exactAlarmsOff
        : text.rows.restNotificationsHelp;

  return (
    <View style={styles.row}>
      {/* The whole row is the switch, as in Android's settings: the Switch alone is 46 × 27 dp
          (RNF-16). The Switch is only drawn; the row is what TalkBack reads and what gets tapped. */}
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={text.rows.restNotifications}
        accessibilityHint={help}
        accessibilityState={{ checked: on, disabled }}
        disabled={disabled}
        onPress={() => void actions.toggle()}
        style={styles.line}
      >
        <View style={styles.texts}>
          <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>
            {text.rows.restNotifications}
          </Text>
          <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{help}</Text>
        </View>
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
          <Switch
            value={on}
            disabled={disabled}
            trackColor={{ false: colors.bgRaised, true: colors.bgAccent }}
            thumbColor={colors.textPrimary}
          />
        </View>
      </Pressable>
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
  line: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.targetMin },
  texts: { flex: 1, gap: 2 },
});
