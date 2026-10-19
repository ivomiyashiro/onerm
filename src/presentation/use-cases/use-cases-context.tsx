import { createContext, useContext, type ReactNode } from 'react';

import type { ActivateRoutine } from '@/domain/usecases/activate-routine';
import type { AdjustActiveRoutine } from '@/domain/usecases/adjust-active-routine';
import type { AnswerAccountNudge, ReadAccountNudge } from '@/domain/usecases/account-nudge';
import type { ObserveSessionLoss } from '@/domain/usecases/observe-session-loss';
import type { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import type { ReadAccount } from '@/domain/usecases/read-account';
import type { CompletePasswordRecovery } from '@/domain/usecases/complete-password-recovery';
import type { OpenRecoveryLink } from '@/domain/usecases/open-recovery-link';
import type { RequestPasswordReset } from '@/domain/usecases/request-password-reset';
import type { ContinueWithGoogle } from '@/domain/usecases/continue-with-google';
import type { SignIn } from '@/domain/usecases/sign-in';
import type { SignUp } from '@/domain/usecases/sign-up';
import type { KeepBackedUp } from '@/domain/usecases/keep-backed-up';
import type {
  CancelGuestUnion,
  FinishGuestUnion,
  ReadPendingUnion,
  StartGuestUnion,
} from '@/domain/usecases/guest-union';
import type { ObserveBackupNotice } from '@/domain/usecases/observe-backup-notice';
import type { ObserveRestoration } from '@/domain/usecases/observe-restoration';
import type { ObserveSyncActivity } from '@/domain/usecases/observe-sync-activity';
import type { ObserveSyncStatus } from '@/domain/usecases/observe-sync-status';
import type { SyncNow } from '@/domain/usecases/sync-now';
import type {
  DiscardRejectedChange,
  ObserveRejectedChanges,
  RetryRejectedChange,
} from '@/domain/usecases/rejected-changes';
import type {
  BackUpBeforeSignOut,
  ConfirmSignOut,
  PrepareSignOut,
} from '@/domain/usecases/sign-out';
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
import type { ObserveExerciseProgress } from '@/domain/usecases/observe-exercise-progress';
import type { ObserveHistory } from '@/domain/usecases/observe-history';
import type { ObserveWeeklyVolume } from '@/domain/usecases/observe-weekly-volume';
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
