import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SheetOverlay } from '@/presentation/components/overlay/bottom-sheet';
import type { ScreenId } from '@/presentation/features/dev/screen-routes';
import { dev } from '@/presentation/strings/dev';
import { colors, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

/** Skeleton of a screen that is not built yet (#20): its id and its name from 08 §2. */
export function ScreenPlaceholder({ id, footer }: { id: ScreenId; footer?: ReactNode }) {
  return (
    <View style={styles.screen}>
      <Text style={[typography.label, { color: colors.textSecondary }]}>{id}</Text>
      <Text style={[typography.titleXl, { color: colors.textPrimary }]} accessibilityRole="header">
        {dev.screens[id]}
      </Text>
      <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{dev.placeholder}</Text>
      {footer}
    </View>
  );
}

/** Skeleton of a sheet screen (S08, S10, S11), shown by the router over the current screen. */
export function SheetPlaceholder({ id, onClose }: { id: ScreenId; onClose: () => void }) {
  return (
    <SheetOverlay title={dev.screens[id]} subtitle={id} closeLabel={dev.close} onClose={onClose}>
      <Text style={[typography.bodyM, styles.sheetBody]}>{dev.placeholder}</Text>
    </SheetOverlay>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 8, padding: 16, paddingTop: 72, backgroundColor: colors.bgBase },
  sheetBody: { color: colors.textSecondary, paddingHorizontal: 4, paddingBottom: 24 },
});
