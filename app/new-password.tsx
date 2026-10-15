import { useLinkingURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { NewPasswordScreen } from '@/presentation/features/auth/new-password-screen';

export default function S24Route() {
  const router = useRouter();
  // The recovery link (`onerm://new-password#access_token=…`) is what opened the app here.
  const url = useLinkingURL();
  const leave = useCallback(
    () => (router.canGoBack() ? router.dismissAll() : router.replace('/')),
    [router],
  );
  return (
    <NewPasswordScreen
      url={url}
      onBack={leave}
      onDone={leave}
      onRequestNewLink={() => router.replace('/forgot-password')}
    />
  );
}
