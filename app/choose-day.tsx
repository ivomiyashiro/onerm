import { useRouter } from 'expo-router';

import { ChooseDaySheet } from '@/presentation/features/home/choose-day-sheet';

export default function S08Route() {
  const router = useRouter();
  return <ChooseDaySheet onClose={router.back} onStarted={() => router.replace('/workout')} />;
}
