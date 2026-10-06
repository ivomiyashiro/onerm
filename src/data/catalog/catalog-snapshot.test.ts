import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import type { RoutineTemplate } from '@/domain/models/routine-template';
import { EQUIPMENT, MUSCLES } from '@/domain/models/vocabulary';
import { recommendTemplate } from '@/domain/rules/routine/template-recommendation';

const { exercises, templates } = CATALOG_SNAPSHOT;
const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

function template(id: string): RoutineTemplate {
  const found = templates.find((t) => t.id === id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
}

const setsPerDay = (id: string) =>
  template(id).days.map((day) => day.exercises.reduce((total, e) => total + e.sets, 0));

const exerciseNames = (id: string, day: number) =>
  template(id).days[day].exercises.map((e) => exerciseById.get(e.exerciseId)?.name);

describe('catalog snapshot: exercises (ADR-0004, RN-CAT-03)', () => {
  it('has the 22 exercises the templates use', () => {
    expect(exercises).toHaveLength(22);
    const used = new Set(
      templates.flatMap((t) => t.days.flatMap((d) => d.exercises)).map((e) => e.exerciseId),
    );
    expect([...used].sort()).toEqual(exercises.map((e) => e.id).sort());
  });

  it('ids are UUIDs and ids and slugs are unique', () => {
    for (const exercise of exercises) {
      expect(exercise.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
    expect(new Set(exercises.map((e) => e.slug)).size).toBe(exercises.length);
  });

  it.each(exercises.map((e) => [e.name, e] as const))(
    '%s uses the controlled vocabularies',
    (_, exercise) => {
      expect(exercise.loadType).toBe('external'); // C-07
      expect(exercise.equipment).toContain(exercise.primaryEquipment);
      for (const equipment of exercise.equipment) expect(EQUIPMENT).toContain(equipment);
      expect(exercise.primaryMuscles.length).toBeGreaterThan(0);
      for (const muscle of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) {
        expect(MUSCLES).toContain(muscle);
      }
      expect(exercise.deprecatedAt).toBeNull();
    },
  );

  it('the unilateral ones are the one-arm row and the Bulgarian split squat (11 §3)', () => {
    expect(
      exercises
        .filter((e) => e.isUnilateral)
        .map((e) => e.name)
        .sort(),
    ).toEqual(['Remo con mancuerna a una mano', 'Sentadilla búlgara con mancuernas']);
  });
});

describe('catalog snapshot: templates (11 §3)', () => {
  it('has PLT-FB2, PLT-FB3 and PLT-TP4 with their days per week and level', () => {
    expect(templates.map((t) => [t.id, t.daysPerWeek, t.level])).toEqual([
      ['PLT-FB2', 2, 'novice'],
      ['PLT-FB3', 3, 'novice'],
      ['PLT-TP4', 4, 'intermediate'],
    ]);
  });

  it('PLT-FB3 day A and day B, in order', () => {
    expect(exerciseNames('PLT-FB3', 0)).toEqual([
      'Prensa de piernas',
      'Press de pecho en máquina',
      'Remo sentado en polea',
      'Peso muerto rumano con mancuernas',
      'Press de hombros con mancuernas (sentado)',
      'Curl de bíceps con mancuernas',
    ]);
    expect(exerciseNames('PLT-FB3', 1)).toEqual([
      'Sentadilla goblet con mancuerna',
      'Jalón al pecho',
      'Press inclinado con mancuernas',
      'Curl femoral sentado',
      'Remo con mancuerna a una mano',
      'Extensión de tríceps en polea',
    ]);
  });

  it('PLT-FB2 has the same days as PLT-FB3', () => {
    expect([exerciseNames('PLT-FB2', 0), exerciseNames('PLT-FB2', 1)]).toEqual([
      exerciseNames('PLT-FB3', 0),
      exerciseNames('PLT-FB3', 1),
    ]);
  });

  it('PLT-TP4 rotates Torso A → Pierna A → Torso B → Pierna B', () => {
    expect(template('PLT-TP4').days.map((d) => d.name)).toEqual([
      'Torso A',
      'Pierna A',
      'Torso B',
      'Pierna B',
    ]);
    expect(exerciseNames('PLT-TP4', 3)).toEqual([
      'Sentadilla goblet con mancuerna',
      'Hip thrust con barra',
      'Extensión de cuádriceps',
      'Curl femoral tumbado',
      'Elevación de talones sentado',
    ]);
  });

  it.each([
    ['PLT-FB3', [17, 16]],
    ['PLT-FB2', [20, 19]],
    ['PLT-TP4', [16, 14, 16, 14]],
  ])('%s has the sets per session of 11 §3', (id, sets) => {
    expect(setsPerDay(id)).toEqual(sets);
  });

  it('PLT-FB2 has 4 sets in the mains and A5 in 2 sets', () => {
    const [dayA] = template('PLT-FB2').days;
    expect(dayA.exercises.map((e) => [e.role, e.sets])).toEqual([
      ['main', 4],
      ['main', 4],
      ['main', 4],
      ['main', 4],
      ['accessory', 2],
      ['accessory', 2],
    ]);
  });

  it.each(templates.map((t) => [t.id, t] as const))(
    '%s has a unilateral exercise (C-09)',
    (_, t) => {
      const all = t.days.flatMap((d) => d.exercises);
      expect(all.some((e) => exerciseById.get(e.exerciseId)?.isUnilateral)).toBe(true);
    },
  );

  it('positions, ids and the «¿Por qué esta rutina?» text are set', () => {
    for (const t of templates) {
      expect(t.rationale.length).toBeGreaterThan(0);
      expect(t.days.map((d) => d.position)).toEqual(t.days.map((_, i) => i + 1));
      for (const day of t.days) {
        expect(day.exercises.map((e) => e.position)).toEqual(day.exercises.map((_, i) => i + 1));
      }
    }
    const ids = templates.flatMap((t) => [
      t.id,
      ...t.days.flatMap((d) => [d.id, ...d.exercises.map((e) => e.id)]),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('RN-PERF-01 finds a template for every number of days', () => {
    for (const level of ['novice', 'intermediate'] as const) {
      for (let daysPerWeek = 2; daysPerWeek <= 6; daysPerWeek += 1) {
        expect(recommendTemplate(templates, { level, daysPerWeek })).not.toBeNull();
      }
    }
  });
});
