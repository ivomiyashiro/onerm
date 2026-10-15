import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/presentation/components/button/button';
import { Notice } from '@/presentation/components/feedback/notice';
import { TextField } from '@/presentation/components/input/text-field';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { Text } from '@/presentation/components/text';
import { useSignUpViewModel } from '@/presentation/features/auth/use-sign-up-view-model';
import { auth } from '@/presentation/strings/auth';
import { common } from '@/presentation/strings/common';
import { colors, space, typography } from '@/presentation/theme';

interface SignUpScreenProps {
  onBack: () => void;
  onDone: () => void;
  /** S02, with the email already filled in when it was taken (RF-AUTH-02.AC3). */
  onSignIn: (email?: string) => void;
}

/** S03 · Crear cuenta (RF-AUTH-02). "Continuar con Google" arrives with #44. */
export function SignUpScreen({ onBack, onDone, onSignIn }: SignUpScreenProps) {
  const { state, actions } = useSignUpViewModel();
  const insets = useSafeAreaInsets();
  const submitting = state.status === 'submitting';

  // `onDone` has to be stable (the routes memoize it): a new one would navigate again.
  useEffect(() => {
    if (state.status === 'done') onDone();
  }, [state.status, onDone]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar title={auth.form.signUp} backLabel={common.back} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[typography.bodyL, { color: colors.textSecondary }]}>
          {auth.form.signUpBody}
        </Text>
        <TextField
          label={auth.form.emailLabel}
          value={state.email}
          onChangeText={actions.setEmail}
          error={state.emailError ?? undefined}
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          disabled={submitting}
        />
        <TextField
          label={auth.form.passwordLabel}
          value={state.password}
          onChangeText={actions.setPassword}
          help={auth.form.passwordHelp}
          error={state.passwordError ?? undefined}
          secureTextEntry={!state.showPassword}
          autoComplete="new-password"
          autoCapitalize="none"
          disabled={submitting}
        />
        <Button
          variant="tertiary"
          label={auth.form.showPassword}
          onPress={actions.toggleShowPassword}
        />
        {state.message !== null && <Notice tone="warn" message={state.message} />}
        {state.emailTaken && (
          <Button
            variant="secondary"
            label={auth.errors.emailTakenAction}
            onPress={() => onSignIn(state.email.trim())}
          />
        )}
        <Button
          variant="primary"
          label={auth.form.signUp}
          loading={submitting}
          loadingLabel={auth.form.signingIn}
          disabled={!state.canSubmit}
          onPress={actions.submit}
        />
        <Button variant="tertiary" label={auth.form.haveAccount} onPress={() => onSignIn()} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: space.s16, padding: space.s16 },
});
