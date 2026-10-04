import { strings } from '@/presentation/strings';

/** Every literal text in the catalog, with its path ("dialogs.D09.title"). */
function literals(node: unknown, path = 'strings'): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (typeof node === 'function' || node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) => literals(value, `${path}.${key}`));
}

describe('strings (13-textos, RNF-21)', () => {
  it.each(literals(strings))('%s is a clean text', (_, text) => {
    expect(text.trim()).toBe(text);
    expect(text).not.toHaveLength(0);
    // 13-textos uses the ellipsis character, never three dots.
    expect(text).not.toContain('...');
  });

  it('has every suggestion reason code of 13 §4', () => {
    expect(Object.keys(strings.suggestions.reasons).sort()).toEqual(
      [
        'CALIBRATION',
        'CALIBRATION_STEP',
        'CALIBRATION_STEP_DOWN',
        'ESTIMATED_FROM_E1RM',
        'FROM_EXERCISE_HISTORY',
        'PRESCRIPTION_CHANGED',
        'REENTRY',
        'DELOAD',
        'CONSOLIDATE',
        'EARLY_INCREASE',
        'HIGH_INCREASE',
        'INCREASE_LOAD',
        'EXTEND_REPS',
        'ADD_REP',
        'COMPLETE_SETS',
        'REPEAT',
        'BODYWEIGHT_CALIBRATION',
        'BODYWEIGHT_ADD_REP',
        'BODYWEIGHT_READY',
      ].sort(),
    );
  });

  it('has the 13 principles of 13 §6', () => {
    expect(Object.keys(strings.principles)).toEqual(
      Array.from({ length: 13 }, (_, i) => `P-${String(i + 1).padStart(2, '0')}`),
    );
  });

  it('has every dialog of 08 §2', () => {
    expect(Object.keys(strings.dialogs)).toEqual([
      'D01',
      'D01b',
      'D02',
      'D03',
      'D05',
      'D06',
      'D07',
      'D08',
      'D09',
      'D10',
      'D11',
      'D12',
      'D13',
      'D14',
      'D15',
      'D16',
      'D17',
    ]);
  });

  describe('texts with parameters build the 13-textos sentence', () => {
    it.each([
      [strings.onboarding.stepOf(2), 'Paso 2 de 3'],
      [strings.home.chooseDay.doneDaysAgo(3), 'Hecho hace 3 días'],
      [strings.workout.set.setOf(2, 3), 'Serie 2 de 3'],
      [strings.workout.rest.nextSet(2, 3, '62,5 kg', 8), 'Siguiente: serie 2 de 3 · 62,5 kg × 8'],
      [strings.workout.validation.load('kg'), 'La carga tiene que estar entre 0 y 1000 kg.'],
      [
        strings.suggestions.reasons.INCREASE_LOAD.novice(3, 12, '65 kg'),
        '¡Completaste 3 × 12! Subimos a 65 kg.',
      ],
      [
        strings.suggestions.reasons.CALIBRATION.novice(8, 12),
        'Primera vez: elegí un peso con el que puedas hacer entre 8 y 12 con buena técnica.',
      ],
      [strings.suggestions.why.title('62,5 kg', 8), '¿Por qué 62,5 kg × 8?'],
      [strings.profile.sync.pendingOffline(3), '3 cambios sin respaldar · sin conexión'],
      [strings.profile.sync.synced('2 min'), 'Respaldado · hace 2 min'],
      [strings.dialogs.D09.body(9), 'Se borran las 9 series registradas.'],
      [
        strings.dialogs.D01b.body(4, 1, false),
        'Se van a borrar de este teléfono 4 entrenamientos y 1 rutinas. No se puede deshacer.',
      ],
      [
        strings.dialogs.D01b.body(4, 1, true),
        'Se van a borrar de este teléfono 4 entrenamientos y 1 rutinas, y el entrenamiento en curso. No se puede deshacer.',
      ],
      [
        strings.dialogs.D12.body('Falta el ejercicio', null),
        'Falta el ejercicio. Si lo descartás, vuelve a la versión guardada.',
      ],
      [
        strings.dialogs.D12.body('Falta el ejercicio', 3),
        'Falta el ejercicio. Si lo descartás, se borra junto con 3 registros que dependen de él.',
      ],
      [
        strings.dialogs.D14.body('signOut'),
        'Tenés un entrenamiento en curso. Finalizalo o descartalo para cerrar sesión.',
      ],
      [strings.dialogs.D16.title('workout'), '¿Eliminar este entrenamiento?'],
      [
        strings.dialogs.D16.body('workout', 12),
        'Se eliminan el entrenamiento y sus 12 series. Tus sugerencias se recalculan.',
      ],
      [strings.dialogs.D16.body('set'), 'Se elimina la serie. Tus sugerencias se recalculan.'],
      [
        strings.auth.errors.offline('crear una cuenta'),
        'Necesitás conexión para crear una cuenta. Podés seguir entrenando sin cuenta.',
      ],
    ])('%s', (actual, expected) => {
      expect(actual).toBe(expected);
    });
  });
});
