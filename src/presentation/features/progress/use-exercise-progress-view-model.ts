import { useEffect, useState } from 'react';

import type { Id } from '@/domain/models/vocabulary';
import { toUnit } from '@/domain/rules/units';
import type { ProgressPeriod } from '@/domain/rules/progress/period';
import type { ExerciseProgressView } from '@/domain/usecases/observe-exercise-progress';
import type { ChartPoint } from '@/presentation/features/progress/progress-chart';
import { loadText } from '@/presentation/features/summary/record-card';
import { common } from '@/presentation/strings/common';
import { estimateText, shortDate } from '@/presentation/strings/numbers';
import { progress } from '@/presentation/strings/progress';
import { workout } from '@/presentation/strings/workout';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

const text = progress.exercise;

/** A card on top of S20: «Máximo estimado 95,2 kg · récord · aproximado». */
export interface StatCard {
  label: string;
  value: string;
  caption: string;
}

export interface ExerciseProgressContent {
  status: 'content';
  name: string | null;
  cards: [StatCard, StatCard];
  chart: {
    title: string;
    points: ChartPoint[];
    /** «Precisión alta · Aproximada · Récord»: only for the e1RM. */
    legend: boolean;
    help: string;
  };
  /** «Mejor serie de cada entrenamiento», newest first; empty for bodyweight (AC6). */
  bestSets: { key: string; date: string; set: string }[];
}

export type ExerciseProgressState =
  | { status: 'loading' }
  | ExerciseProgressContent
  /** No exposure of the exercise (any more). */
  | { status: 'missing' }
  | { status: 'error' };

export interface ExerciseProgressViewModel {
  state: ExerciseProgressState;
  period: ProgressPeriod;
  actions: { choosePeriod(period: ProgressPeriod): void };
}

const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();

/** RF-PROG-04: what S20 draws, by kind of exercise (AC1, AC5, AC6), in the profile unit (AC7). */
export function contentOf(view: ExerciseProgressView): ExerciseProgressContent {
  const { records, unit, last } = view;
  const setText = (loadKg: number, reps: number) =>
    `${loadText(loadKg, unit)} ${workout.set.timesReps(reps)}`;
  const bestSets = view.isBodyweight
    ? []
    : view.points
        .filter((p) => p.bestSet !== null)
        .map((p) => ({
          key: p.workoutId,
          date: shortDate(p.at),
          set: setText(p.bestSet!.loadKg, p.bestSet!.reps),
        }))
        .reverse();
  const totalReps: StatCard = {
    label: text.totalReps,
    value: String(last?.totalReps ?? 0),
    caption: text.lastTime,
  };
  const marked = (values: { at: Date; value: number; hollow: boolean }[]): ChartPoint[] => {
    const top = Math.max(...values.map((v) => v.value));
    const recordIndex = values.findIndex((v) => v.value === top);
    return values.map((v, i) => ({ ...v, record: i === recordIndex }));
  };

  if (view.isBodyweight) {
    return {
      status: 'content',
      name: view.name,
      cards: [
        {
          label: text.maxReps,
          value: String(records.mostRepsInASet?.reps ?? 0),
          caption: text.repsUnit,
        },
        totalReps,
      ],
      chart: {
        title: text.maxRepsPerWorkout,
        points: marked(view.points.map((p) => ({ at: p.at, value: p.maxReps, hollow: false }))),
        legend: false,
        help: text.bodyweight,
      },
      bestSets,
    };
  }

  const heaviest = records.heaviestLoad;
  const heaviestCard: StatCard = {
    label: text.heaviestLoad,
    value: heaviest ? setText(heaviest.loadKg, heaviest.reps) : '—',
    caption: heaviest ? text.recordOn(shortDate(heaviest.at)) : '',
  };

  const best = records.bestE1rm;
  if (best === null) {
    // AC5: no set allows an e1RM; the reps of the best set instead.
    return {
      status: 'content',
      name: view.name,
      cards: [
        { ...heaviestCard, label: text.bestSet },
        { ...totalReps, label: text.noE1rm.totalReps },
      ],
      chart: {
        title: text.noE1rm.bestSetReps(heaviest ? loadText(heaviest.loadKg, unit) : ''),
        points: marked(
          view.points
            .filter((p) => p.bestSet !== null)
            .map((p) => ({ at: p.at, value: p.bestSet!.reps, hollow: false })),
        ),
        legend: false,
        help: text.noE1rm.help,
      },
      bestSets,
    };
  }

  const points = view.points
    .filter((p) => p.e1rm !== null)
    .map((p) => ({
      at: p.at,
      value: toUnit(p.e1rm!.value, unit),
      hollow: p.e1rm!.precision === 'approximate',
      record: sameDay(p.at, best.at),
    }));
  return {
    status: 'content',
    name: view.name,
    cards: [
      {
        label: text.estimatedMax,
        value: estimateText(best.e1rm.value, unit),
        caption:
          best.e1rm.precision === 'approximate'
            ? text.recordApproximate
            : text.recordOn(shortDate(best.at)),
      },
      heaviestCard,
    ],
    chart: {
      title: text.estimatedMaxIn(common.units[unit]),
      points,
      legend: true,
      help: text.chartHelp,
    },
    bestSets,
  };
}

/** S20 · Progreso de ejercicio (RF-PROG-04, RF-PROG-05), «3 meses» first (Figma). */
export function useExerciseProgressViewModel(exerciseId: Id): ExerciseProgressViewModel {
  const { observeExerciseProgress } = useUseCases();
  const [period, setPeriod] = useState<ProgressPeriod>('threeMonths');
  const [state, setState] = useState<ExerciseProgressState>({ status: 'loading' });

  useEffect(
    () =>
      observeExerciseProgress.execute(exerciseId, period, {
        next: (view) => setState(view === null ? { status: 'missing' } : contentOf(view)),
        error: () => setState({ status: 'error' }),
      }),
    [observeExerciseProgress, exerciseId, period],
  );

  return { state, period, actions: { choosePeriod: setPeriod } };
}
