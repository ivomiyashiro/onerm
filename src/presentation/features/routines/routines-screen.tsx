import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Id } from '@/domain/models/vocabulary';
import type { RoutineSummary, RoutinesOverview } from '@/domain/usecases/observe-routines';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { SkeletonRow } from '@/presentation/components/feedback/skeleton';
import { Icon } from '@/presentation/components/icons/icon';
import { SectionTabs } from '@/presentation/components/navigation/section-tabs';
import { BottomSheet, MenuItem } from '@/presentation/components/overlay/bottom-sheet';
import { Text } from '@/presentation/components/text';
import { SwipeRow } from '@/presentation/components/list/swipe-row';
import { RoutineCard } from '@/presentation/features/routines/routine-card';
import { RoutineChangeDialog } from '@/presentation/features/routines/routine-change-dialog';
import {
  useRoutinesViewModel,
  type RoutinesViewModel,
} from '@/presentation/features/routines/use-routines-view-model';
import { common } from '@/presentation/strings/common';
import { routines as text } from '@/presentation/strings/routines';
import { colors, radius, size, space, typography } from '@/presentation/theme';

type Section = 'mine' | 'templates';

interface RoutinesScreenProps {
  /** «Elegir una rutina» from Inicio opens the templates. */
  initialSection?: Section;
  onOpenTemplate: (templateId: Id) => void;
  onCreateRoutine: () => void;
  onEditRoutine: (routineId: Id) => void;
  onGoToWorkout: () => void;
}

const SKELETON_ROWS = 3;

const summaryOf = (item: RoutineSummary) =>
  text.list.summary(item.daysPerWeek, item.level, item.minutes);

/** S13 · Rutinas (RF-RUT-01, 07, 08): Mis rutinas and Plantillas, from the local database. */
export function RoutinesScreen({
  initialSection = 'mine',
  onOpenTemplate,
  onCreateRoutine,
  onEditRoutine,
  onGoToWorkout,
}: RoutinesScreenProps) {
  const { state, dialog, actions } = useRoutinesViewModel();
  const [section, setSection] = useState<Section>(initialSection);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[typography.displayM, styles.title]} accessibilityRole="header">
          {text.list.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text.list.create}
          onPress={onCreateRoutine}
          style={styles.create}
        >
          <Icon name="plus" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>
      <View style={styles.tabs}>
        <SectionTabs
          tabs={[
            { key: 'mine', label: text.list.mine },
            { key: 'templates', label: text.list.templates },
          ]}
          selectedKey={section}
          onSelect={setSection}
        />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {state.status === 'loading' &&
          Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <SkeletonRow key={i} testID="routines-skeleton" />
          ))}
        {state.status === 'error' && (
          <EmptyState
            icon="alert"
            title={text.list.readError.title}
            body={text.list.readError.body}
            action={{ label: text.list.readError.retry, onPress: actions.retry }}
          />
        )}
        {state.status === 'content' &&
          (section === 'mine' ? (
            <MyRoutines
              overview={state.overview}
              actions={actions}
              onShowTemplates={() => setSection('templates')}
              onCreateRoutine={onCreateRoutine}
              onEditRoutine={onEditRoutine}
            />
          ) : (
            <Templates overview={state.overview} onOpenTemplate={onOpenTemplate} />
          ))}
      </ScrollView>
      <RoutineChangeDialog
        dialog={dialog}
        onConfirm={actions.confirmDialog}
        onDismiss={actions.dismissDialog}
        onGoToWorkout={onGoToWorkout}
      />
    </View>
  );
}

function MyRoutines({
  overview,
  actions,
  onShowTemplates,
  onCreateRoutine,
  onEditRoutine,
}: {
  overview: RoutinesOverview;
  actions: RoutinesViewModel['actions'];
  onShowTemplates: () => void;
  onCreateRoutine: () => void;
  onEditRoutine: (routineId: Id) => void;
}) {
  // The routine whose menu is open.
  const [menuFor, setMenuFor] = useState<RoutineSummary | null>(null);

  if (overview.routines.length === 0) {
    return (
      <>
        <EmptyState icon="list" title={text.list.empty.title} body={text.list.empty.body} />
        <Button variant="secondary" label={text.list.empty.action} onPress={onShowTemplates} />
        <Button variant="tertiary" label={text.list.create} onPress={onCreateRoutine} />
      </>
    );
  }

  const isActive = (routine: RoutineSummary) => routine.id === overview.activeRoutineId;

  return (
    <>
      {overview.routines.map((routine) => (
        // #198: swiped, edit and delete; the «⋯» keeps them for screen readers, with «Activar».
        <SwipeRow
          key={routine.id}
          testID={routine.name}
          borderRadius={radius.xl}
          actions={[
            {
              key: 'edit',
              label: common.swipe.edit,
              icon: 'edit',
              onPress: () => onEditRoutine(routine.id),
            },
            {
              key: 'delete',
              label: common.swipe.delete,
              icon: 'trash',
              destructive: true,
              onPress: () => void actions.remove(routine.id),
            },
          ]}
        >
          {() => (
            <RoutineCard
              name={routine.name}
              summary={summaryOf(routine)}
              highlighted={isActive(routine)}
              label={isActive(routine) ? text.list.active : undefined}
              menu={{ label: text.list.options(routine.name), onPress: () => setMenuFor(routine) }}
            />
          )}
        </SwipeRow>
      ))}
      {menuFor && (
        <RoutineMenu
          routine={menuFor}
          isActive={isActive(menuFor)}
          onClose={() => setMenuFor(null)}
          onEdit={() => onEditRoutine(menuFor.id)}
          onActivate={() => void actions.activate(menuFor.id)}
          onDelete={() => void actions.remove(menuFor.id)}
        />
      )}
    </>
  );
}

/** The «⋯» sheet of a routine. «Duplicar» (RF-RUT-09) is a Could left for later. */
function RoutineMenu({
  routine,
  isActive,
  onClose,
  onEdit,
  onActivate,
  onDelete,
}: {
  routine: RoutineSummary;
  isActive: boolean;
  onClose: () => void;
  onEdit: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  // Closes the sheet before acting, so a dialog never opens over it.
  const then = (action: () => void) => () => {
    onClose();
    action();
  };
  return (
    <BottomSheet
      visible
      title={routine.name}
      subtitle={summaryOf(routine)}
      closeLabel={common.close}
      onClose={onClose}
    >
      <MenuItem icon="edit" label={text.list.menu.edit} onPress={then(onEdit)} />
      {!isActive && (
        <MenuItem icon="check" label={text.list.menu.activate} onPress={then(onActivate)} />
      )}
      <MenuItem icon="trash" label={text.list.menu.delete} destructive onPress={then(onDelete)} />
    </BottomSheet>
  );
}

function Templates({
  overview,
  onOpenTemplate,
}: {
  overview: RoutinesOverview;
  onOpenTemplate: (templateId: Id) => void;
}) {
  return (
    <>
      {overview.templates.map((template) => (
        <RoutineCard
          key={template.id}
          name={template.name}
          summary={summaryOf(template)}
          label={template.id === overview.recommendedTemplateId ? text.list.recommended : undefined}
          onPress={() => onOpenTemplate(template.id)}
        />
      ))}
      <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
        {text.list.templatesHelp}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.s4,
    paddingLeft: space.s20,
    paddingRight: space.s8,
  },
  title: { flex: 1, color: colors.textPrimary, textTransform: 'uppercase' },
  create: {
    width: size.targetMin,
    height: size.targetMin,
    borderRadius: size.targetMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgField,
  },
  tabs: { paddingHorizontal: space.s16 },
  list: {
    gap: space.s10,
    paddingTop: space.s16,
    paddingHorizontal: space.s16,
    paddingBottom: space.s24,
  },
});
