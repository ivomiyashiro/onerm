import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import type { RestNotice as Notice } from '@/presentation/features/workout/use-rest';
import { workout as text } from '@/presentation/strings/workout';
import { colors, space, typography } from '@/presentation/theme';

/**
 * The discreet notice of S09 (Figma «Aviso de notificaciones»; RF-ENT-06.AC7, AC10): which
 * permission is missing for the notice with the screen locked, and how to give it.
 */
export function RestNotice({ notice, onPress }: { notice: Notice; onPress: () => void }) {
  const notifications = notice === 'notifications';
  return (
    <View style={styles.notice}>
      <Icon name="bell" size={20} color={colors.textPrimary} />
      <Text style={[typography.bodyS, styles.text]}>
        {notifications ? text.notices.notificationsDenied : text.notices.exactAlarmsDenied}
      </Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}>
        <Text style={[typography.bodyLStrong, styles.link]}>
          {notifications ? text.notices.notificationsAction : text.notices.exactAlarmsAction}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    minHeight: 60,
    paddingVertical: 6,
    paddingRight: 6,
    paddingLeft: space.s14,
    borderRadius: 16,
    backgroundColor: colors.bgWarnSoft,
  },
  text: { flex: 1, color: colors.textPrimary },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.s14 },
  link: {
    color: colors.textPrimary,
    textDecorationLine: 'underline',
    textDecorationColor: colors.textTertiary,
  },
});
