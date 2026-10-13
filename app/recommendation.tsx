import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { RecommendationScreen } from '@/presentation/features/onboarding/recommendation-screen';
import type { RecommendationExit } from '@/presentation/features/onboarding/use-recommendation-view-model';

export default function S06Route() {
  const router = useRouter();
  const onDone = useCallback(
    (exit: RecommendationExit) =>
      exit === 'templates'
        ? router.replace({
            pathname: '/routines',
            params: { section: 'templates', at: String(Date.now()) },
          })
        : router.replace('/'),
    [router],
  );
  return <RecommendationScreen onDone={onDone} />;
}
