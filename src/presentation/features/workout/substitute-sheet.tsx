import { SectionList, StyleSheet, View } from 'react-native';

import type { Exercise } from '@/domain/models/exercise';
import type { SubstituteOptions } from '@/domain/rules/workout/substitute-options';
import { Button } from '@/presentation/components/button/button';
import { SearchField } from '@/presentation/components/input/search-field';
import { BottomSheet } from '@/presentation/components/overlay/bottom-sheet';
import { Text } from '@/presentation/components/text';
import { ExerciseRow } from '@/presentation/features/exercises/exercise-row';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { workout as text } from '@/presentation/strings/workout';
import { colors, space, typography } from '@/presentation/theme';

/** The list scrolls inside the floating sheet; the search field stays above it. */
const LIST_MAX_HEIGHT = 420;

interface SubstituteSheetProps {
  /** Null while closed. */
  sheet: { query: string; options: SubstituteOptions } | null;
  originalName: string;
  onSearch: (query: string) => void;
  onChoose: (exercise: Exercise) => void;
  onClose: () => void;
}

/** S11 · Sustituir ejercicio (RF-ENT-09.AC1, Figma «S11 · Sustituir ejercicio» and «Sin resultados»). */
export function SubstituteSheet({
  sheet,
  originalName,
  onSearch,
  onChoose,
  onClose,
}: SubstituteSheetProps) {
  const options = sheet?.options ?? { sameMuscle: [], others: [] };
  const sections = [
    { title: text.substitute.sameMuscle, data: [...options.sameMuscle] },
    { title: text.substitute.others, data: [...options.others] },
  ].filter((section) => section.data.length > 0);

  return (
    <BottomSheet
      visible={sheet !== null}
      title={text.substitute.title}
      subtitle={text.substitute.insteadOf(originalName)}
      closeLabel={common.close}
      onClose={onClose}
    >
      <View style={styles.search}>
        <SearchField
          label={text.substitute.search}
          clearLabel={catalog.search.clear}
          value={sheet?.query ?? ''}
          onChangeText={onSearch}
        />
      </View>
      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[typography.titleM, { color: colors.textPrimary }]}>
            {text.substitute.noResultsTitle}
          </Text>
          <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
            {text.substitute.noResultsBody}
          </Text>
          <Button
            variant="tertiary"
            label={text.substitute.seeSameMuscle}
            onPress={() => onSearch('')}
          />
        </View>
      ) : (
        <SectionList
          style={styles.list}
          sections={sections}
          keyExtractor={(exercise) => exercise.id}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[typography.label, styles.sectionLabel]}>{section.title}</Text>
          )}
          renderItem={({ item }) => <ExerciseRow exercise={item} onPress={() => onChoose(item)} />}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  search: { paddingBottom: space.s12 },
  list: { maxHeight: LIST_MAX_HEIGHT },
  sectionLabel: { color: colors.textSecondary, paddingTop: space.s8, paddingBottom: 4 },
  empty: { alignItems: 'center', gap: space.s8, paddingVertical: space.s16 },
});
