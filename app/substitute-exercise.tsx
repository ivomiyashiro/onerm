import { useRouter } from 'expo-router';

import { SheetPlaceholder } from '@/presentation/features/dev/screen-placeholder';

export default function S11Route() {
  const router = useRouter();
  return <SheetPlaceholder id="S11" onClose={router.back} />;
}
