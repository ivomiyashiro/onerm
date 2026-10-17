import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Icon } from '@/presentation/components/icons/icon';
import { SwipeRow, type SwipeAction } from '@/presentation/components/list/swipe-row';
import { Text } from '@/presentation/components/text';
import { routines as text } from '@/presentation/strings/routines';
import { colors, elevation, size, typography } from '@/presentation/theme';

interface EditorExerciseRowProps {
  name: string;
  /** «3 × 8–12 · reserva 2 · 2 min». */
  line: string;
  isFirst: boolean;
  isLast: boolean;
  /** Tapping the row opens the prescription. */
  onPress: () => void;
  /** «Subir» and «Bajar» for screen readers (RF-RUT-05.AC2); touch drags the handle. */
  onMove: (offset: -1 | 1) => void;
  /** Swiped left (#198): edit and remove. */
  swipeActions: SwipeAction[];
  /** Where the row sits in the list, for the drop (RF-RUT-05.AC1). */
  onLayout: (layout: LayoutRectangle) => void;
  /** The row was dropped `translationY` away from where it was. */
  onDrop: (translationY: number) => void;
}

/**
 * Figma «EditorExerciseRow» (S15): the handle to drag and the exercise with its prescription. One
 * way to reorder by touch, the handle (#198); screen readers get «Subir» and «Bajar» as actions of
 * the row (RF-RUT-05.AC2), next to those of the swipe.
 */
export function EditorExerciseRow({
  name,
  line,
  isFirst,
  isLast,
  onPress,
  onMove,
  swipeActions,
  onLayout,
  onDrop,
}: EditorExerciseRowProps) {
  const moves: SwipeAction[] = [
    ...(isFirst
      ? []
      : [
          {
            key: 'moveUp',
            label: text.editor.moveUp,
            icon: 'up' as const,
            onPress: () => onMove(-1),
          },
        ]),
    ...(isLast
      ? []
      : [
          {
            key: 'moveDown',
            label: text.editor.moveDown,
            icon: 'down' as const,
            onPress: () => onMove(1),
          },
        ]),
  ];
  const [dragging, setDragging] = useState(false);
  const [offset] = useState(() => new Animated.Value(0));
  // On the JS thread: the drop needs the layouts and the ViewModel, and a row is light to move.
  const drag = Gesture.Pan()
    .runOnJS(true)
    .withTestId(`drag ${name}`)
    .onStart(() => setDragging(true))
    .onUpdate((event) => offset.setValue(event.translationY))
    .onEnd((event) => onDrop(event.translationY))
    .onFinalize(() => {
      offset.setValue(0);
      setDragging(false);
    });

  return (
    <Animated.View
      testID={`row ${name}`}
      onLayout={(event) => onLayout(event.nativeEvent.layout)}
      style={[styles.row, dragging && styles.dragging, { transform: [{ translateY: offset }] }]}
    >
      <SwipeRow testID={name} actions={swipeActions}>
        {(a11y) => (
          <View style={styles.content}>
            {/* Dragging is for touch; screen readers use «Subir» and «Bajar» (RF-RUT-05.AC2). */}
            <GestureDetector gesture={drag}>
              <View
                style={styles.handle}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <Icon name="grip" size={20} color={colors.textSecondary} />
              </View>
            </GestureDetector>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={name}
              accessibilityHint={line}
              accessibilityActions={[
                ...moves.map(({ key, label }) => ({ name: key, label })),
                ...a11y.accessibilityActions,
              ]}
              onAccessibilityAction={(event) => {
                const move = moves.find((m) => m.key === event.nativeEvent.actionName);
                if (move) move.onPress();
                else a11y.onAccessibilityAction(event);
              }}
              onPress={onPress}
              style={styles.texts}
            >
              <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>{name}</Text>
              <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{line}</Text>
            </Pressable>
          </View>
        )}
      </SwipeRow>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: 14 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 72,
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 6,
  },
  // Figma «EditorExerciseRow» (Dragging): raised over the others.
  dragging: { zIndex: 1, backgroundColor: colors.bgRaised, ...elevation.toast },
  handle: { width: 44, height: size.targetMain, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 3, justifyContent: 'center', minHeight: size.targetMin },
});
