import { useEffect, useRef, useState } from 'react';

import type { AccountState } from '@/domain/models/account';
import type { Profile } from '@/domain/models/profile';
import type { ExperienceLevel, TrainingGoal } from '@/domain/models/vocabulary';
import type { ProfileChanges } from '@/domain/rules/profile/profile-changes';
import { useAppStore } from '@/presentation/state/app-store-context';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type ProfileState =
  { status: 'loading' } | { status: 'content'; profile: Profile } | { status: 'error' };

/** The settings of S21 that open a sheet (marca §14). */
export type Setting = 'level' | 'goal' | 'days' | 'unit' | 'effort';

/** The open sheet and the value chosen in it, saved only with «Guardar». */
export interface SettingSheet {
  setting: Setting;
  draft: ProfileChanges;
}

/** What the person has to decide before signing out (RF-AUTH-07): D14 or D03. */
export type SignOutDialog = { kind: 'workoutInProgress' } | { kind: 'pending'; count: number };

export interface ProfileViewModel {
  state: ProfileState;
  /** The account block of S21 (RF-AUTH-01.AC4, RF-AUTH-06). */
  account: AccountState;
  signOutDialog: SignOutDialog | null;
  /** RF-AUTH-07.AC2: the pending changes are being uploaded before signing out. */
  backingUp: boolean;
  sheet: SettingSheet | null;
  /** D06 after a new goal or level (RF-PERF-03.AC2). */
  dialog: AdjustDialog | null;
  actions: {
    open(setting: Setting): void;
    choose(draft: ProfileChanges): void;
    save(): Promise<void>;
    close(): void;
    /** D06 «Ajustar». */
    adjust(): Promise<void>;
    /** D06 «Dejar como está». */
    keep(): void;
    retry(): void;
    /**
     * «Cerrar sesión»: D14 if a workout is in progress; with pending changes, back them up first
     * and D03 if some are left; else out.
     */
    signOut(): Promise<void>;
    /** D03 «Cerrar sesión igual». */
    confirmSignOut(): Promise<void>;
    closeSignOutDialog(): void;
  };
}

/** D06 names what changed: the goal or the level. */
export type AdjustDialog =
  { kind: 'adjust'; goal: TrainingGoal } | { kind: 'adjust'; level: ExperienceLevel };

/** What each sheet edits, from the stored profile. */
const CURRENT: Record<Setting, (profile: Profile) => ProfileChanges> = {
  level: ({ level }) => ({ level }),
  goal: ({ goal }) => ({ goal }),
  days: ({ daysPerWeek }) => ({ daysPerWeek }),
  unit: ({ unit }) => ({ unit }),
  effort: ({ effortMode }) => ({ effortMode }),
};

/** S21 · Perfil (RF-PERF-03..05): each setting is saved locally at once. */
export function useProfileViewModel(): ProfileViewModel {
  const {
    observeProfile,
    updateProfile,
    adjustActiveRoutine,
    prepareSignOut,
    backUpBeforeSignOut,
    confirmSignOut,
  } = useUseCases();
  const account = useAppStore((s) => s.account);
  const setAccount = useAppStore((s) => s.setAccount);
  const [signOutDialog, setSignOutDialog] = useState<SignOutDialog | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [sheet, setSheet] = useState<SettingSheet | null>(null);
  const [dialog, setDialog] = useState<ProfileViewModel['dialog']>(null);
  // Changing it re-runs the effect, which subscribes again.
  const [attempt, setAttempt] = useState(0);
  // A ref, not state: two taps in the same frame must save only once.
  const saving = useRef(false);

  useEffect(
    () =>
      observeProfile.execute({
        // The tabs only exist once the onboarding created the profile (08 §3).
        next: (profile) =>
          setState(profile === null ? { status: 'error' } : { status: 'content', profile }),
        error: () => setState({ status: 'error' }),
      }),
    [observeProfile, attempt],
  );

  function open(setting: Setting) {
    if (state.status !== 'content') return;
    setSheet({ setting, draft: CURRENT[setting](state.profile) });
  }

  function choose(draft: ProfileChanges) {
    setSheet((current) => current && { ...current, draft });
  }

  async function save() {
    if (sheet === null || state.status !== 'content' || saving.current) return;
    saving.current = true;
    try {
      const { offerAdjust } = await updateProfile.execute(sheet.draft);
      setSheet(null);
      const { goal, level } = sheet.draft;
      if (offerAdjust && goal !== undefined) setDialog({ kind: 'adjust', goal });
      else if (offerAdjust && level !== undefined) setDialog({ kind: 'adjust', level });
    } catch {
      // A failed local write: the sheet stays open, and «Guardar» tries again.
    } finally {
      saving.current = false;
    }
  }

  async function adjust() {
    setDialog(null);
    try {
      await adjustActiveRoutine.execute();
    } catch {
      // A failed local write leaves the routine as it was; D06 can be offered again later.
    }
  }

  async function leave() {
    try {
      const result = await confirmSignOut.execute();
      if (result.status === 'blockedByWorkout') setSignOutDialog({ kind: 'workoutInProgress' });
      else {
        setSignOutDialog(null);
        setAccount({ kind: 'guest' });
      }
    } catch {
      // A failed local step leaves the account as it was; «Cerrar sesión» tries again.
    }
  }

  async function signOut() {
    if (backingUp) return;
    try {
      let plan = await prepareSignOut.execute();
      if (plan.kind === 'pending') {
        setBackingUp(true);
        try {
          plan = await backUpBeforeSignOut.execute();
        } finally {
          setBackingUp(false);
        }
      }
      if (plan.kind === 'blockedByWorkout') setSignOutDialog({ kind: 'workoutInProgress' });
      else if (plan.kind === 'pending') setSignOutDialog({ kind: 'pending', count: plan.count });
      else await leave();
    } catch {
      // The plan couldn't be read: nothing is signed out.
    }
  }

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  return {
    state,
    account,
    signOutDialog,
    backingUp,
    sheet,
    dialog,
    actions: {
      open,
      choose,
      save,
      close: () => setSheet(null),
      adjust,
      keep: () => setDialog(null),
      retry,
      signOut,
      confirmSignOut: leave,
      closeSignOutDialog: () => setSignOutDialog(null),
    },
  };
}
