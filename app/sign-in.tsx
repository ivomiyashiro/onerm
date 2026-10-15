import { useLocalSearchParams, useRouter } from 'expo-router';

import { SignInScreen } from '@/presentation/features/auth/sign-in-screen';

export default function S02Route() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  return (
    <SignInScreen
      initialEmail={email}
      onBack={() => router.back()}
      // The stack changes by itself when the sign-in starts the onboarding (08 §3); from S21 it
      // goes back to the profile.
      onDone={() => (router.canGoBack() ? router.dismissAll() : router.replace('/'))}
      onSignUp={() => router.replace('/sign-up')}
      onForgotPassword={() => router.push('/forgot-password')}
    />
  );
}
