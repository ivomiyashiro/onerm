import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Id } from '@/domain/models/vocabulary';
import type { TemplateDetail } from '@/domain/usecases/observe-template';
import { Badge } from '@/presentation/components/badge/badge';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { Notice } from '@/presentation/components/feedback/notice';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { Text } from '@/presentation/components/text';
import { TemplateWhySheet } from '@/presentation/features/routines/template-why-sheet';
import { RoutineChangeDialog } from '@/presentation/features/routines/routine-change-dialog';
import { useTemplateViewModel } from '@/presentation/features/routines/use-template-view-model';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { routines as text } from '@/presentation/strings/routines';
import { colors, radius, size, space, typography } from '@/presentation/theme';

interface TemplateScreenProps {
  templateId: Id;
  onBack: () => void;
  /** The copy is the active routine now (RF-RUT-02.AC1): the home shows its first day. */
  onAdopted: () => void;
  onGoToWorkout: () => void;
}

/** S14 · Detalle de plantilla (RF-RUT-01, 02), with the prescription for the user's goal. */
export function TemplateScreen({
  templateId,
  onBack,
  onAdopted,
  onGoToWorkout,
}: TemplateScreenProps) {
  const { state, dialog, actions } = useTemplateViewModel(templateId, onAdopted);
  const [whyOpen, setWhyOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopBar title={text.template.label} backLabel={common.back} onBack={onBack} />
      {state.status === 'content' && (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <Header detail={state.detail} onWhy={() => setWhyOpen(true)} />
            {state.detail.days.map((day) => (
              <View key={day.id} style={styles.day}>
                <Text style={[typography.titleM, { color: colors.textPrimary }]}>
                  {text.template.dayTitle(day.name, day.exercises.length)}
                </Text>
                <View style={styles.rows}>
                  {day.exercises.map(({ id, name, prescription }, index) => (
                    <View key={id} style={[styles.row, index > 0 && styles.rowDivider]}>
                      <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>
                        {name ?? catalog.detail.unavailable}
                      </Text>
                      <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                        {text.template.exerciseLine(
                          prescription.sets,
                          text.repRange(prescription.repRange),
                          prescription.role,
                        )}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={[styles.bottom, { paddingBottom: insets.bottom + space.s10 }]}>
            <Button variant="primary" size="xl" label={text.template.use} onPress={actions.use} />
          </View>
          <TemplateWhySheet
            template={state.detail.template}
            visible={whyOpen}
            onClose={() => setWhyOpen(false)}
          />
        </>
      )}
      {state.status === 'error' && (
        <View style={styles.content}>
          <EmptyState
            icon="alert"
            title={text.list.readError.title}
            body={text.list.readError.body}
            action={{ label: text.list.readError.retry, onPress: actions.retry }}
          />
        </View>
      )}
      <RoutineChangeDialog
        dialog={dialog}
        onConfirm={actions.confirmDialog}
        onDismiss={actions.dismissDialog}
        onGoToWorkout={onGoToWorkout}
      />
    </View>
  );
}

function Header({ detail, onWhy }: { detail: TemplateDetail; onWhy: () => void }) {
  const { template, goal, minutes, days } = detail;
  // The line quotes the main exercises, the ones the template is built around (C-03).
  const main = days.flatMap((day) => day.exercises).find((e) => e.prescription.role === 'main');
  return (
    <View style={styles.header}>
      <Text style={[typography.displaySm, styles.name]} accessibilityRole="header">
        {template.name}
      </Text>
      <View style={styles.badges}>
        <Badge label={text.list.days(template.daysPerWeek)} />
        <Badge label={text.levels[template.level]} />
        <Badge label={text.list.minutes(minutes)} />
      </View>
      {main && (
        <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
          {text.template.prescription(
            text.goals[goal],
            text.repRange(main.prescription.repRange),
            main.prescription.targetRir,
          )}
        </Text>
      )}
      {goal === 'strength' && <Notice message={text.template.strengthWarning} />}
      <View style={styles.why}>
        <Button variant="tertiary" label={text.template.why} onPress={onWhy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: {
    gap: space.s16,
    paddingTop: space.s4,
    paddingHorizontal: space.s16,
    paddingBottom: space.s24,
  },
  header: { gap: space.s10, paddingLeft: space.s4 },
  name: { color: colors.textPrimary, textTransform: 'uppercase' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  why: { flexDirection: 'row' },
  day: { gap: space.s8 },
  rows: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  row: {
    minHeight: size.targetMain,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderHair },
  bottom: {
    paddingTop: space.s10,
    paddingHorizontal: space.s16,
    borderTopWidth: 1,
    borderTopColor: colors.borderHair,
  },
});
