import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import {
  BENCHMARK_BUDGET_MS,
  BENCHMARK_EXPOSURES,
  runEngineBenchmark,
  type BenchmarkResult,
} from '@/domain/rules/suggestion/benchmark';
import { Button } from '@/presentation/components/button/button';
import { Text } from '@/presentation/components/text';
import { dev } from '@/presentation/strings/dev';
import { colors, typography } from '@/presentation/theme';

interface EngineBenchmarkScreenProps {
  /** Injected in tests; on the device it times the real engine with `performance.now`. */
  run?: () => BenchmarkResult;
}

const ms = (value: number) => value.toFixed(1);

/**
 * Development tool (#25): measures RNF-13 on a physical device. It works in release builds too,
 * because a development build runs slower and would not give the real number.
 */
export function EngineBenchmarkScreen({
  run = () => runEngineBenchmark(() => performance.now()),
}: EngineBenchmarkScreenProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const { benchmark } = dev;

  const measure = () => {
    setRunning(true);
    // Let the «Midiendo…» state paint before the CPU-bound run blocks the JS thread.
    setTimeout(() => {
      setResult(run());
      setRunning(false);
    }, 50);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[typography.displayM, styles.primary]} accessibilityRole="header">
        {benchmark.title}
      </Text>
      <Text style={[typography.bodyM, styles.secondary]}>
        {benchmark.description(BENCHMARK_EXPOSURES, BENCHMARK_BUDGET_MS)}
      </Text>
      <Button
        variant="primary"
        label={benchmark.run}
        onPress={measure}
        loading={running}
        loadingLabel={benchmark.running}
      />
      {result && (
        <>
          <Text style={[typography.titleL, styles.primary]} testID="benchmark-median">
            {benchmark.median(ms(result.medianMs))}
          </Text>
          <Text style={[typography.bodyM, styles.secondary]}>
            {benchmark.range(ms(result.minMs), ms(result.maxMs), result.runs)}
          </Text>
          <Text
            style={[
              typography.bodyLStrong,
              { color: result.medianMs < BENCHMARK_BUDGET_MS ? colors.textOk : colors.textErr },
            ]}
          >
            {result.medianMs < BENCHMARK_BUDGET_MS ? benchmark.pass : benchmark.fail}
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: 16, padding: 16, paddingTop: 56, paddingBottom: 48 },
  primary: { color: colors.textPrimary },
  secondary: { color: colors.textSecondary },
});
