import { count } from '@/presentation/strings/plural';

/**
 * Suggestion reasons (13 §4): a short line for novices and for advanced users, and the detail of
 * S10 «¿Por qué?». Loads arrive already formatted with their unit ("62,5 kg").
 */
export const suggestions = {
  reasons: {
    CALIBRATION: {
      novice: (floor: number, cap: number) =>
        `Primera vez: elegí un peso con el que puedas hacer entre ${floor} y ${cap} con buena técnica.`,
      advanced: (floor: number, cap: number) =>
        `Calibración: elegí una carga para ${floor}–${cap}.`,
      detail: () =>
        'Todavía no tenemos datos tuyos en este ejercicio. Con esta serie estimamos tu peso de trabajo.',
    },
    CALIBRATION_STEP: {
      novice: (load: string) => `Te sobró bastante: probá con ${load}.`,
      advanced: (rtf: number, load: string) => `Carga liviana (RTF ${rtf}): +20 % → ${load}.`,
      detail: (reps: number, rir: number) =>
        `Hiciste ${reps} y te sobraban ${rir} o más. Subimos para encontrar tu peso real.`,
    },
    CALIBRATION_STEP_DOWN: {
      novice: (load: string) => `Era mucho peso: probá con ${load}.`,
      advanced: (load: string) => `0 reps: −20 % → ${load}.`,
      detail: () =>
        'No pudiste completar ninguna repetición. Bajamos para encontrar tu peso de trabajo.',
    },
    ESTIMATED_FROM_E1RM: {
      novice: (exercise: string, date: string) =>
        `Calculado a partir de lo que hiciste en ${exercise} el ${date}.`,
      advanced: (e1rm: string, date: string) => `Estimado desde e1RM ${e1rm} (${date}).`,
      detail: (
        load: string,
        reps: number,
        e1rm: string,
        floor: number,
        targetRir: number,
        suggested: string,
      ) =>
        `Tu mejor serie reciente (${load} × ${reps}) indica un máximo estimado de ${e1rm}. Para ${floor} repeticiones dejando ${targetRir} en reserva, corresponde ${suggested}.`,
    },
    FROM_EXERCISE_HISTORY: {
      novice: () => 'Arrancamos con el peso que usaste la última vez.',
      advanced: (workingLoad: string) => `Última W: ${workingLoad}.`,
      detail: () =>
        'No pudimos estimar tu máximo con esas series, así que repetimos tu último peso de trabajo.',
    },
    PRESCRIPTION_CHANGED: {
      novice: (floor: number, cap: number) =>
        `Cambiaste el rango: recalculamos tu peso para ${floor}–${cap}.`,
      advanced: (e1rm: string) => `Nueva prescripción: recalculado desde e1RM ${e1rm}.`,
      detail: (floor: number, cap: number) =>
        `Tu rutina ahora pide ${floor}–${cap} repeticiones. Recalculamos para no pedirte un peso que no corresponde.`,
    },
    REENTRY: {
      novice: (days: number) => `Volvés después de ${days} días: arrancamos un poco más liviano.`,
      advanced: (days: number, percent: number) => `Reentrada (${days} días): −${percent} %.`,
      detail: () =>
        'Después de una pausa la fuerza baja un poco. Retomamos más liviano y volvés a subir rápido.',
    },
    DELOAD: {
      novice: (n: number) =>
        `Hace ${count(n, 'vez', 'veces')} que no mejorás: bajamos un poco para tomar envión.`,
      advanced: () => 'Descarga por estancamiento: −10 %.',
      detail: (n: number, mark: string) =>
        `En tus últimas ${n} veces no superaste tu mejor marca (${mark}). Bajar un poco ayuda a recuperarse y a volver a progresar.`,
    },
    CONSOLIDATE: {
      novice: () => 'Llegaste al máximo, pero te costó mucho: repetí este peso una vez más.',
      advanced: (meanRir: string, targetRir: number) =>
        `Consolidar: tope con RIR ${meanRir} (objetivo ${targetRir}).`,
      detail: () =>
        'Completaste el rango, pero muy cerca del límite dos veces seguidas. Lo repetimos una vez antes de subir.',
    },
    EARLY_INCREASE: {
      novice: (load: string) => `Te está sobrando: subimos a ${load}.`,
      advanced: (meanRir: string) => `Subida anticipada: RIR ${meanRir} sostenido.`,
      detail: (meanRir: string) =>
        `Dos veces seguidas te sobraron ${meanRir} o más. Subimos sin esperar a que llegues al tope.`,
    },
    HIGH_INCREASE: {
      novice: (load: string) => `¡Muy bien! Te sobró bastante: subimos a ${load}.`,
      advanced: (meanRir: string) => `+10 %: tope con RIR ${meanRir}.`,
      detail: () => 'Completaste el rango y te sobraba mucho: subimos más que lo habitual.',
    },
    INCREASE_LOAD: {
      novice: (sets: number, cap: number, load: string) =>
        `¡Completaste ${sets} × ${cap}! Subimos a ${load}.`,
      advanced: (percent: number, load: string) => `Tope alcanzado: +${percent} % → ${load}.`,
      detail: () =>
        'Cuando completás el tope en todas las series, subimos el peso y volvés al piso del rango (doble progresión).',
      /** Added to the detail when the jump is above 10 %. */
      bigJump:
        'Es el salto más chico disponible con tu equipamiento; por eso antes sumaste repeticiones extra.',
    },
    EXTEND_REPS: {
      novice: (reps: number) =>
        `Antes de subir, intentá ${reps}: el próximo peso es un salto grande.`,
      advanced: (reps: number, percent: number) =>
        `Overshoot: ${reps} (tope + 2) antes de +${percent} %.`,
      detail: (nextLoad: string) =>
        `El siguiente peso disponible (${nextLoad}) es más de un 10 % mayor. Primero sumás repeticiones para que el salto sea manejable.`,
    },
    ADD_REP: {
      novice: (reps: number) => `Mismo peso, intentá ${reps} repeticiones.`,
      advanced: (workingLoad: string, reps: number) => `W ${workingLoad} · objetivo ${reps}.`,
      detail: (previousReps: number, cap: number) =>
        `La última vez hiciste ${previousReps}. Sumamos una repetición hasta llegar a ${cap}.`,
    },
    COMPLETE_SETS: {
      novice: (sets: number, load: string, cap: number) =>
        sets === 1
          ? `Hacé la serie con ${load} × ${cap} para subir.`
          : `Hacé las ${sets} series con ${load} × ${cap} para subir.`,
      advanced: (sets: number) => `Completar ${sets} series al tope.`,
      detail: () => 'La última vez llegaste al tope, pero en menos series que las prescriptas.',
    },
    REPEAT: {
      novice: (load: string, floor: number) =>
        `Repetí ${load} × ${floor}: la última vez quedaste cerca.`,
      advanced: () => 'Repetir: debajo del piso.',
      detail: (floor: number) =>
        `Alguna serie quedó por debajo de ${floor}. Repetimos el peso para consolidarlo.`,
    },
    BODYWEIGHT_CALIBRATION: {
      novice: () => 'Hacé las que puedas con buena técnica y frená cuando te queden 1 o 2.',
      advanced: () => 'Calibración (peso corporal).',
      detail: () => 'Con esta serie sabemos por dónde arrancar.',
    },
    BODYWEIGHT_ADD_REP: {
      novice: (reps: number) => `Intentá ${reps} repeticiones.`,
      advanced: (reps: number) => `Objetivo ${reps}.`,
      detail: (cap: number) => `Sumamos una repetición por vez hasta ${cap}.`,
    },
    BODYWEIGHT_READY: {
      novice: () => '¡Llegaste al máximo! Probá una variante más difícil.',
      advanced: () => 'Tope alcanzado: progresá la variante.',
      detail: () => 'Sin peso externo, el siguiente paso es un ejercicio más exigente.',
    },
  },
  /** Combined reentry, added to the line. */
  withReentry: (days: number) =>
    `…y como volvés después de ${days} días, arrancamos un poco más liviano.`,
  /** Unilateral exercises, in the detail. */
  limitingSide: (side: string, reps: number) => `Tomamos tu lado ${side}, que hizo ${reps}.`,
  /** S10 «¿Por qué?». */
  why: {
    title: (load: string, reps: number) => `¿Por qué ${load} × ${reps}?`,
    calibrationTitle: '¿Por qué elegís vos el peso?',
    lastTime: 'La última vez',
    meanEffort: 'Esfuerzo medio',
    increase: 'Subida',
    basedOn: (principle: string) => `En qué nos basamos: ${principle}`,
    understood: 'Entendido',
    advanced: {
      lastTime: 'La última vez',
      meanRir: 'RIR medio',
      meanReserve: 'Reserva media',
      estimatedMax: 'Máximo estimado (aprox.)',
      rangeCap: 'Tope del rango',
      daysOff: 'Días sin entrenar',
      previousW: 'W anterior',
      adjustment: 'Ajuste',
    },
  },
} as const;

export type ReasonCode = keyof typeof suggestions.reasons;
