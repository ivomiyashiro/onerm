import { createContext, useContext, type ReactNode } from 'react';

import type { ActivateRoutine } from '@/domain/usecases/routines/activate-routine';
import type { AdjustActiveRoutine } from '@/domain/usecases/routines/adjust-active-routine';
import type { AnswerAccountNudge, ReadAccountNudge } from '@/domain/usecases/auth/account-nudge';
import type { ObserveSessionLoss } from '@/domain/usecases/auth/observe-session-loss';
import type { ContinueAfterAuth } from '@/domain/usecases/auth/continue-after-auth';
import type { ReadAccount } from '@/domain/usecases/auth/read-account';
import type { CompletePasswordRecovery } from '@/domain/usecases/auth/complete-password-recovery';
import type { OpenRecoveryLink } from '@/domain/usecases/auth/open-recovery-link';
import type { RequestPasswordReset } from '@/domain/usecases/auth/request-password-reset';
import type { ContinueWithGoogle } from '@/domain/usecases/auth/continue-with-google';
import type { SignIn } from '@/domain/usecases/auth/sign-in';
import type { SignUp } from '@/domain/usecases/auth/sign-up';
import type { KeepBackedUp } from '@/domain/usecases/sync/keep-backed-up';
import type {
  CancelGuestUnion,
  FinishGuestUnion,
  ReadPendingUnion,
  StartGuestUnion,
} from '@/domain/usecases/auth/guest-union';
import type { ObserveBackupNotice } from '@/domain/usecases/sync/observe-backup-notice';
import type { ObserveRestoration } from '@/domain/usecases/sync/observe-restoration';
import type { ObserveSyncActivity } from '@/domain/usecases/sync/observe-sync-activity';
import type { ObserveSyncStatus } from '@/domain/usecases/sync/observe-sync-status';
import type { SyncNow } from '@/domain/usecases/sync/sync-now';
import type {
  DiscardRejectedChange,
  ObserveRejectedChanges,
  RetryRejectedChange,
} from '@/domain/usecases/sync/rejected-changes';
import type {
  BackUpBeforeSignOut,
  ConfirmSignOut,
  PrepareSignOut,
} from '@/domain/usecases/auth/sign-out';
import type { AdoptTemplate } from '@/domain/usecases/routines/adopt-template';
import type { AnswerOnboarding } from '@/domain/usecases/onboarding/answer-onboarding';
import type { DeleteRoutine } from '@/domain/usecases/routines/delete-routine';
import type { FinishOnboarding } from '@/domain/usecases/onboarding/finish-onboarding';
import type { ObserveEntry } from '@/domain/usecases/startup/observe-entry';
import type { ObserveExerciseDetail } from '@/domain/usecases/exercises/observe-exercise-detail';
import type { ObserveExercises } from '@/domain/usecases/exercises/observe-exercises';
import type { ObserveNextDay } from '@/domain/usecases/routines/observe-next-day';
import type { ObserveWorkout } from '@/domain/usecases/workout/observe-workout';
import type { ObserveWorkoutInProgress } from '@/domain/usecases/workout/observe-workout-in-progress';
import type { ObserveExerciseProgress } from '@/domain/usecases/progress/observe-exercise-progress';
import type { ObserveHistory } from '@/domain/usecases/progress/observe-history';
import type { ObserveWeeklyVolume } from '@/domain/usecases/progress/observe-weekly-volume';
import type { ObserveWorkoutDetail } from '@/domain/usecases/progress/observe-workout-detail';
import type { ObserveWorkoutSummary } from '@/domain/usecases/workout/observe-workout-summary';
import type {
  AddPastSet,
  DeletePastSet,
  DeleteWorkout,
  UpdatePastSet,
} from '@/domain/usecases/progress/past-workout-edits';
import type {
  AddRestTime,
  AskRestPermission,
  ObserveRestTimer,
  ReadRestPermissions,
  RescheduleRest,
  SkipRest,
  StartRest,
} from '@/domain/usecases/workout/rest-timer';
import type { StartWorkout } from '@/domain/usecases/workout/start-workout';
import type {
  DiscardWorkout,
  FinishWorkout,
  ReadWorkoutResume,
  SubstituteExercise,
} from '@/domain/usecases/workout/workout-lifecycle';
import type {
  DeleteSet,
  LogSet,
  RestoreSet,
  UpdateSet,
} from '@/domain/usecases/workout/workout-sets';
import type { ObserveProfile } from '@/domain/usecases/profile/observe-profile';
import type { ObserveRecommendation } from '@/domain/usecases/onboarding/observe-recommendation';
import type { ObserveRoutines } from '@/domain/usecases/routines/observe-routines';
import type { ObserveTemplate } from '@/domain/usecases/routines/observe-template';
import type {
  EditRoutineDraft,
  LoadRoutineDraft,
  SaveRoutine,
} from '@/domain/usecases/routines/routine-draft';
import type { PrepareLocalData } from '@/domain/usecases/startup/prepare-local-data';
import type { StartAsGuest } from '@/domain/usecases/auth/start-as-guest';
import type { UpdateLoadSetting } from '@/domain/usecases/profile/update-load-setting';
import type { UpdateProfile } from '@/domain/usecases/profile/update-profile';

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
  readAccount: ReadAccount;
  observeSessionLoss: ObserveSessionLoss;
  readAccountNudge: ReadAccountNudge;
  answerAccountNudge: AnswerAccountNudge;
  continueAfterAuth: ContinueAfterAuth;
  signUp: SignUp;
  signIn: SignIn;
  continueWithGoogle: ContinueWithGoogle;
  requestPasswordReset: RequestPasswordReset;
  openRecoveryLink: OpenRecoveryLink;
  completePasswordRecovery: CompletePasswordRecovery;
  prepareSignOut: PrepareSignOut;
  backUpBeforeSignOut: BackUpBeforeSignOut;
  /** RF-SYNC-01: the automatic backup while the app runs. */
  keepBackedUp: KeepBackedUp;
  /** RF-AUTH-05: the union of the guest's data with the account (07 §4.3). */
  readPendingUnion: ReadPendingUnion;
  startGuestUnion: StartGuestUnion;
  finishGuestUnion: FinishGuestUnion;
  cancelGuestUnion: CancelGuestUnion;
  observeSyncStatus: ObserveSyncStatus;
  observeBackupNotice: ObserveBackupNotice;
  observeRestoration: ObserveRestoration;
  observeSyncActivity: ObserveSyncActivity;
  syncNow: SyncNow;
  observeRejectedChanges: ObserveRejectedChanges;
  discardRejectedChange: DiscardRejectedChange;
  retryRejectedChange: RetryRejectedChange;
  confirmSignOut: ConfirmSignOut;
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
  observeExerciseProgress: ObserveExerciseProgress;
  observeWeeklyVolume: ObserveWeeklyVolume;
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
