import { useLocalSearchParams, useRouter } from 'expo-router';

import { ExerciseDetailScreen } from '@/presentation/features/exercises/exercise-detail-screen';

export default function S17Route() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ExerciseDetailScreen
      exerciseId={id}
      onBack={() => router.back()}
      onOpenProgress={(exerciseId) =>
        router.push({ pathname: '/exercise-progress/[id]', params: { id: exerciseId } })
      }
    />
  );
}
