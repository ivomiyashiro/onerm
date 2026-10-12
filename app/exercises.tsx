import { useRouter } from 'expo-router';

import { ExerciseSearchScreen } from '@/presentation/features/exercises/exercise-search-screen';

export default function S16Route() {
  const router = useRouter();
  return (
    <ExerciseSearchScreen
      onBack={() => router.back()}
      onOpenExercise={({ id }) => router.push({ pathname: '/exercise/[id]', params: { id } })}
    />
  );
}
