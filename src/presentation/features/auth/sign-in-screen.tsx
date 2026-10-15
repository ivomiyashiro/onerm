import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/presentation/components/button/button';
import { Notice } from '@/presentation/components/feedback/notice';
import { TextField } from '@/presentation/components/input/text-field';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { GoogleSignInSection } from '@/presentation/features/auth/google-sign-in-section';
import { useSignInViewModel } from '@/presentation/features/auth/use-sign-in-view-model';
import { auth } from '@/presentation/strings/auth';
import { common } from '@/presentation/strings/common';
import { colors, space } from '@/presentation/theme';

interface SignInScreenProps {
  /** S03 passes the email that was taken (RF-AUTH-02.AC3). */
  initialEmail?: string;
  onBack: () => void;
  /** Signed in: leave the auth stack. */
  onDone: () => void;
  onSignUp: () => void;
  /** S04, with the email typed here. */
  onForgotPassword: (email: string) => void;
}

/** S02 · Iniciar sesión (RF-AUTH-03). "Continuar con Google" (RF-AUTH-04) sits at the top. */
export function SignInScreen({
  initialEmail,
  onBack,
  onDone,
  onSignUp,
  onForgotPassword,
}: SignInScreenProps) {
  const { state, actions } = useSignInViewModel(initialEmail);
  const insets = useSafeAreaInsets();
  const submitting = state.status === 'submitting';

  // `onDone` has to be stable (the routes memoize it): a new one would navigate again.
  useEffect(() => {
    if (state.status === 'done') onDone();
  }, [state.status, onDone]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar title={auth.form.signIn} backLabel={common.back} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <GoogleSignInSection onDone={onDone} disabled={submitting} />
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
          secureTextEntry={!state.showPassword}
          autoComplete="current-password"
          autoCapitalize="none"
          disabled={submitting}
        />
        <Button
          variant="tertiary"
          label={auth.form.showPassword}
          onPress={actions.toggleShowPassword}
        />
        {state.message !== null && <Notice tone="warn" message={state.message} />}
        <Button
          variant="primary"
          label={auth.form.signIn}
          loading={submitting}
          loadingLabel={auth.form.signingIn}
          disabled={!state.canSubmit}
          onPress={actions.submit}
        />
        <View style={styles.links}>
          <Button
            variant="tertiary"
            label={auth.form.forgotPassword}
            onPress={() => onForgotPassword(state.email.trim())}
          />
          <Button variant="tertiary" label={auth.form.noAccount} onPress={onSignUp} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: space.s16, padding: space.s16 },
  links: { gap: space.s8 },
});
