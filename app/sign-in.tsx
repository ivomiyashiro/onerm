import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { SignInScreen } from '@/presentation/features/auth/sign-in-screen';

export default function S02Route() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  // The stack changes by itself when the sign-in starts the onboarding (08 §3); from S21 it goes
  // back to the profile.
  const onDone = useCallback(
    () => (router.canGoBack() ? router.dismissAll() : router.replace('/')),
    [router],
  );
  return (
    <SignInScreen
      initialEmail={email}
      onBack={() => router.back()}
      onDone={onDone}
      onSignUp={() => router.replace('/sign-up')}
      onForgotPassword={(typed) =>
        router.push({ pathname: '/forgot-password', params: typed ? { email: typed } : {} })
      }
    />
  );
}
