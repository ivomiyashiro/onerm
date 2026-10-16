/** Tabs (08 §2). */
export const navigation = {
  tabs: {
    home: 'Inicio',
    routines: 'Rutinas',
    progress: 'Progreso',
    profile: 'Perfil',
  },
  /** The central button of the tab bar (13 §10, marca §15). */
  action: {
    start: 'Empezar',
    continue: 'Continuar',
    /** Accessible names of the button (13 §10). */
    startName: (day: string) => `Empezar ${day}`,
    continueName: (time: string) => `Continuar entrenamiento, ${time}`,
    disabledName: 'Empezar, no disponible',
  },
} as const;
