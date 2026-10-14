import { useLocalSearchParams, useRouter } from 'expo-router';

import { ExerciseProgressScreen } from '@/presentation/features/progress/exercise-progress-screen';

export default function S20Route() {
  const router = useRouter();
  // A link can repeat the param; an unknown id shows nothing and goes back.
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const exerciseId = (Array.isArray(id) ? id[0] : id) ?? '';
  return (
    <ExerciseProgressScreen
      exerciseId={exerciseId}
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/progress'))}
    />
  );
}
