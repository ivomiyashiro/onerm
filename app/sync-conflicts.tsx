import { useRouter } from 'expo-router';

import { RejectedChangesScreen } from '@/presentation/features/sync/rejected-changes-screen';

export default function S25Route() {
  const router = useRouter();
  return <RejectedChangesScreen onBack={() => router.back()} />;
}
