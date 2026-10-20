import { useEffect, useEffectEvent, useRef } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Id } from '@/domain/models/vocabulary';
import { ROUTINE_LIMITS } from '@/domain/rules/routine-rules';
import { Button } from '@/presentation/components/button/button';
import { Chip } from '@/presentation/components/chip/chip';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { Notice } from '@/presentation/components/feedback/notice';
import { Icon } from '@/presentation/components/icons/icon';
import { TextField } from '@/presentation/components/input/text-field';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { Dialog } from '@/presentation/components/overlay/dialog';
import { Text } from '@/presentation/components/text';
import { ExerciseSearchScreen } from '@/presentation/features/exercises/exercise-search-screen';
import { dropIndex, type RowLayout } from '@/presentation/features/routine-editor/drop-index';
import { DaySheet } from '@/presentation/features/routine-editor/day-sheet';
import { EditorExerciseRow } from '@/presentation/features/routine-editor/editor-exercise-row';
import { PrescriptionSheet } from '@/presentation/features/routine-editor/prescription-sheet';
import {
  useRoutineEditorViewModel,
  type EditorDialog,
  type EditorState,
  type RoutineEditorViewModel,
} from '@/presentation/features/routine-editor/use-routine-editor-view-model';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { dialogs } from '@/presentation/strings/dialogs';
import { routines as text } from '@/presentation/strings/routines';
import { colors, radius, space, typography } from '@/presentation/theme';

interface RoutineEditorScreenProps {
  /** Null creates a routine (RF-RUT-03). */
  routineId: Id | null;
  onClose: () => void;
  onGoToWorkout: () => void;
}

/** S15 · Editor de rutina (RF-RUT-03..06). */
export function RoutineEditorScreen({
  routineId,
  onClose,
  onGoToWorkout,
}: RoutineEditorScreenProps) {
  const viewModel = useRoutineEditorViewModel(routineId, { onClose, onGoToWorkout });
  const { state, actions } = viewModel;
  const insets = useSafeAreaInsets();

  // The system back asks first too (D08). An effect event, so the listener is registered once.
  const onSystemBack = useEffectEvent(() => actions.back());
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onSystemBack();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const title = routineId === null ? text.editor.createTitle : text.editor.title;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopBar title={title} backLabel={common.back} onBack={actions.back} />
      {state.status === 'content' && (
        <Editor viewModel={viewModel} state={state} bottomInset={insets.bottom} />
      )}
      {state.status === 'error' && (
        <View style={styles.message}>
          <EmptyState
            icon="alert"
            title={text.list.readError.title}
            body={text.list.readError.body}
            action={{ label: text.list.readError.retry, onPress: actions.retry }}
          />
        </View>
      )}
      {state.status === 'missing' && (
        <View style={styles.message}>
          <EmptyState icon="list" title={text.list.empty.title} body={text.list.empty.body} />
        </View>
      )}
      <EditorDialogs viewModel={viewModel} />
    </View>
  );
}

function Editor({
  viewModel,
  state,
  bottomInset,
}: {
  viewModel: RoutineEditorViewModel;
  state: Extract<EditorState, { status: 'content' }>;
  bottomInset: number;
}) {
  const { sheet, picker, daySheetOpen, actions } = viewModel;
  const { routine, selectedDayId, errors } = state;
  const dayIndex = routine.days.findIndex((day) => day.id === selectedDayId);
  const day = routine.days[dayIndex];
  const exercises = day?.exercises ?? [];
  const addDisabled = exercises.length >= ROUTINE_LIMITS.exercisesPerDay.max;
  // Measured by each row, read only when one is dropped.
  const rowLayouts = useRef<RowLayout[]>([]);
  const nameOf = (exerciseId: Id) => state.nameOf(exerciseId) ?? catalog.detail.unavailable;

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {state.workoutInProgress && <Notice message={text.editor.workoutInProgress} />}
        <TextField
          label={text.editor.name}
          value={routine.name}
          onChangeText={(name) =>
            actions.setName(Array.from(name).slice(0, ROUTINE_LIMITS.nameLength.max).join(''))
          }
          error={errors.name ? text.editor.validation.emptyName : undefined}
        />
        <View style={styles.dayBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dayChips}
            contentContainerStyle={styles.days}
          >
            {routine.days.map((d) => (
              <Chip
                key={d.id}
                label={d.name}
                selected={d.id === selectedDayId}
                // Tapping the chosen day opens its options (rename, move, remove).
                onPress={() =>
                  d.id === selectedDayId ? actions.openDaySheet() : actions.selectDay(d.id)
                }
              />
            ))}
            {routine.days.length < ROUTINE_LIMITS.days.max && (
              <Chip label={text.editor.addDay} onPress={actions.addDay} />
            )}
          </ScrollView>
          {/* «S15 · Opciones del día» in sight: rename, move or remove the chosen day (#192). */}
          {day && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.editor.day.options(day.name)}
              onPress={actions.openDaySheet}
              style={styles.dayOptions}
            >
              <Icon name="dots" color={colors.textPrimary} />
            </Pressable>
          )}
        </View>
        {day &&
          (exercises.length === 0 ? (
            <EmptyDay dayName={day.name} afterSave={errors.emptyDayId === day.id} />
          ) : (
            <View style={styles.rows}>
              {exercises.map((exercise, index) => (
                <EditorExerciseRow
                  key={exercise.id}
                  name={nameOf(exercise.exerciseId)}
                  line={text.editor.exerciseLine(
                    exercise.prescription.sets,
                    text.repRange(exercise.prescription.repRange),
                    exercise.prescription.targetRir,
                    text.editor.rest(exercise.prescription.restSeconds),
                  )}
                  isFirst={index === 0}
                  isLast={index === exercises.length - 1}
                  onPress={() => actions.openExercise(exercise.id)}
                  onMove={(offset) => actions.moveExercise(exercise.id, offset)}
                  swipeActions={[
                    {
                      key: 'edit',
                      label: common.swipe.edit,
                      icon: 'edit',
                      onPress: () => actions.openExercise(exercise.id),
                    },
                    {
                      key: 'remove',
                      label: common.swipe.remove,
                      icon: 'trash',
                      destructive: true,
                      onPress: () => actions.removeExercise(exercise.id),
                    },
                  ]}
                  onLayout={(layout) => {
                    rowLayouts.current[index] = layout;
                  }}
                  onDrop={(translationY) =>
                    actions.moveExerciseTo(
                      exercise.id,
                      dropIndex(rowLayouts.current.slice(0, exercises.length), index, translationY),
                    )
                  }
                />
              ))}
            </View>
          ))}
        {state.orderHint && <Notice message={text.editor.mainFirstHelp} />}
        {exercises.length > 1 && (
          <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
            {text.editor.reorderHelp}
          </Text>
        )}
      </ScrollView>
      {/* Always in sight, in the thumb's zone: a day can hold many exercises (#256). */}
      <View
        testID="editor-bottom-bar"
        style={[styles.bottom, { paddingBottom: bottomInset + space.s10 }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.editor.addExercise}
          accessibilityState={{ disabled: addDisabled }}
          disabled={addDisabled}
          onPress={actions.openPicker}
          style={[styles.addExercise, addDisabled && styles.addExerciseDisabled]}
        >
          <Icon name="plus" color={addDisabled ? colors.textTertiary : colors.textPrimary} />
        </Pressable>
        <View style={styles.save}>
          <Button variant="primary" size="xl" label={text.editor.save} onPress={actions.save} />
        </View>
      </View>
      <PrescriptionSheet
        sheet={sheet}
        exerciseName={sheet ? nameOf(sheet.exercise.exerciseId) : ''}
        effortMode={state.effortMode}
        onChange={actions.editForm}
        onSave={actions.applyExercise}
        onReplace={actions.replaceExercise}
        onRemove={() => sheet && actions.removeExercise(sheet.exercise.id)}
        onClose={actions.closeExercise}
      />
      <DaySheet
        visible={daySheetOpen}
        day={day}
        isFirst={dayIndex === 0}
        isLast={dayIndex === routine.days.length - 1}
        canRemove={routine.days.length > 1}
        onRename={actions.renameDay}
        onMove={actions.moveDay}
        onRemove={actions.removeDay}
        onClose={actions.closeDaySheet}
      />
      {/* S16 over the editor, to pick the exercise («Pila o modal», 08 §2). */}
      <Modal
        visible={picker !== null}
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={actions.closePicker}
      >
        {picker && (
          <ExerciseSearchScreen
            title={
              picker.mode === 'add' ? catalog.search.addTo(picker.dayName) : text.editor.replace
            }
            onBack={actions.closePicker}
            onOpenExercise={actions.pick}
          />
        )}
      </Modal>
    </>
  );
}

/** RN-RUT-05: before «Guardar» it explains; after a failed one it says which day blocks it. */
function EmptyDay({ dayName, afterSave }: { dayName: string; afterSave: boolean }) {
  const copy = afterSave
    ? {
        title: text.editor.dayWithoutExercises.title(dayName),
        body: text.editor.dayWithoutExercises.body,
      }
    : text.editor.emptyDay;
  return (
    <View style={styles.emptyDay} accessibilityLiveRegion={afterSave ? 'polite' : 'none'}>
      <View style={styles.emptyIcon}>
        <Icon name="alert" size={20} color={colors.textPrimary} />
      </View>
      <Text style={[typography.titleM, { color: colors.textPrimary }]}>{copy.title}</Text>
      <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{copy.body}</Text>
    </View>
  );
}

function EditorDialogs({ viewModel }: { viewModel: RoutineEditorViewModel }) {
  const { dialog, actions } = viewModel;
  if (dialog === null) return null;
  return <Dialog visible onDismiss={actions.dismissDialog} {...dialogProps(dialog, actions)} />;
}

function dialogProps(dialog: EditorDialog, actions: RoutineEditorViewModel['actions']) {
  switch (dialog.kind) {
    case 'discard':
      return {
        title: dialogs.D08.title,
        body: dialogs.D08.body,
        actions: [
          { label: dialogs.D08.keepEditing, kind: 'safe' as const, onPress: actions.dismissDialog },
          {
            label: dialogs.D08.leave,
            kind: 'destructive' as const,
            onPress: actions.confirmDialog,
          },
        ],
      };
    case 'activate':
      return {
        title: dialogs.D15.title(dialog.routineName),
        body: dialogs.D15.body,
        actions: [
          { label: dialogs.D15.activate, kind: 'advance' as const, onPress: actions.confirmDialog },
          { label: dialogs.D15.notNow, kind: 'plain' as const, onPress: actions.dismissDialog },
        ],
      };
    case 'workoutInProgress':
      return {
        title: dialogs.D14.title,
        body: dialogs.D14.body('changeRoutine'),
        actions: [
          {
            label: dialogs.D14.goToWorkout,
            kind: 'advance' as const,
            onPress: actions.goToWorkout,
          },
          { label: dialogs.D14.cancel, kind: 'plain' as const, onPress: actions.dismissDialog },
        ],
      };
    case 'removeDay':
      return {
        title: dialogs.D19.title(dialog.dayName),
        body: dialogs.D19.body(dialog.exercises),
        actions: [
          { label: dialogs.D19.cancel, kind: 'safe' as const, onPress: actions.dismissDialog },
          {
            label: dialogs.D19.remove,
            kind: 'destructive' as const,
            onPress: actions.confirmDialog,
          },
        ],
      };
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: {
    gap: space.s14,
    paddingTop: space.s4,
    paddingHorizontal: space.s16,
    paddingBottom: space.s24,
  },
  message: { padding: space.s16 },
  dayBar: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  dayChips: { flex: 1 },
  days: { gap: space.s8, paddingRight: space.s8 },
  dayOptions: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  rows: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  emptyDay: {
    gap: space.s8,
    padding: space.s20,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    marginBottom: space.s8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.bgRaised,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    paddingTop: space.s10,
    paddingHorizontal: space.s16,
    borderTopWidth: 1,
    borderTopColor: colors.borderHair,
  },
  addExercise: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.bgRaised,
  },
  addExerciseDisabled: { opacity: 0.5 },
  save: { flex: 1 },
});
