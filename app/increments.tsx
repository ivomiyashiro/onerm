import { useRouter } from 'expo-router';

import { IncrementsScreen } from '@/presentation/features/profile/increments-screen';

export default function IncrementsRoute() {
  const router = useRouter();
  return <IncrementsScreen onBack={() => router.back()} />;
}
