import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { RoutineEditorScreen } from '@/presentation/features/routine-editor/routine-editor-screen';

export default function S15Route() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      {/* The swipe back would skip D08 (RF-RUT-03.AC5): back goes through the screen. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <RoutineEditorScreen
        routineId={id === 'new' ? null : id}
        onClose={() => router.back()}
        onGoToWorkout={() => router.push('/workout')}
      />
    </>
  );
}
