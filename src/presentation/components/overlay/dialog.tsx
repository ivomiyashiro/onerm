import { Modal, StyleSheet, View } from 'react-native';

import { Button, type ButtonVariant } from '@/presentation/components/button/button';
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

interface DialogProps {
  visible: boolean;
  title: string;
  body?: string;
  actions: { label: string; kind: DialogActionKind; onPress: () => void }[];
  /** Back button. Tapping outside does nothing: the dialog asks for a decision. */
  onDismiss: () => void;
  testID?: string;
}

/** Figma «Dialog»: a confirmation over the scrim. */
export function Dialog({ visible, title, body, actions, onDismiss, testID }: DialogProps) {
  return (
    <Modal
      testID={testID}
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Scrim />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.dialog} accessibilityViewIsModal>
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
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
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
