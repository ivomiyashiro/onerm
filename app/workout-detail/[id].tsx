import { useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutDetailScreen } from '@/presentation/features/progress/workout-detail-screen';

export default function S19Route() {
  const router = useRouter();
  // A link can repeat the param; an unknown id shows nothing and goes back.
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const workoutId = (Array.isArray(id) ? id[0] : id) ?? '';
  return (
    <WorkoutDetailScreen
      workoutId={workoutId}
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/progress'))}
    />
  );
}
