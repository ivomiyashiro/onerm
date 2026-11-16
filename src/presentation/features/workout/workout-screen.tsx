import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/presentation/components/feedback/empty-state';
import type { Id } from '@/domain/models/vocabulary';
import { ActionBar } from '@/presentation/features/workout/action-bar';
import { ExercisePanel } from '@/presentation/features/workout/exercise-panel';
import { WorkoutHeader } from '@/presentation/features/workout/workout-header';
import { WorkoutOverlays } from '@/presentation/features/workout/workout-overlays';
import {
  useWorkoutViewModel,
  type WorkoutContent,
  type WorkoutViewModel,
} from '@/presentation/features/workout/use-workout-view-model';
import { home } from '@/presentation/strings/home';
import { colors, space } from '@/presentation/theme';

interface WorkoutScreenProps {
  /** No workout in progress any more: back to the tabs. */
  onClose: () => void;
  /** RF-ENT-11: finished, to its summary (S12). */
  onFinished: (workoutId: Id) => void;
  /** RF-CAT-02 AC5: the video of S26, in YouTube or the browser. */
  onOpenVideo: (url: string) => void;
}

/** S09 · Entrenamiento en curso (08 §5): the current exercise, its sets and «Hecho». */
export function WorkoutScreen({ onClose, onFinished, onOpenVideo }: WorkoutScreenProps) {
  // RF-ENT-07: the screen stays on only here; leaving S09 lets it turn off again.
  useKeepAwake();
  const viewModel = useWorkoutViewModel();
  const { state } = viewModel;
  const insets = useSafeAreaInsets();
  const none = state.status === 'none';

  // Once: the route's callback is a new function on every render.
  const closed = useRef(false);
  useEffect(() => {
    if (!none || closed.current) return;
    closed.current = true;
    onClose();
  }, [none, onClose]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {state.status === 'content' && (
        <Workout
          viewModel={viewModel}
          content={state}
          bottomInset={insets.bottom}
          onOpenVideo={onOpenVideo}
          finish={async (run) => {
            // #241: the dialog stays open while it finishes; a second tap finishes nothing.
            if (closed.current) return;
            // Finishing leaves no workout in progress: S12 replaces the screen, not «back».
            closed.current = true;
            const id = await run();
            if (id === null) closed.current = false;
            else onFinished(id);
          }}
        />
      )}
      {state.status === 'error' && (
        <View style={styles.message}>
          <EmptyState icon="alert" title={home.readError.title} body={home.readError.body} />
        </View>
      )}
    </View>
  );
}

function Workout({
  viewModel,
  content,
  bottomInset,
  onOpenVideo,
  finish,
}: {
  viewModel: WorkoutViewModel;
  content: WorkoutContent;
  bottomInset: number;
  onOpenVideo: (url: string) => void;
  /** Runs a finish action; once finished, to S12. */
  finish: (run: () => Promise<Id | null>) => Promise<void>;
}) {
  const { actions, rest, restMinimized } = viewModel;
  // #229: the clocks live in leaf components (the time, the rest, its end, the menu), so
  // their ticks don't render the whole screen.
  return (
    <>
      <WorkoutHeader
        content={content}
        // Under the full-screen rest nobody sees it: it doesn't tick (#229).
        clockStartedAt={rest && !restMinimized ? null : content.startedAt}
        onOpenMenu={actions.openWorkoutMenu}
      />
      <ExercisePanel content={content} actions={actions} />
      <ActionBar
        viewModel={viewModel}
        content={content}
        bottomInset={bottomInset}
        finish={finish}
      />
      <WorkoutOverlays
        viewModel={viewModel}
        content={content}
        onOpenVideo={onOpenVideo}
        finish={finish}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  message: { padding: space.s16 },
});
