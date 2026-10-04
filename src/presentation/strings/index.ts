import { auth } from '@/presentation/strings/auth';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { dialogs } from '@/presentation/strings/dialogs';
import { home } from '@/presentation/strings/home';
import { navigation } from '@/presentation/strings/navigation';
import { onboarding } from '@/presentation/strings/onboarding';
import { principles } from '@/presentation/strings/principles';
import { profile } from '@/presentation/strings/profile';
import { progress } from '@/presentation/strings/progress';
import { routines } from '@/presentation/strings/routines';
import { startup } from '@/presentation/strings/startup';
import { suggestions } from '@/presentation/strings/suggestions';
import { workout } from '@/presentation/strings/workout';

/**
 * Every UI text of the app (RNF-21), copied from 13-textos and organized by screen. Texts with
 * `{parameters}` are functions; numbers and loads arrive already formatted.
 */
export const strings = {
  common,
  navigation,
  startup,
  auth,
  onboarding,
  home,
  workout,
  suggestions,
  principles,
  routines,
  catalog,
  progress,
  profile,
  dialogs,
} as const;
