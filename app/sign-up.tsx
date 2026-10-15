import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { SignUpScreen } from '@/presentation/features/auth/sign-up-screen';

export default function S03Route() {
  const router = useRouter();
  const onDone = useCallback(
    () => (router.canGoBack() ? router.dismissAll() : router.replace('/')),
    [router],
  );
  return (
    <SignUpScreen
      onBack={() => router.back()}
      onDone={onDone}
      onSignIn={(email) =>
        router.replace(email ? { pathname: '/sign-in', params: { email } } : '/sign-in')
      }
    />
  );
}
