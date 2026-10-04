import { count } from '@/presentation/strings/plural';

/** "3 entrenamientos y 2 rutinas", leaving out a part in zero (13 §1 «Plurales»). */
function guestData(workouts: number, routines: number): string {
  return [
    workouts > 0 && count(workouts, 'entrenamiento', 'entrenamientos'),
    routines > 0 && count(routines, 'rutina', 'rutinas'),
  ]
    .filter(Boolean)
    .join(' y ');
}

function dependentsClause(dependents: number | null): string {
  if (dependents === null) return 'vuelve a la versión guardada';
  if (dependents === 0) return 'se borra';
  return dependents === 1
    ? 'se borra junto con 1 registro que depende de él'
    : `se borra junto con ${dependents} registros que dependen de él`;
}

function deletedWorkout(sets: number): string {
  if (sets === 0) return 'Se elimina el entrenamiento.';
  if (sets === 1) return 'Se eliminan el entrenamiento y su serie.';
  return `Se eliminan el entrenamiento y sus ${sets} series.`;
}

/**
 * Dialogs D01–D17 (13 §8). The highlighted action is listed first, as on screen; the
 * destructive ones are marked in the name. Counts follow 13 §1 «Plurales».
 */
export const dialogs = {
  D01: {
    title: '¿Sumamos tus datos a la cuenta?',
    body: (workouts: number, routines: number) =>
      `En este teléfono tenés ${guestData(workouts, routines)}. Podés sumarlos a tu cuenta o descartarlos.`,
    merge: 'Sumar a mi cuenta',
    discard: 'Descartar',
    cancel: 'Cancelar',
  },
  D01b: {
    title: '¿Descartar tus datos?',
    body: (workouts: number, routines: number, withWorkoutInProgress: boolean) =>
      `Se van a borrar de este teléfono ${guestData(workouts, routines)}${
        withWorkoutInProgress ? ', y el entrenamiento en curso' : ''
      }. No se puede deshacer.`,
    cancel: 'Cancelar',
    discardDestructive: 'Descartar',
  },
  D02: {
    title: 'Tenés un entrenamiento sin terminar',
    body: (date: string, sets: number) =>
      sets === 0
        ? `Lo empezaste el ${date} y todavía no registraste series.`
        : `Lo empezaste el ${date} y registraste ${count(sets, 'serie', 'series')}.`,
    finish: 'Finalizarlo',
    continue: 'Continuar',
    discard: 'Descartar',
  },
  D03: {
    title: (n: number) => `Tenés ${count(n, 'cambio', 'cambios')} sin respaldar`,
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
    body: (sets: number) => {
      if (sets === 0) return 'Se descarta el entrenamiento, que no tiene series.';
      if (sets === 1) return 'Se borra la serie registrada.';
      return `Se borran las ${sets} series registradas.`;
    },
    cancel: 'Cancelar',
    discardDestructive: 'Descartar',
  },
  D10: {
    title: (n: number) => (n === 1 ? 'Te falta 1 ejercicio' : `Te faltan ${n} ejercicios`),
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
      `${detail}. Si lo descartás, ${dependentsClause(dependents)}.`,
    retry: 'Reintentar',
    discardDestructive: 'Descartar este cambio',
    close: 'Cerrar',
  },
  D13: {
    title: 'Guardá tu progreso',
    body: 'Tus datos solo están en este teléfono. Creá una cuenta gratis para no perderlos.',
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
    body: (target: 'set' | 'workout', sets?: number) =>
      `${target === 'set' ? 'Se elimina la serie.' : deletedWorkout(sets ?? 0)} Tus sugerencias se recalculan.`,
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
