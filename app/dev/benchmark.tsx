import { EngineBenchmarkScreen } from '@/presentation/features/dev/engine-benchmark-screen';

/**
 * RNF-13 on a physical device (#25). Unlike the other development routes it also works in
 * release builds, which are the ones that give the real timing. Reached with
 * `onerm://dev/benchmark`.
 */
export default function DevBenchmarkRoute() {
  return <EngineBenchmarkScreen />;
}
