import { useRouter } from 'expo-router';

import { SheetPlaceholder } from '@/presentation/features/dev/screen-placeholder';

export default function S08Route() {
  const router = useRouter();
  return <SheetPlaceholder id="S08" onClose={router.back} />;
}
