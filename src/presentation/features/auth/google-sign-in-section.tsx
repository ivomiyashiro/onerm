import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/presentation/components/button/button';
import GoogleLogo from '@/presentation/features/auth/google-logo.svg';
import { Notice } from '@/presentation/components/feedback/notice';
import { Text } from '@/presentation/components/text';
import { useGoogleSignInViewModel } from '@/presentation/features/auth/use-google-sign-in-view-model';
import { auth } from '@/presentation/strings/auth';
import { colors, space, typography } from '@/presentation/theme';

interface GoogleSignInSectionProps {
  /** Signed in: leave the auth stack. */
  onDone: () => void;
  /** Disabled while the email form is sending. */
  disabled?: boolean;
}

/** «Continuar con Google» and «o con tu email», at the top of S02 and S03 (RF-AUTH-04). */
export function GoogleSignInSection({ onDone, disabled = false }: GoogleSignInSectionProps) {
  const { available, state, actions } = useGoogleSignInViewModel();

  // `onDone` has to be stable (the routes memoize it): a new one would navigate again.
  useEffect(() => {
    if (state.status === 'done') onDone();
  }, [state.status, onDone]);

  if (!available) return null;

  return (
    <View style={styles.section}>
      <Button
        variant="secondary"
        label={auth.form.continueWithGoogle}
        loading={state.status === 'working'}
        loadingLabel={auth.form.signingIn}
        disabled={disabled}
        onPress={actions.start}
        leading={<GoogleLogo width={20} height={20} />}
      />
      {state.message !== null && <Notice tone="warn" message={state.message} />}
      <Text style={[typography.bodyM, styles.or]}>{auth.form.orWithEmail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.s16 },
  or: { color: colors.textSecondary, textAlign: 'center' },
});
