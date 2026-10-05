import type { RoutineTemplate } from '@/domain/models/routine-template';
import type { ExperienceLevel } from '@/domain/models/vocabulary';

/** The notes of 13 §2: «Con 3 días alcanza…» and «Esta rutina es de 4 días…». */
export type RecommendationNote = 'threeDaysAreEnough' | 'fourDayTemplate';

export interface TemplateRecommendation {
  readonly recommended: RoutineTemplate;
  readonly alternative: RoutineTemplate | null;
  readonly note: RecommendationNote | null;
}

/** The catalog has one template per number of days: 2 (PLT-FB2), 3 (PLT-FB3) and 4 (PLT-TP4). */
const byDays = (templates: readonly RoutineTemplate[], days: number) =>
  templates.find((template) => template.daysPerWeek === days) ?? null;

/**
 * RN-PERF-01 (11 §4). Novice: 2 days → 2-day template; 3 or more → 3-day template, with the 4-day
 * one as an alternative from 4 days on (more days don't help a novice, P-02). Intermediate or
 * advanced: the template of their days, up to 4; with 5 or 6 the note says it has 4 days. Null
 * while the catalog has no templates.
 */
export function recommendTemplate(
  templates: readonly RoutineTemplate[],
  profile: { readonly level: ExperienceLevel; readonly daysPerWeek: number },
): TemplateRecommendation | null {
  const { level, daysPerWeek } = profile;
  if (level === 'novice') {
    const recommended = byDays(templates, Math.min(daysPerWeek, 3));
    if (recommended === null) return null;
    return daysPerWeek >= 4
      ? { recommended, alternative: byDays(templates, 4), note: 'threeDaysAreEnough' }
      : { recommended, alternative: null, note: null };
  }
  const recommended = byDays(templates, Math.min(daysPerWeek, 4));
  if (recommended === null) return null;
  return { recommended, alternative: null, note: daysPerWeek >= 5 ? 'fourDayTemplate' : null };
}
