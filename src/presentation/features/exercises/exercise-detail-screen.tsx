import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Exercise } from '@/domain/models/exercise';
import type { Id, Muscle } from '@/domain/models/vocabulary';
import { Badge } from '@/presentation/components/badge/badge';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { Notice } from '@/presentation/components/feedback/notice';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { Text } from '@/presentation/components/text';
import { ExerciseTechnique } from '@/presentation/features/exercises/exercise-technique';
import { useExerciseDetailViewModel } from '@/presentation/features/exercises/use-exercise-detail-view-model';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { colors, space, typography } from '@/presentation/theme';

interface ExerciseDetailScreenProps {
  exerciseId: Id;
  onBack: () => void;
  onOpenProgress: (exerciseId: Id) => void;
}

/** S17 · Detalle de ejercicio (RF-CAT-02), read from the local catalog. */
export function ExerciseDetailScreen({
  exerciseId,
  onBack,
  onOpenProgress,
}: ExerciseDetailScreenProps) {
  const { state, actions } = useExerciseDetailViewModel(exerciseId);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopBar title={catalog.detail.title} backLabel={common.back} onBack={onBack} />
      {state.status === 'content' && (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <ExerciseDetail
            exercise={state.exercise}
            hasProgress={state.hasProgress}
            onOpenProgress={() => onOpenProgress(state.exercise.id)}
          />
        </ScrollView>
      )}
      {state.status === 'notFound' && (
        <View style={styles.content}>
          <Notice message={catalog.detail.notYetAvailable} />
        </View>
      )}
      {state.status === 'error' && (
        <View style={styles.content}>
          <EmptyState
            icon="alert"
            title={catalog.search.readError.title}
            body={catalog.search.readError.body}
            action={{ label: common.retry, onPress: actions.retry }}
          />
        </View>
      )}
    </View>
  );
}

function ExerciseDetail({
  exercise,
  hasProgress,
  onOpenProgress,
}: {
  exercise: Exercise;
  hasProgress: boolean;
  onOpenProgress: () => void;
}) {
  return (
    <>
      <Text style={[typography.titleXl, { color: colors.textPrimary }]} accessibilityRole="header">
        {exercise.name}
      </Text>
      <View style={styles.badges}>
        {exercise.equipment.map((equipment) => (
          <Badge key={equipment} label={catalog.equipment[equipment]} />
        ))}
        {exercise.isUnilateral && <Badge label={catalog.detail.unilateral} />}
      </View>
      {exercise.deprecatedAt !== null && <Notice message={catalog.detail.deprecated} />}
      <View style={styles.muscles}>
        <MuscleGroup label={catalog.detail.primary} muscles={exercise.primaryMuscles} primary />
        <MuscleGroup label={catalog.detail.secondary} muscles={exercise.secondaryMuscles} />
      </View>
      {/* RF-CAT-02 AC3: without a technique the section is hidden, never empty. */}
      {exercise.technique !== null && <ExerciseTechnique technique={exercise.technique} />}
      {hasProgress && (
        <Button
          variant="secondary"
          label={catalog.detail.seeProgress}
          icon="chart"
          onPress={onOpenProgress}
        />
      )}
      {exercise.attributions.map(({ source, license }) => (
        <Text key={source} style={[typography.bodyS, { color: colors.textSecondary }]}>
          {catalog.detail.source(source, license)}
        </Text>
      ))}
    </>
  );
}

function MuscleGroup({
  label,
  muscles,
  primary = false,
}: {
  label: string;
  muscles: readonly Muscle[];
  primary?: boolean;
}) {
  if (muscles.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text style={[typography.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.badges}>
        {muscles.map((muscle) => (
          <Badge
            key={muscle}
            label={catalog.muscles[muscle]}
            tone={primary ? 'inverse' : 'neutral'}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: 18, paddingTop: 4, paddingHorizontal: space.s20 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  muscles: { gap: 10 },
  group: { gap: 6 },
});
