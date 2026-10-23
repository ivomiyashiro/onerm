import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/presentation/components/button/button';
import { Notice } from '@/presentation/components/feedback/notice';
import { TextField } from '@/presentation/components/input/text-field';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { Text } from '@/presentation/components/text';
import { useNewPasswordViewModel } from '@/presentation/features/auth/use-new-password-view-model';
import { auth } from '@/presentation/strings/auth';
import { common } from '@/presentation/strings/common';
import { colors, space, typography } from '@/presentation/theme';

interface NewPasswordScreenProps {
  /** The link that opened the app (`null` until it arrives). */
  url: string | null;
  onBack: () => void;
  /** Saved and signed in: leave the auth stack. */
  onDone: () => void;
  /** S04, to ask for another link (RF-AUTH-08.AC3). */
  onRequestNewLink: () => void;
}

/** S24 · Nueva contraseña (RF-AUTH-08.AC2, AC3). */
export function NewPasswordScreen({
  url,
  onBack,
  onDone,
  onRequestNewLink,
}: NewPasswordScreenProps) {
  const { state, actions } = useNewPasswordViewModel(url);
  const insets = useSafeAreaInsets();
  const saving = state.status === 'saving';

  // `onDone` has to be stable (the routes memoize it): a new one would navigate again.
  useEffect(() => {
    if (state.status === 'done') onDone();
  }, [state.status, onDone]);

  // Leaving by any road (back, a gesture, the stack) closes a recovery session that wasn't used.
  const { leave } = actions;
  useEffect(() => () => void leave(), [leave]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar title={auth.recovery.newPasswordTitle} backLabel={common.back} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {state.status === 'checking' && <ActivityIndicator color={colors.textSecondary} />}
        {state.status === 'invalidLink' && (
          <>
            <Notice tone="warn" message={auth.recovery.invalidLink} />
            <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
              {auth.recovery.linkExpiryHelp}
            </Text>
            <Button
              variant="primary"
              label={auth.recovery.requestNewLink}
              onPress={onRequestNewLink}
            />
          </>
        )}
        {state.status === 'unavailable' && state.message !== null && (
          <Notice tone="warn" message={state.message} />
        )}
        {(state.status === 'editing' || state.status === 'saving' || state.status === 'done') && (
          <>
            <Text style={[typography.bodyL, { color: colors.textSecondary }]}>
              {auth.recovery.newPasswordBody}
            </Text>
            <TextField
              label={auth.form.passwordLabel}
              value={state.password}
              onChangeText={actions.setPassword}
              error={state.passwordError ?? undefined}
              secureTextEntry={!state.showPassword}
              trailingAction={{
                icon: state.showPassword ? 'eye-off' : 'eye',
                label: state.showPassword ? auth.form.hidePassword : auth.form.showPassword,
                onPress: actions.toggleShowPassword,
              }}
              autoComplete="new-password"
              autoCapitalize="none"
              disabled={saving}
            />
            {state.message !== null && <Notice tone="warn" message={state.message} />}
            <Button
              variant="primary"
              label={auth.recovery.saveAndSignIn}
              loading={saving}
              loadingLabel={auth.form.signingIn}
              disabled={!state.canSubmit}
              onPress={actions.submit}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: space.s16, padding: space.s16 },
});
