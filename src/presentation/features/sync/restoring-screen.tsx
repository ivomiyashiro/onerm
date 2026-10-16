import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/presentation/components/button/button';
import { Icon } from '@/presentation/components/icons/icon';
import { Spinner } from '@/presentation/components/icons/spinner';
import { Text } from '@/presentation/components/text';
import { useRestoringViewModel } from '@/presentation/features/sync/use-restoring-view-model';
import { profile } from '@/presentation/strings/profile';
import { colors, radius, space, typography } from '@/presentation/theme';

const { restoring } = profile;

/**
 * S23 · Restaurando tus datos (RF-SYNC-03): full screen while the account's data downloads, with
 * how many records of the total; if the connection is cut, what arrived stays and the app goes on.
 */
export function RestoringScreen() {
  const { state, actions } = useRestoringViewModel();
  const insets = useSafeAreaInsets();

  if (state.status === 'interrupted') {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <Icon name="wifi-off" size={28} color={colors.textWarn} />
        <Text style={[typography.titleL, styles.title]} accessibilityRole="header">
          {restoring.interrupted}
        </Text>
        <Text style={[typography.bodyL, styles.secondary]}>{restoring.interruptedBody}</Text>
        <View style={[styles.action, { paddingBottom: insets.bottom + space.s24 }]}>
          <Button
            variant="primary"
            label={restoring.continue}
            onPress={() => void actions.continue()}
          />
        </View>
      </View>
    );
  }

  const progress = state.status === 'restoring' ? state : null;
  return (
    <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
      <Spinner color={colors.textAccent} />
      <Text style={[typography.titleL, styles.title]} accessibilityRole="header">
        {restoring.title(progress?.percent ?? null)}
      </Text>
      {progress !== null && (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress.percent}%` }]} />
          </View>
          <Text style={[typography.monoS, styles.secondary]}>
            {restoring.progress(progress.done, progress.total)}
          </Text>
        </>
      )}
      <Text style={[typography.bodyM, styles.secondary]}>{restoring.help}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase, paddingHorizontal: space.s24 },
  centered: { justifyContent: 'center', alignItems: 'center', gap: space.s16 },
  title: { color: colors.textPrimary, textAlign: 'center' },
  secondary: { color: colors.textSecondary, textAlign: 'center' },
  track: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.textAccent },
  action: { position: 'absolute', left: space.s24, right: space.s24, bottom: 0 },
});
