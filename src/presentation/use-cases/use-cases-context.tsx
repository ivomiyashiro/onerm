import { createContext, useContext, type ReactNode } from 'react';

import type { ActivateRoutine } from '@/domain/usecases/activate-routine';
import type { AdjustActiveRoutine } from '@/domain/usecases/adjust-active-routine';
import type { AdoptTemplate } from '@/domain/usecases/adopt-template';
import type { AnswerOnboarding } from '@/domain/usecases/answer-onboarding';
import type { DeleteRoutine } from '@/domain/usecases/delete-routine';
import type { FinishOnboarding } from '@/domain/usecases/finish-onboarding';
import type { ObserveEntry } from '@/domain/usecases/observe-entry';
import type { ObserveExerciseDetail } from '@/domain/usecases/observe-exercise-detail';
import type { ObserveExercises } from '@/domain/usecases/observe-exercises';
import type { ObserveNextDay } from '@/domain/usecases/observe-next-day';
import type { ObserveWorkout } from '@/domain/usecases/observe-workout';
import type { ObserveWorkoutInProgress } from '@/domain/usecases/observe-workout-in-progress';
import type { ObserveHistory } from '@/domain/usecases/observe-history';
import type { ObserveWorkoutDetail } from '@/domain/usecases/observe-workout-detail';
import type { ObserveWorkoutSummary } from '@/domain/usecases/observe-workout-summary';
import type {
  AddPastSet,
  DeletePastSet,
  DeleteWorkout,
  UpdatePastSet,
} from '@/domain/usecases/past-workout-edits';
import type {
  AddRestTime,
  AskRestPermission,
  ObserveRestTimer,
  ReadRestPermissions,
  RescheduleRest,
  SkipRest,
  StartRest,
} from '@/domain/usecases/rest-timer';
import type { StartWorkout } from '@/domain/usecases/start-workout';
import type {
  DiscardWorkout,
  FinishWorkout,
  ReadWorkoutResume,
  SkipExercise,
  SubstituteExercise,
} from '@/domain/usecases/workout-lifecycle';
import type { DeleteSet, LogSet, RestoreSet, UpdateSet } from '@/domain/usecases/workout-sets';
import type { ObserveProfile } from '@/domain/usecases/observe-profile';
import type { ObserveRecommendation } from '@/domain/usecases/observe-recommendation';
import type { ObserveRoutines } from '@/domain/usecases/observe-routines';
import type { ObserveTemplate } from '@/domain/usecases/observe-template';
import type {
  EditRoutineDraft,
  LoadRoutineDraft,
  SaveRoutine,
} from '@/domain/usecases/routine-draft';
import type { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import type { StartAsGuest } from '@/domain/usecases/start-as-guest';
import type { UpdateLoadSetting } from '@/domain/usecases/update-load-setting';
import type { UpdateProfile } from '@/domain/usecases/update-profile';

/**
 * The use cases ViewModels can call (ADR-0011 §4). The composition root (`src/di`) creates them
 * with the real repositories; tests create them with fake ones.
 */
export interface UseCases {
  observeExercises: ObserveExercises;
  observeExerciseDetail: ObserveExerciseDetail;
  observeRoutines: ObserveRoutines;
  observeTemplate: ObserveTemplate;
  observeNextDay: ObserveNextDay;
  adoptTemplate: AdoptTemplate;
  activateRoutine: ActivateRoutine;
  deleteRoutine: DeleteRoutine;
  prepareLocalData: PrepareLocalData;
  observeEntry: ObserveEntry;
  startAsGuest: StartAsGuest;
  answerOnboarding: AnswerOnboarding;
  observeRecommendation: ObserveRecommendation;
  finishOnboarding: FinishOnboarding;
  observeProfile: ObserveProfile;
  updateProfile: UpdateProfile;
  adjustActiveRoutine: AdjustActiveRoutine;
  updateLoadSetting: UpdateLoadSetting;
  loadRoutineDraft: LoadRoutineDraft;
  editRoutineDraft: EditRoutineDraft;
  saveRoutine: SaveRoutine;
  observeWorkout: ObserveWorkout;
  observeWorkoutInProgress: ObserveWorkoutInProgress;
  startWorkout: StartWorkout;
  logSet: LogSet;
  updateSet: UpdateSet;
  deleteSet: DeleteSet;
  restoreSet: RestoreSet;
  observeRestTimer: ObserveRestTimer;
  startRest: StartRest;
  addRestTime: AddRestTime;
  rescheduleRest: RescheduleRest;
  skipRest: SkipRest;
  askRestPermission: AskRestPermission;
  readRestPermissions: ReadRestPermissions;
  skipExercise: SkipExercise;
  substituteExercise: SubstituteExercise;
  finishWorkout: FinishWorkout;
  discardWorkout: DiscardWorkout;
  readWorkoutResume: ReadWorkoutResume;
  observeWorkoutSummary: ObserveWorkoutSummary;
  observeHistory: ObserveHistory;
  observeWorkoutDetail: ObserveWorkoutDetail;
  updatePastSet: UpdatePastSet;
  addPastSet: AddPastSet;
  deletePastSet: DeletePastSet;
  deleteWorkout: DeleteWorkout;
}

const UseCasesContext = createContext<UseCases | null>(null);

export function UseCasesProvider({
  useCases,
  children,
}: {
  useCases: UseCases;
  children: ReactNode;
}) {
  return <UseCasesContext.Provider value={useCases}>{children}</UseCasesContext.Provider>;
}

export function useUseCases(): UseCases {
  const useCases = useContext(UseCasesContext);
  if (useCases === null) {
    throw new Error('useUseCases must be used inside UseCasesProvider');
  }
  return useCases;
}
