import { Animated, Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { Icon } from '@/presentation/components/icons/icon';
import { SwipeRow, type SwipeAction } from '@/presentation/components/list/swipe-row';
import { Text } from '@/presentation/components/text';
import { routines as text } from '@/presentation/strings/routines';
import { useDraggableItem } from '@/presentation/features/routine-editor/use-draggable-item';
import { colors, elevation, size, typography } from '@/presentation/theme';

/** The row's corners, shared by its raised background and the swipe's tint. */
const ROW_RADIUS = 14;

interface EditorExerciseRowProps {
  name: string;
  /**
   * How far the row is drawn from its place in the list, set when the order changes. Its animated
   * offset rests at `-base`, so the two cancel out. On a drop the order and this change in the same
   * commit, while the animated offset stays: the row doesn't move in that frame (#261).
   */
  base: number;
  /** False with «reduce motion»: no row shifts and the order changes at once. */
  animate: boolean;
  /** The row's animated offset, for the screen to move it out of the dragged one's way. */
  onOffset: (offset: Animated.Value | null) => void;
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
  onDragStart: () => void;
  onDragMove: (translationY: number) => void;
  /** Dropped `translationY` away from where it was. Returns whether the order changed. */
  onDrop: (translationY: number) => boolean;
  /** The drag was cancelled without a drop. */
  onDragCancel: () => void;
}

/**
 * Figma «EditorExerciseRow» (S15): the handle to drag and the exercise with its prescription. One
 * way to reorder by touch, the handle (#198); screen readers get «Subir» and «Bajar» as actions of
 * the row (RF-RUT-05.AC2), next to those of the swipe.
 */
export function EditorExerciseRow({
  name,
  base,
  animate,
  onOffset,
  line,
  isFirst,
  isLast,
  onPress,
  onMove,
  swipeActions,
  onLayout,
  onDragStart,
  onDragMove,
  onDrop,
  onDragCancel,
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
  const { dragging, lift, offset, pan } = useDraggableItem({
    base,
    animate,
    onOffset,
    onDragStart,
    onDragMove,
    onDrop,
    onDragCancel,
    axis: 'y',
    testId: `drag ${name}`,
  });

  return (
    // A plain view for `base`, so it changes with the layout in the same commit.
    <View
      testID={`row ${name}`}
      onLayout={(event) => onLayout(event.nativeEvent.layout)}
      style={[dragging && styles.dragging, { transform: [{ translateY: base }] }]}
    >
      <Animated.View style={[styles.row, { transform: [{ translateY: offset }] }]}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.lifted, { opacity: lift }]}
        />
        <SwipeRow testID={name} actions={swipeActions} borderRadius={ROW_RADIUS}>
          {(a11y) => (
            <View style={styles.content}>
              {/* Dragging is for touch; screen readers use «Subir» and «Bajar» (RF-RUT-05.AC2). */}
              <GestureDetector gesture={pan}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: ROW_RADIUS },
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
  dragging: { zIndex: 1 },
  lifted: { borderRadius: ROW_RADIUS, backgroundColor: colors.bgRaised, ...elevation.toast },
  handle: { width: 44, height: size.targetMain, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 3, justifyContent: 'center', minHeight: size.targetMin },
});
