import { useLocalSearchParams, useRouter } from 'expo-router';

import { TemplateScreen } from '@/presentation/features/routines/template-screen';

export default function S14Route() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <TemplateScreen
      templateId={id}
      onBack={() => router.back()}
      // RF-RUT-02.AC1: the home shows the first day of the adopted routine.
      onAdopted={() => router.dismissTo('/')}
      onGoToWorkout={() => router.push('/workout')}
    />
  );
}
