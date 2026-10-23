import { StyleSheet, View } from 'react-native';

import { Spinner } from '@/presentation/components/icons/spinner';
import { Overlay } from '@/presentation/components/overlay/overlay-host';
import { Scrim } from '@/presentation/components/overlay/scrim';
import { Text } from '@/presentation/components/text';
import { colors, typography } from '@/presentation/theme';

/**
 * A wait the person can't skip, over the scrim: a spinner and what is happening (#285). Back does
 * nothing; it goes away by itself when the wait ends.
 */
export function LoadingVeil({ visible, label }: { visible: boolean; label: string }) {
  return (
    <Overlay visible={visible}>
      <Scrim />
      <View style={styles.center} pointerEvents="none">
        <View style={styles.row} accessible accessibilityLiveRegion="polite">
          <Spinner color={colors.textPrimary} />
          <Text style={[typography.bodyLStrong, { color: colors.textPrimary }]}>{label}</Text>
        </View>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
