import { Pressable, StyleSheet, View } from 'react-native';

import type { SyncStatus } from '@/domain/models/sync-status';
import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { colors, radius, size, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

type Tone = 'neutral' | 'ok' | 'warn' | 'err';

const TONE: Record<Tone, { icon: string; background: string }> = {
  neutral: { icon: colors.textSecondary, background: colors.bgCard },
  ok: { icon: colors.textOk, background: colors.bgCard },
  warn: { icon: colors.textWarn, background: colors.bgWarnSoft },
  err: { icon: colors.textErr, background: colors.bgErrSoft },
};

/**
 * Figma «SyncStatus»: warnings in orange and errors in red, always with an icon. Figma has no
 * variant for workoutInProgress: it uses the neutral look with the clock.
 */
function look(status: SyncStatus): { icon: IconName; tone: Tone } {
  switch (status.kind) {
    case 'synced':
      return { icon: 'cloud-ok', tone: 'ok' };
    case 'syncing':
      return { icon: 'refresh', tone: 'neutral' };
    case 'pending':
      return status.online
        ? { icon: 'refresh', tone: 'neutral' }
        : { icon: 'wifi-off', tone: 'warn' };
    case 'conflict':
      return { icon: 'alert', tone: 'err' };
    case 'networkError':
      return { icon: 'cloud-off', tone: 'err' };
    case 'sessionExpired':
      return { icon: 'lock', tone: 'warn' };
    case 'guest':
      return { icon: 'cloud-off', tone: 'neutral' };
    case 'appOutdated':
      return { icon: 'alert', tone: 'warn' };
    case 'workoutInProgress':
      return { icon: 'clock', tone: 'neutral' };
  }
}

interface SyncStatusCardProps {
  status: SyncStatus;
  /** The 13-textos §9 text for the status, already filled in. */
  message: string;
  action?: { label: string; onPress: () => void };
}

/** The backup status of S21 (RF-SYNC-06). */
export function SyncStatusCard({ status, message, action }: SyncStatusCardProps) {
  const { icon, tone } = look(status);
  const { icon: iconColor, background } = TONE[tone];

  return (
    <View testID="sync-status" style={[styles.card, { backgroundColor: background }]}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={18} color={iconColor} testID={`sync-icon-${icon}`} />
      </View>
      <View style={styles.texts}>
        <Text style={[typography.bodyM, { color: colors.textPrimary }]}>{message}</Text>
        {action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            style={styles.action}
          >
            <Text style={[typography.buttonDefault, styles.actionLabel]}>{action.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 64,
    paddingLeft: 14,
    paddingRight: 8,
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderHair,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgRaised,
  },
  texts: { flex: 1, minHeight: 36, justifyContent: 'center' },
  // «Ver» alone is narrower than 48 dp: the minimum width keeps the target (RNF-16).
  action: {
    minHeight: size.targetMin,
    minWidth: size.targetMin,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  // flex-start: the underline follows the text, not the 48 dp minimum width of the target.
  actionLabel: {
    alignSelf: 'flex-start',
    color: colors.textPrimary,
    paddingTop: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderControl,
  },
});
