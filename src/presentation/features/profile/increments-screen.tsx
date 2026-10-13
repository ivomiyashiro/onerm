import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LoadIncrements } from '@/domain/models/profile';
import { LOAD_SETTING_MAX, type LoadSetting } from '@/domain/usecases/update-load-setting';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { Notice } from '@/presentation/components/feedback/notice';
import { TextField } from '@/presentation/components/input/text-field';
import { SettingsGroup, SettingsRow } from '@/presentation/components/list/settings-row';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { BottomSheet } from '@/presentation/components/overlay/bottom-sheet';
import { Text } from '@/presentation/components/text';
import { useIncrementsViewModel } from '@/presentation/features/profile/use-increments-view-model';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { loadNumber } from '@/presentation/strings/numbers';
import { profile } from '@/presentation/strings/profile';
import { colors, space, typography } from '@/presentation/theme';

/** Figma order. */
const EQUIPMENT: readonly (keyof LoadIncrements)[] = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'kettlebell',
];

const text = profile.increments;

const titleOf = (setting: LoadSetting) =>
  setting === 'bar' ? text.barWeight : catalog.equipment[setting];

/** S21 › Incrementos de peso (RF-PERF-06, RN-PERF-08). */
export function IncrementsScreen({ onBack }: { onBack: () => void }) {
  const { state, editing, actions } = useIncrementsViewModel();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopBar title={text.title} backLabel={common.back} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {state.status === 'content' && (
          <>
            <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{text.help}</Text>
            <View style={styles.section}>
              <Text style={[typography.label, styles.label]}>
                {state.unit === 'kg' ? text.inKg : text.inLb}
              </Text>
              <SettingsGroup>
                {EQUIPMENT.map((equipment, index) => (
                  <SettingsRow
                    key={equipment}
                    label={catalog.equipment[equipment]}
                    value={text.value(
                      loadNumber(state.increments[equipment], state.unit),
                      state.unit,
                    )}
                    onPress={() => actions.edit(equipment)}
                    divided={index > 0}
                  />
                ))}
              </SettingsGroup>
            </View>
            <View style={styles.section}>
              <Text style={[typography.label, styles.label]}>{text.bar}</Text>
              <SettingsGroup>
                <SettingsRow
                  label={text.barWeight}
                  value={text.value(loadNumber(state.barWeight, state.unit), state.unit)}
                  onPress={() => actions.edit('bar')}
                />
              </SettingsGroup>
            </View>
            {state.unit === 'kg' && <Notice message={text.lbNote} />}
          </>
        )}
        {state.status === 'error' && (
          <EmptyState
            icon="alert"
            title={profile.readError.title}
            body={profile.readError.body}
            action={{ label: profile.readError.retry, onPress: actions.retry }}
          />
        )}
      </ScrollView>
      {editing && state.status === 'content' && (
        <BottomSheet
          visible
          title={titleOf(editing.setting)}
          closeLabel={common.close}
          onClose={actions.close}
          footer={
            <Button
              variant="primary"
              size="xl"
              label={profile.sheets.save}
              onPress={actions.save}
            />
          }
        >
          <View style={styles.sheetContent}>
            <TextField
              label={state.unit === 'kg' ? text.inKg : text.inLb}
              value={editing.text}
              onChangeText={actions.type}
              keyboardType="decimal-pad"
              error={
                editing.error
                  ? text.invalid(
                      LOAD_SETTING_MAX[editing.setting === 'bar' ? 'bar' : 'increment'],
                      state.unit,
                    )
                  : undefined
              }
            />
          </View>
        </BottomSheet>
      )}
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
  section: { gap: space.s8 },
  label: { paddingLeft: space.s4, color: colors.textSecondary },
  sheetContent: { paddingBottom: space.s8 },
});
