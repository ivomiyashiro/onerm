/**
 * Performance measurements of #221 (`bun run perf`): the real screens, ViewModels, use cases and
 * repositories on a real SQLite database with 1.000 finished workouts (RNF-03, RNF-14), compiled
 * with React Compiler like the app. It reports renders per component and SQL statements per
 * scenario; Node's times are only a hint, the phone is the reference. It prints, it doesn't guard:
 * the tests only fail if a scenario can't run.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Profiler, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { exercises } from '@/data/db/schema';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite-workout-repository';
import { ManualTableChanges } from '@/data/db/table-changes';
import { AppProviders } from '@/di/app-providers';
import { createDependencies } from '@/di/create-dependencies';
import { aBilateralSet, aWorkout, aWorkoutExercise } from '@/domain/testing/builders';
import { FakeDevicePermissions, FakeRestNotifier } from '@/domain/testing/in-memory-repositories';
import type { NextDayOverview } from '@/domain/usecases/observe-next-day';
import type { WorkoutOverview } from '@/domain/usecases/observe-workout';
import { firstValue } from '@/domain/usecases/observe-together';
import { HomeScreen } from '@/presentation/features/home/home-screen';
import { HistoryScreen } from '@/presentation/features/progress/history-screen';
import { WorkoutScreen } from '@/presentation/features/workout/workout-screen';

import { measuredDatabase } from './measured-database';
import { renders, resetRenders, totalRenders } from './render-counter';

// Inside AppProviders the ids come from expo-crypto, which jest-expo mocks without a value.
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
jest.mock('react/jsx-runtime', () =>
  jest
    .requireActual<typeof import('./render-counter')>('./render-counter')
    .countingRuntime(jest.requireActual('react/jsx-runtime')),
);
jest.mock('react/jsx-dev-runtime', () =>
  jest
    .requireActual<typeof import('./render-counter')>('./render-counter')
    .countingRuntime(jest.requireActual('react/jsx-dev-runtime')),
);

const HISTORY = Number(process.env.PERF_HISTORY ?? 1000);
const SETS_PER_EXERCISE = 3;
const DAY = 24 * 60 * 60 * 1000;
const noop = () => {};
// An iPhone 17 Pro: the screens read the insets.
const METRICS = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 62, left: 0, right: 0, bottom: 34 },
};

interface Measure {
  scenario: string;
  commits: number;
  renders: number;
  reads: number;
  writes: number;
  ms: number;
  components: [string, number][];
  statements: [string, number][];
}
const results: Measure[] = [];

type Seeded = Awaited<ReturnType<typeof seed>>;

/** PLT-FB3 adopted, `history` finished workouts of its Día A and, optionally, one in progress. */
async function seed({ history, inProgress }: { history: number; inProgress: boolean }) {
  const measured = measuredDatabase();
  await measured.storage.localDatabase.prepare();
  let n = 0;
  const newId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
  const device = { notifier: new FakeRestNotifier(), permissions: new FakeDevicePermissions() };
  const { useCases } = createDependencies(measured.storage, newId, device);
  await useCases.adoptTemplate.execute('PLT-FB3');
  const next = await firstValue<NextDayOverview>((o) => useCases.observeNextDay.execute(o));
  if (next.kind !== 'nextDay') throw new Error('PLT-FB3 has no next day');

  const repository = new SqliteWorkoutRepository(
    () => measured.storage.localDatabase.database,
    new ManualTableChanges(),
    Date.now,
  );
  const start = Date.now() - (history + 1) * DAY;
  for (let w = 0; w < history; w++) {
    const workoutId = newId();
    const startedAt = new Date(start + w * DAY);
    await repository.save(
      aWorkout({
        id: workoutId,
        routineId: next.routine.id,
        routineDayId: next.day.id,
        startedAt,
        finishedAt: new Date(startedAt.getTime() + 60 * 60 * 1000),
        exercises: next.day.exercises.map((exercise, position) => {
          const id = newId();
          return aWorkoutExercise({
            id,
            workoutId,
            routineExerciseId: exercise.id,
            plannedExerciseId: exercise.exerciseId,
            exerciseId: exercise.exerciseId,
            position,
            status: 'done',
            prescription: exercise.prescription,
            sets: Array.from({ length: SETS_PER_EXERCISE }, (_, s) =>
              aBilateralSet({
                id: newId(),
                workoutExerciseId: id,
                position: s,
                loadKg: 40 + (w % 20),
                completedAt: new Date(startedAt.getTime() + (position * 3 + s) * 60_000),
              }),
            ),
          });
        }),
      }),
    );
  }
  if (inProgress) await useCases.startWorkout.execute(next.day.id);
  return { measured, device };
}

/**
 * Waits in real time outside `act()`, so React schedules each update as on the phone: inside
 * `act()` every update of the wait would be batched into one commit at its end.
 */
async function settle(ms = 100) {
  const global = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  global.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    await new Promise((resolve) => setTimeout(resolve, ms));
  } finally {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  }
}

let commits = 0;
let lastCommitAt = 0;

function onCommit() {
  commits++;
  lastCommitAt = performance.now();
}

async function mount({ measured, device }: Seeded, tree: ReactNode) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <Profiler id="app" onRender={onCommit}>
        <AppProviders storage={measured.storage} device={device}>
          {tree}
        </AppProviders>
      </Profiler>
    </SafeAreaProvider>,
  );
}

/** Runs `step` from zero counters and records what it cost. */
async function measure(scenario: string, { measured }: Seeded, step: () => Promise<void>) {
  commits = 0;
  resetRenders();
  measured.reset();
  const started = performance.now();
  lastCommitAt = started;
  await step();
  // Until the last commit: what the person waits for, without the wait of `settle`.
  const ms = Math.round(lastCommitAt - started);
  const sql = measured.sql();
  results.push({
    scenario,
    commits,
    renders: totalRenders(),
    reads: sql.reads,
    writes: sql.writes,
    ms,
    components: renders().slice(0, 10),
    statements: measured.topStatements(5),
  });
}

afterAll(() => {
  const lines = results.flatMap((r) => [
    `\n## ${r.scenario}`,
    `commits ${r.commits} · renders ${r.renders} · SQL ${r.reads} reads + ${r.writes} writes · last commit after ${r.ms} ms (Node)`,
    `components: ${r.components.map(([name, count]) => `${name} ${count}`).join(', ')}`,
    ...r.statements.map(([sql, count]) => `  ${count}× ${sql}`),
  ]);
  process.stdout.write(`${lines.join('\n')}\n`);
});

describe('#221 performance', () => {
  it('S07 · Inicio with a workout in progress: mount, then 3 s on screen', async () => {
    const seeded = await seed({ history: HISTORY, inProgress: true });
    await measure('S07 mount', seeded, async () => {
      await mount(
        seeded,
        <HomeScreen onChooseRoutine={noop} onCreateRoutine={noop} onChangeDay={noop} />,
      );
      await settle();
    });
    await measure('S07 3 s on screen (clock)', seeded, () => settle(3000));
  });

  it('S09 · Entrenamiento: mount, «Hecho», the rest, a catalog row rewritten by a sync', async () => {
    const seeded = await seed({ history: HISTORY, inProgress: true });
    await measure('S09 mount', seeded, async () => {
      await mount(seeded, <WorkoutScreen onClose={noop} onFinished={noop} />);
      await settle();
    });
    await measure('S09 3 s on screen (clock)', seeded, () => settle(3000));
    await measure('S09 «Hecho» (RNF-03)', seeded, async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Hecho' }));
      await settle();
    });
    await measure('S09 3 s of rest (countdown)', seeded, () => settle(3000));
    await measure('S09 sync rewrites one catalog row', seeded, async () => {
      const db = seeded.measured.storage.localDatabase.database;
      const row = db.select().from(exercises).limit(1).get()!;
      db.insert(exercises).values(row).onConflictDoUpdate({ target: exercises.id, set: row }).run();
      await settle();
    });
  });

  it('RNF-03 without React: from logSet to the next emission of observeWorkout', async () => {
    const seeded = await seed({ history: HISTORY, inProgress: true });
    const { useCases } = createDependencies(seeded.measured.storage, undefined, seeded.device);
    let emitted: () => void = noop;
    let first: WorkoutOverview | null = null;
    let emissions = 0;
    const stop = useCases.observeWorkout.execute({
      next: (overview) => {
        first ??= overview;
        emissions++;
        emitted();
      },
      error: (error) => {
        throw error;
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const exerciseId = first!.exercises[0].exercise.id;
    const input = { isUnilateral: false, loadKg: 50, reps: 10, rir: 2, isWarmup: false } as const;
    // A first set, so the measured one is like any other of the workout.
    await useCases.logSet.execute(exerciseId, input);
    await new Promise((resolve) => setTimeout(resolve, 50));

    seeded.measured.reset();
    const before = emissions;
    const started = performance.now();
    const next = new Promise<void>((resolve) => (emitted = resolve));
    await useCases.logSet.execute(exerciseId, input);
    await next;
    const ms = Math.round(performance.now() - started);
    stop();
    const sql = seeded.measured.sql();
    results.push({
      scenario: `logSet → observeWorkout (${HISTORY} workouts)`,
      commits: 0,
      renders: emissions - before,
      reads: sql.reads,
      writes: sql.writes,
      ms,
      components: [],
      statements: seeded.measured.topStatements(5),
    });
  });

  it('S09 «Hecho» with the history tab mounted (RNF-03 with RNF-14)', async () => {
    const seeded = await seed({ history: HISTORY, inProgress: true });
    await measure('S18 + S09 mount', seeded, async () => {
      await mount(
        seeded,
        <>
          <HistoryScreen onOpenWorkout={noop} onStartNext={noop} />
          <WorkoutScreen onClose={noop} onFinished={noop} />
        </>,
      );
      await settle();
    });
    await measure('S18 + S09 «Hecho»', seeded, async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Hecho' }));
      await settle();
    });
  });
});
