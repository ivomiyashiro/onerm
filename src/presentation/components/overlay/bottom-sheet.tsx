import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Keyboard, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { Overlay, useOverlayProgress } from '@/presentation/components/overlay/overlay-host';
import { Scrim } from '@/presentation/components/overlay/scrim';
import { colors, elevation, radius, size, space, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

/** The gap between the floating sheet and the screen edges (Figma «BottomSheet»). */
const FLOAT_GAP = space.s8;

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
 * The scrim and the sheet surface, without the overlay: route sheets (S08, S10, S11) are already
 * shown over the screen by the router and render this directly.
 */
export function SheetOverlay({
  title,
  subtitle,
  closeLabel,
  onClose,
  children,
  footer,
  testID,
  keyboardHeight = 0,
}: SheetContentProps & { testID?: string; keyboardHeight?: number }) {
  const insets = useSafeAreaInsets();
  // The sheet comes up from below the screen; the scrim only fades (#193).
  const progress = useOverlayProgress();
  const { height } = useWindowDimensions();
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  // Floating: a gap above the system bar, or above the keyboard while it is open.
  const bottom = (keyboardHeight > 0 ? keyboardHeight : insets.bottom) + FLOAT_GAP;
  return (
    <>
      <Scrim onPress={onClose} testID={testID && `${testID}-scrim`} />
      <Animated.View
        testID={testID}
        style={[styles.sheet, { bottom, transform: [{ translateY }] }]}
        accessibilityViewIsModal
      >
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
      </Animated.View>
    </>
  );
}

/**
 * Figma «BottomSheet»: the single bottom sheet of the app (menus, lists, edit set, keypad…). It
 * floats, inset from the screen edges with every corner rounded. It closes with the × button, the
 * scrim or the back button.
 */
export function BottomSheet({
  visible,
  testID,
  ...content
}: SheetContentProps & { visible: boolean; testID?: string }) {
  const keyboardHeight = useKeyboardHeight();
  return (
    <Overlay visible={visible} onRequestClose={content.onClose}>
      <SheetOverlay {...content} keyboardHeight={keyboardHeight} testID={testID} />
    </Overlay>
  );
}

/**
 * The open keyboard's height. A sheet with a field (Incrementos) rises above it: Android doesn't
 * resize the window for the keyboard (edge to edge).
 */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
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
      <View style={[styles.itemTile, destructive && { backgroundColor: colors.bgErrSoftStrong }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={[typography.bodyLStrong, styles.itemLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: FLOAT_GAP,
    right: FLOAT_GAP,
    paddingBottom: space.s16,
    paddingHorizontal: 16,
    borderRadius: radius.xxl,
    borderWidth: 1,
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
