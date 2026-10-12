import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Exercise } from '@/domain/models/exercise';
import { EQUIPMENT, MUSCLES } from '@/domain/models/vocabulary';
import { Chip } from '@/presentation/components/chip/chip';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { SkeletonRow } from '@/presentation/components/feedback/skeleton';
import { SearchField } from '@/presentation/components/input/search-field';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { BottomSheet } from '@/presentation/components/overlay/bottom-sheet';
import { Text } from '@/presentation/components/text';
import { ExerciseRow } from '@/presentation/features/exercises/exercise-row';
import {
  useExerciseSearchViewModel,
  type ExerciseSearchViewModel,
} from '@/presentation/features/exercises/use-exercise-search-view-model';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { colors, typography } from '@/presentation/theme';

interface ExerciseSearchScreenProps {
  onBack: () => void;
  onOpenExercise: (exercise: Exercise) => void;
}

const SKELETON_ROWS = 5;

/**
 * S16 · Buscador de ejercicios (RF-CAT-01), to explore the catalog. The inline chips are the
 * chosen filters and the equipment; «Más filtros» opens every muscle and equipment in a sheet.
 */
export function ExerciseSearchScreen({ onBack, onOpenExercise }: ExerciseSearchScreenProps) {
  const viewModel = useExerciseSearchViewModel();
  const { search, actions } = viewModel;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopBar title={catalog.search.title} backLabel={common.back} onBack={onBack} />
      <View style={styles.search}>
        <SearchField
          label={catalog.search.placeholder}
          clearLabel={catalog.search.clear}
          value={search.query}
          onChangeText={actions.setQuery}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}
        >
          <FilterChips viewModel={viewModel} inline />
          <Chip label={catalog.search.moreFilters} onPress={() => setFiltersOpen(true)} />
        </ScrollView>
      </View>
      <Results viewModel={viewModel} bottomInset={insets.bottom} onOpenExercise={onOpenExercise} />
      <BottomSheet
        visible={filtersOpen}
        title={catalog.search.moreFilters}
        closeLabel={common.close}
        onClose={() => setFiltersOpen(false)}
      >
        <View style={styles.sheet}>
          <FilterChips viewModel={viewModel} />
        </View>
      </BottomSheet>
    </View>
  );
}

/**
 * Inline: the chosen filters first, then the equipment not chosen yet. In the sheet: every muscle
 * and every equipment, by section.
 */
function FilterChips({
  viewModel: { search, actions },
  inline = false,
}: {
  viewModel: ExerciseSearchViewModel;
  inline?: boolean;
}) {
  const muscleChip = (muscle: (typeof MUSCLES)[number]) => (
    <Chip
      key={muscle}
      label={catalog.muscles[muscle]}
      selected={search.muscles.includes(muscle)}
      onPress={() => actions.toggleMuscle(muscle)}
    />
  );
  const equipmentChip = (equipment: (typeof EQUIPMENT)[number]) => (
    <Chip
      key={equipment}
      label={catalog.equipment[equipment]}
      selected={search.equipment.includes(equipment)}
      onPress={() => actions.toggleEquipment(equipment)}
    />
  );

  if (inline) {
    const unchosen = EQUIPMENT.filter((e) => !search.equipment.includes(e));
    return (
      <>
        {search.muscles.map(muscleChip)}
        {search.equipment.map(equipmentChip)}
        {unchosen.map(equipmentChip)}
      </>
    );
  }
  return (
    <>
      <Text style={[typography.label, styles.sectionLabel]}>{catalog.search.muscleFilter}</Text>
      <View style={styles.wrap}>{MUSCLES.map(muscleChip)}</View>
      <Text style={[typography.label, styles.sectionLabel]}>{catalog.search.equipmentFilter}</Text>
      <View style={styles.wrap}>{EQUIPMENT.map(equipmentChip)}</View>
    </>
  );
}

function Results({
  viewModel: { state, actions },
  bottomInset,
  onOpenExercise,
}: {
  viewModel: ExerciseSearchViewModel;
  bottomInset: number;
  onOpenExercise: (exercise: Exercise) => void;
}) {
  switch (state.status) {
    case 'loading':
      return (
        <View style={styles.results}>
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <SkeletonRow key={i} testID="exercise-skeleton" />
          ))}
        </View>
      );
    case 'noResults':
      return (
        <View style={[styles.results, styles.message]}>
          <EmptyState
            icon="search"
            title={catalog.search.empty.title}
            body={catalog.search.empty.body}
            action={{ label: catalog.search.empty.action, onPress: actions.clearFilters }}
          />
        </View>
      );
    case 'error':
      return (
        <View style={[styles.results, styles.message]}>
          <EmptyState
            icon="alert"
            title={catalog.search.readError.title}
            body={catalog.search.readError.body}
            action={{ label: common.retry, onPress: actions.retry }}
          />
        </View>
      );
    case 'content':
      return (
        <FlatList
          style={styles.results}
          contentContainerStyle={{ paddingBottom: bottomInset + 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          data={state.exercises}
          keyExtractor={(exercise) => exercise.id}
          ListHeaderComponent={
            <Text style={[typography.bodyS, styles.count]} accessibilityLiveRegion="polite">
              {catalog.search.count(state.exercises.length)}
            </Text>
          }
          renderItem={({ item }) => (
            <ExerciseRow exercise={item} onPress={() => onOpenExercise(item)} />
          )}
        />
      );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  search: { gap: 12, paddingTop: 4, paddingHorizontal: 16 },
  chips: { gap: 8 },
  results: { flex: 1, paddingTop: 12, paddingHorizontal: 4 },
  message: { paddingHorizontal: 16 },
  count: { color: colors.textSecondary, paddingLeft: 12, paddingBottom: 4 },
  sheet: { gap: 10, paddingHorizontal: 4, paddingBottom: 24 },
  sectionLabel: { color: colors.textSecondary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
