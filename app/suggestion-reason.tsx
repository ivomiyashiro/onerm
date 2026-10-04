import { useRouter } from 'expo-router';

import { SheetPlaceholder } from '@/presentation/features/dev/screen-placeholder';

export default function S10Route() {
  const router = useRouter();
  return <SheetPlaceholder id="S10" onClose={router.back} />;
}
