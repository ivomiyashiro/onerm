import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { Scrim } from '@/presentation/components/overlay/scrim';
import { colors, elevation, radius, size, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

interface SheetContentProps {
  title: string;
  subtitle?: string;
  /** Accessibility label of the close button. */
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * The scrim and the sheet surface, without the Modal: route sheets (S08, S10, S11) are already
 * shown over the screen by the router and render this directly.
 */
export function SheetOverlay({
  title,
  subtitle,
  closeLabel,
  onClose,
  children,
  footer,
  scrimTestID,
}: SheetContentProps & { scrimTestID?: string }) {
  return (
    <>
      <Scrim onPress={onClose} testID={scrimTestID} />
      <View style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.handleArea}>
          <View style={styles.handle} />
        </View>
        <View style={styles.header}>
          <View style={styles.titles}>
            <Text
              style={[typography.titleL, { color: colors.textPrimary }]}
              accessibilityRole="header"
            >
              {title}
            </Text>
            {subtitle && (
              <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{subtitle}</Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={styles.closeArea}
          >
            <View style={styles.closeCircle}>
              <Icon name="x" size={18} color={colors.textPrimary} />
            </View>
          </Pressable>
        </View>
        {children}
        {footer && <View style={styles.footer}>{footer}</View>}
      </View>
    </>
  );
}

/**
 * Figma «BottomSheet»: the single bottom sheet of the app (menus, lists, edit set, keypad…).
 * It closes with the × button, the scrim or the back button.
 */
export function BottomSheet({
  visible,
  testID,
  ...content
}: SheetContentProps & { visible: boolean; testID?: string }) {
  return (
    <Modal
      testID={testID}
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={content.onClose}
    >
      <SheetOverlay {...content} scrimTestID={testID && `${testID}-scrim`} />
    </Modal>
  );
}

interface MenuItemProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/** Figma «MenuItem»: a 56 dp sheet row with an icon tile; destructive in red. */
export function MenuItem({ icon, label, onPress, destructive = false }: MenuItemProps) {
  const color = destructive ? colors.textErr : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.bgSheetItem }]}
    >
      <View style={styles.itemTile}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={[typography.bodyLStrong, styles.itemLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Figma «safe-bottom»: the system navigation sits on top of the sheet.
    paddingBottom: 34,
    paddingHorizontal: 16,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1,
    borderColor: colors.borderSheetEdge,
    backgroundColor: colors.bgSheet,
    ...elevation.sheet,
  },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 44, height: 5, borderRadius: 5, backgroundColor: colors.handleGrab },
  header: { flexDirection: 'row', gap: 8, paddingTop: 6, paddingBottom: 10, paddingHorizontal: 4 },
  titles: { flex: 1, gap: 4 },
  closeArea: {
    width: size.targetMin,
    height: size.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSheetItem,
  },
  footer: { paddingTop: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  itemTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSheetItem,
  },
  itemLabel: { flex: 1 },
});
