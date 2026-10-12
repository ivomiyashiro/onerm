import { anExercise } from '@/domain/testing/builders';
import { NO_FILTERS, searchExercises } from '@/domain/rules/catalog-search';

const BENCH = anExercise({
  id: 'bench',
  name: 'Press de banca con barra',
  aliases: ['Bench press'],
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps', 'shoulders'],
  primaryEquipment: 'barbell',
  equipment: ['barbell'],
});
const PUSHDOWN = anExercise({
  id: 'pushdown',
  name: 'Extensión de tríceps en polea',
  aliases: ['Triceps pushdown'],
  primaryMuscles: ['triceps'],
  secondaryMuscles: [],
  primaryEquipment: 'cable',
  equipment: ['cable'],
});
const LAT_PULLDOWN = anExercise({
  id: 'lat-pulldown',
  name: 'Jalón al pecho',
  aliases: ['Lat pulldown'],
  primaryMuscles: ['back'],
  secondaryMuscles: ['biceps'],
  primaryEquipment: 'cable',
  equipment: ['cable', 'machine'],
});
const DUMBBELL_ROW = anExercise({
  id: 'dumbbell-row',
  name: 'Remo con mancuerna a una mano',
  primaryMuscles: ['back'],
  secondaryMuscles: ['biceps'],
  primaryEquipment: 'dumbbell',
  equipment: ['dumbbell'],
});
const CATALOG = [PUSHDOWN, BENCH, LAT_PULLDOWN, DUMBBELL_ROW];

function ids(query: string, filters = NO_FILTERS, catalog = CATALOG) {
  return searchExercises(catalog, { query, ...filters }).map((e) => e.id);
}

describe('RF-CAT-01 · searchExercises', () => {
  it('without a query or filters lists the whole catalog by name', () => {
    expect(ids('')).toEqual(['pushdown', 'lat-pulldown', 'bench', 'dumbbell-row']);
  });

  it('RF-CAT-01.AC1: matches the words of the name, in any order', () => {
    expect(ids('banca press')).toEqual(['bench']);
  });

  it('RF-CAT-01.AC1: every word has to appear', () => {
    expect(ids('press remo')).toEqual([]);
  });

  it('RF-CAT-01.AC1: matches part of a word while typing', () => {
    expect(ids('ban')).toEqual(['bench']);
  });

  it('RF-CAT-01.AC1: matches an alias', () => {
    expect(ids('pulldown')).toEqual(['lat-pulldown']);
    expect(ids('bench')).toEqual(['bench']);
  });

  it('RF-CAT-01.AC1: a word can match the name and another one an alias (RN-CAT-02)', () => {
    expect(ids('jalon lat')).toEqual(['lat-pulldown']);
  });

  it('RF-CAT-01.AC2: ignores accents and case (RN-CAT-02)', () => {
    expect(ids('EXTENSION triceps')).toEqual(['pushdown']);
    expect(ids('jalón')).toEqual(['lat-pulldown']);
  });

  it('RF-CAT-01.AC2: ignores extra spaces', () => {
    expect(ids('  press   banca ')).toEqual(['bench']);
  });

  it('RF-CAT-01.AC3: filters by primary muscle only', () => {
    expect(ids('', { muscles: ['triceps'], equipment: [] })).toEqual(['pushdown']);
  });

  it('RF-CAT-01.AC3: muscle and equipment have to match both', () => {
    expect(ids('', { muscles: ['back'], equipment: ['cable'] })).toEqual(['lat-pulldown']);
  });

  it('RF-CAT-01.AC3: equipment uses the equipment list, not only the primary one', () => {
    expect(ids('', { muscles: [], equipment: ['machine'] })).toEqual(['lat-pulldown']);
  });

  it('RF-CAT-01.AC3: values of the same filter add up', () => {
    expect(ids('', { muscles: ['chest', 'triceps'], equipment: [] })).toEqual([
      'pushdown',
      'bench',
    ]);
  });

  it('RF-CAT-01.AC3: filters combine with the text', () => {
    expect(ids('remo', { muscles: ['back'], equipment: [] })).toEqual(['dumbbell-row']);
  });

  it('RF-CAT-01.AC4: no match gives an empty list', () => {
    expect(ids('press francés pierna')).toEqual([]);
  });

  it('RF-CAT-01.AC5: deprecated exercises are not found (RN-CAT-01)', () => {
    const deprecated = anExercise({
      id: 'old-bench',
      name: 'Press de banca viejo',
      deprecatedAt: new Date('2026-01-01T00:00:00Z'),
    });

    expect(ids('press', NO_FILTERS, [BENCH, deprecated])).toEqual(['bench']);
    expect(ids('', NO_FILTERS, [deprecated])).toEqual([]);
  });
});
