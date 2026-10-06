import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/presentation/components/brand/logo';
import { Button } from '@/presentation/components/button/button';
import { Text } from '@/presentation/components/text';
import { strings } from '@/presentation/strings';
import { colors, space, typography } from '@/presentation/theme';

const { dataError } = strings.startup;

/** Figma «Arranque · Error al preparar los datos»: a migration failed (07 §6). */
export function StartupErrorScreen({ onRetry }: { onRetry: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Logo />
        <Text style={[typography.titleL, styles.title]} accessibilityRole="header">
          {dataError.title}
        </Text>
        <Text style={[typography.bodyM, styles.body]}>{dataError.body}</Text>
      </View>
      <View style={[styles.action, { paddingBottom: Math.max(insets.bottom, space.s16) }]}>
        <Button variant="primary" label={dataError.retry} size="xl" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s16,
    paddingHorizontal: space.s24,
  },
  title: { color: colors.textPrimary, textAlign: 'center' },
  body: { color: colors.textSecondary, textAlign: 'center' },
  action: { paddingTop: space.s12, paddingHorizontal: space.s16 },
});
