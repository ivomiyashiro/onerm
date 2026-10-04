/**
 * Dialogs D01–D17 (13 §8). The highlighted action is listed first, as on screen; the
 * destructive ones are marked in the name.
 */
export const dialogs = {
  D01: {
    title: '¿Sumamos tus datos a la cuenta?',
    body: (workouts: number, routines: number) =>
      `En este teléfono tenés ${workouts} entrenamientos y ${routines} rutinas. Podés sumarlos a tu cuenta o descartarlos.`,
    merge: 'Sumar a mi cuenta',
    discard: 'Descartar',
    cancel: 'Cancelar',
  },
  D01b: {
    title: '¿Descartar tus datos?',
    body: (workouts: number, routines: number, withWorkoutInProgress: boolean) =>
      `Se van a borrar de este teléfono ${workouts} entrenamientos y ${routines} rutinas${
        withWorkoutInProgress ? ', y el entrenamiento en curso' : ''
      }. No se puede deshacer.`,
    cancel: 'Cancelar',
    discardDestructive: 'Descartar',
  },
  D02: {
    title: 'Tenés un entrenamiento sin terminar',
    body: (date: string, sets: number) => `Lo empezaste el ${date} y registraste ${sets} series.`,
    finish: 'Finalizarlo',
    continue: 'Continuar',
    discard: 'Descartar',
  },
  D03: {
    title: (n: number) => `Tenés ${n} cambios sin respaldar`,
    body: 'Si cerrás sesión ahora, se pierden. Conectate para respaldarlos antes.',
    cancel: 'Cancelar',
    signOutDestructive: 'Cerrar sesión igual',
  },
  D05: {
    title: 'Te avisamos cuando termine el descanso',
    body: 'Así podés guardar el teléfono y te avisamos aunque la pantalla esté bloqueada.',
    allow: 'Permitir',
    notNow: 'Ahora no',
  },
  D06: {
    title: '¿Ajustamos tu rutina?',
    body: (goal: string) =>
      `Cambiaste tu objetivo a ${goal}. Podemos actualizar repeticiones, esfuerzo y descansos. Tus ejercicios y su orden no cambian.`,
    adjust: 'Ajustar',
    keep: 'Dejar como está',
  },
  D07: {
    title: (routine: string) => `¿Usar ${routine} como tu rutina?`,
    body: (currentRoutine: string) =>
      `${currentRoutine} queda guardada en Mis rutinas con todo su historial.`,
    use: 'Usar esta rutina',
    cancel: 'Cancelar',
  },
  D08: {
    title: '¿Salir sin guardar?',
    body: 'Vas a perder los cambios en esta rutina.',
    keepEditing: 'Seguir editando',
    leave: 'Salir sin guardar',
  },
  D09: {
    title: '¿Descartar el entrenamiento?',
    body: (sets: number) => `Se borran las ${sets} series registradas.`,
    cancel: 'Cancelar',
    discardDestructive: 'Descartar',
  },
  D10: {
    title: (n: number) => `Te faltan ${n} ejercicios`,
    body: 'Los que no hiciste quedan como salteados.',
    finish: 'Finalizar igual',
    keepTraining: 'Seguir entrenando',
  },
  D11: {
    title: (routine: string) => `¿Eliminar ${routine}?`,
    body: 'Tus entrenamientos con esta rutina se conservan en el historial.',
    cancel: 'Cancelar',
    deleteDestructive: 'Eliminar',
  },
  D12: {
    title: 'No pudimos respaldar un cambio',
    /** `dependents` is null when the change was uploaded before: it goes back to that version. */
    body: (detail: string, dependents: number | null) =>
      `${detail}. Si lo descartás, ${
        dependents === null
          ? 'vuelve a la versión guardada'
          : `se borra junto con ${dependents} registros que dependen de él`
      }.`,
    retry: 'Reintentar',
    discardDestructive: 'Descartar este cambio',
    close: 'Cerrar',
  },
  D13: {
    title: 'Guardá tu progreso',
    body: 'Tus datos están solo en este teléfono. Creá una cuenta gratis para no perderlos.',
    createAccount: 'Crear cuenta',
    notNow: 'Ahora no',
  },
  D14: {
    title: 'Terminá tu entrenamiento primero',
    body: (action: 'signOut' | 'changeRoutine' | 'deleteRoutine') =>
      `Tenés un entrenamiento en curso. Finalizalo o descartalo para ${
        {
          signOut: 'cerrar sesión',
          changeRoutine: 'cambiar de rutina',
          deleteRoutine: 'eliminar esta rutina',
        }[action]
      }.`,
    goToWorkout: 'Ir al entrenamiento',
    cancel: 'Cancelar',
  },
  D15: {
    title: (routine: string) => `¿Empezar a usar ${routine}?`,
    body: 'La vas a ver en Inicio como tu rutina actual.',
    activate: 'Activar',
    notNow: 'Ahora no',
  },
  D16: {
    title: (target: 'set' | 'workout') =>
      target === 'set' ? '¿Eliminar esta serie?' : '¿Eliminar este entrenamiento?',
    /** `sets` is the number of sets of the deleted workout; ignored for a set. */
    body: (target: 'set' | 'workout', sets = 0) =>
      `${
        target === 'set'
          ? 'Se elimina la serie.'
          : `Se eliminan el entrenamiento y sus ${sets} series.`
      } Tus sugerencias se recalculan.`,
    cancel: 'Cancelar',
    deleteDestructive: 'Eliminar',
  },
  D17: {
    title: 'Para avisarte justo a tiempo',
    body: 'Sin este permiso no podemos avisarte con la pantalla bloqueada. Activá «Alarmas y recordatorios» para OneRM.',
    openSettings: 'Abrir ajustes',
    notNow: 'Ahora no',
  },
} as const;
