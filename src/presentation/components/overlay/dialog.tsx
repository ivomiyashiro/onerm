import { Animated, StyleSheet, View } from 'react-native';

import { Button, type ButtonVariant } from '@/presentation/components/button/button';
import { Overlay, useOverlayProgress } from '@/presentation/components/overlay/overlay-host';
import { Scrim } from '@/presentation/components/overlay/scrim';
import { colors, elevation, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

/**
 * 13-textos §8 and marca §11: the highlighted action goes first and filled (`advance` in lime,
 * `safe` in grey); the others are text, and the destructive one is red.
 */
export type DialogActionKind = 'advance' | 'safe' | 'plain' | 'destructive';

const VARIANT: Record<DialogActionKind, ButtonVariant> = {
  advance: 'primary',
  safe: 'secondary',
  plain: 'tertiary',
  destructive: 'danger',
};

export interface DialogAction {
  label: string;
  kind: DialogActionKind;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Shown next to the spinner while loading (for example "Sumando…"). */
  loadingLabel?: string;
}

interface DialogProps {
  visible: boolean;
  title: string;
  body?: string;
  actions: DialogAction[];
  /** Back button. Tapping outside does nothing: the dialog asks for a decision. */
  onDismiss: () => void;
  testID?: string;
}

/** Figma «Dialog»: a confirmation over the scrim. */
export function Dialog({ visible, title, body, actions, onDismiss, testID }: DialogProps) {
  return (
    <Overlay visible={visible} onRequestClose={onDismiss}>
      <DialogCard title={title} body={body} actions={actions} testID={testID} />
    </Overlay>
  );
}

function DialogCard({ title, body, actions, testID }: Omit<DialogProps, 'visible' | 'onDismiss'>) {
  // It fades in growing slightly over the scrim.
  const progress = useOverlayProgress();
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  return (
    <>
      <Scrim />
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          testID={testID}
          style={[styles.dialog, { opacity: progress, transform: [{ scale }] }]}
          accessibilityViewIsModal
        >
          <Text
            style={[typography.titleL, { color: colors.textPrimary }]}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {body && <Text style={[typography.bodyL, { color: colors.textSecondary }]}>{body}</Text>}
          <View style={styles.actions}>
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={VARIANT[action.kind]}
                label={action.label}
                onPress={action.onPress}
                disabled={action.disabled}
                loading={action.loading}
                loadingLabel={action.loadingLabel}
                block
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  dialog: {
    gap: 8,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgSheet,
    ...elevation.dialog,
  },
  actions: { gap: 6, paddingTop: 16 },
});
