import { anExercise } from '@/domain/testing/builders';
import { substituteOptions } from '@/domain/rules/workout/substitute-options';

const MACHINE_PRESS = anExercise({
  id: 'machine-press',
  name: 'Press de pecho en máquina',
  primaryMuscles: ['chest'],
});
const CABLE_PRESS = anExercise({
  id: 'cable-press',
  name: 'Press de pecho en polea',
  primaryMuscles: ['chest'],
});
const FLY = anExercise({
  id: 'fly',
  name: 'Aperturas en máquina',
  primaryMuscles: ['chest', 'shoulders'],
});
const ROW = anExercise({ id: 'row', name: 'Remo sentado en polea', primaryMuscles: ['back'] });
const OLD = anExercise({
  id: 'old',
  name: 'Press viejo',
  primaryMuscles: ['chest'],
  deprecatedAt: new Date('2026-01-01T00:00:00Z'),
});
const CATALOG = [ROW, FLY, CABLE_PRESS, MACHINE_PRESS, OLD];

describe('substituteOptions', () => {
  it('RF-ENT-09.AC1: the same primary muscle first, then the rest, without the original', () => {
    expect(substituteOptions(CATALOG, 'machine-press', '')).toEqual({
      sameMuscle: [FLY, CABLE_PRESS],
      others: [ROW],
    });
  });

  it('RF-ENT-09.AC1: any other can be searched (RN-CAT-02)', () => {
    expect(substituteOptions(CATALOG, 'machine-press', 'polea')).toEqual({
      sameMuscle: [CABLE_PRESS],
      others: [ROW],
    });
  });

  it('an original not in the local catalog yet has no same-muscle group (RN-CAT-04)', () => {
    expect(substituteOptions(CATALOG, 'missing', 'press')).toEqual({
      sameMuscle: [],
      others: [MACHINE_PRESS, CABLE_PRESS],
    });
  });
});
