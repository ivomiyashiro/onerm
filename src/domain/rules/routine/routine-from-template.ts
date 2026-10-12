import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { RoutineTemplate } from '@/domain/models/routine-template';
import type { Id } from '@/domain/models/vocabulary';
import { sortByPosition } from '@/domain/rules/position-order';
import { prescriptionFor } from '@/domain/rules/routine/prescription-defaults';

/**
 * RN-RUT-03: adopting a template copies it into a routine of the user, with new ids (RN-SYNC-02),
 * so a later change to the template never reaches it. The prescription is computed for the
 * profile's goal and level (RN-PERF-03).
 */
export function routineFromTemplate(
  template: RoutineTemplate,
  profile: Pick<Profile, 'goal' | 'level'>,
  newId: () => Id,
): Routine {
  const routineId = newId();
  return {
    id: routineId,
    name: template.name,
    sourceTemplateId: template.id,
    days: sortByPosition(template.days).map((day) => {
      const dayId = newId();
      return {
        id: dayId,
        routineId,
        name: day.name,
        position: day.position,
        exercises: sortByPosition(day.exercises).map((exercise) => ({
          id: newId(),
          routineDayId: dayId,
          exerciseId: exercise.exerciseId,
          position: exercise.position,
          prescription: prescriptionFor(exercise, profile),
          notes: null,
        })),
      };
    }),
  };
}
