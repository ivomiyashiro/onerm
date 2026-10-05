import type { ScreenId } from '@/presentation/features/dev/screen-routes';

/**
 * Development-only texts: the screen list and the placeholders of the screens that are not
 * built yet. The screen names are the ones in 08 §2.
 */
export const dev = {
  menuTitle: 'Pantallas',
  menuEntry: 'Pantallas (desarrollo)',
  components: 'Componentes',
  placeholder: 'Esqueleto: se construye en F5–F8.',
  close: 'Cerrar',
  /** RNF-13 on a physical device (#25). */
  benchmark: {
    entry: 'Medir motor (RNF-13)',
    title: 'Medir motor',
    description: (exposures: number, budget: number) =>
      `Calcula la sugerencia de un ejercicio con ${exposures} exposiciones. Tiene que tardar menos de ${budget} ms.`,
    run: 'Medir',
    running: 'Midiendo…',
    median: (ms: string) => `Mediana: ${ms} ms`,
    range: (min: string, max: string, runs: number) =>
      `Mín. ${min} ms · máx. ${max} ms · ${runs} corridas`,
    pass: 'Cumple RNF-13',
    fail: 'No cumple RNF-13',
  },
  screens: {
    S01: 'Bienvenida',
    S02: 'Iniciar sesión',
    S03: 'Crear cuenta',
    S04: 'Recuperar contraseña',
    S05: 'Onboarding',
    S06: 'Recomendación de plantilla',
    S07: 'Inicio: próximo día',
    S08: 'Elegir día',
    S09: 'Entrenamiento en curso',
    S10: '¿Por qué esta sugerencia?',
    S11: 'Sustituir ejercicio',
    S12: 'Resumen del entrenamiento',
    S13: 'Rutinas',
    S14: 'Detalle de plantilla',
    S15: 'Editor de rutina',
    S16: 'Buscador de ejercicios',
    S17: 'Detalle de ejercicio',
    S18: 'Progreso',
    S19: 'Detalle de entrenamiento',
    S20: 'Progreso de ejercicio',
    S21: 'Perfil y ajustes',
    S22: 'Acerca de y créditos',
    S23: 'Restaurando tus datos',
    S24: 'Nueva contraseña',
    S25: 'Cambios que no se pudieron respaldar',
  } satisfies Record<ScreenId, string>,
} as const;
