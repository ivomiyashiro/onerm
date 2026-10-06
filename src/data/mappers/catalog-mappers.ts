import type {
  exercises,
  routineTemplates,
  templateDays,
  templateExercises,
} from '@/data/db/schema';
import type { Exercise } from '@/domain/models/exercise';
import type { RoutineTemplate, TemplateDay } from '@/domain/models/routine-template';
import { sortByPosition } from '@/domain/rules/position-order';

type ExerciseRow = typeof exercises.$inferSelect;
type TemplateRow = typeof routineTemplates.$inferSelect;
type TemplateDayRow = typeof templateDays.$inferSelect;
type TemplateExerciseRow = typeof templateExercises.$inferSelect;

/** Row → catalog exercise (ADR-0004). Times are ms in the database and `Date` in the domain. */
export function toExercise({ deprecatedAt, ...row }: ExerciseRow): Exercise {
  return { ...row, deprecatedAt: deprecatedAt === null ? null : new Date(deprecatedAt) };
}

/** Rows → templates with their days and exercises, ordered by `(position, id)` (I-10). */
export function toRoutineTemplates(
  templates: readonly TemplateRow[],
  days: readonly TemplateDayRow[],
  exercises: readonly TemplateExerciseRow[],
): RoutineTemplate[] {
  const exercisesByDay = groupBy(exercises, (exercise) => exercise.templateDayId);
  const daysByTemplate = groupBy(days, (day) => day.templateId);

  return templates.map((template) => ({
    ...template,
    days: sortByPosition(daysByTemplate.get(template.id) ?? []).map(
      ({ templateId: _, ...day }): TemplateDay => ({
        ...day,
        exercises: sortByPosition(exercisesByDay.get(day.id) ?? []).map(
          ({ templateDayId: __, ...exercise }) => exercise,
        ),
      }),
    ),
  }));
}

export function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}
