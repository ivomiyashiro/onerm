import { count } from '@/presentation/strings/plural';

const WEEK_DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** S07 Inicio and S08 Elegir día (13 §7, §9, §10). */
export const home = {
  todayIs: 'Hoy toca',
  exercises: (n: number) => count(n, 'ejercicio', 'ejercicios'),
  sets: (n: number) => count(n, 'serie', 'series'),
  minutes: (n: number) => `~${n} min`,
  /** The hero numbers: the figure big, the word under it («6 / ejercicios», «~49 / min»). */
  thisWeek: 'Esta semana',
  weekProgress: (done: number, goal: number) => `${done} de ${goal}`,
  /** RF-ENT-01.AC8: what TalkBack reads for the week dots. */
  weekName: (done: number, goal: number) => `Esta semana, ${done} de ${count(goal, 'día', 'días')}`,
  /** RF-ENT-01.AC8: the week strip, Monday to Sunday (RN-GEN-01). */
  weekDayLetters: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  weekDay: (index: number, state: 'done' | 'today' | 'pending') =>
    `${WEEK_DAYS[index]}, ${state === 'done' ? 'hecho' : state === 'today' ? 'hoy' : 'pendiente'}`,
  /** RF-ENT-01.AC1: the action in the card. */
  startDay: (day: string) => `Empezar ${day}`,
  continue: 'Continuar',
  /** RF-ENT-01.AC8: under each exercise: «Principal · Cuádriceps · 3 × 8–12». */
  exerciseDetail: (main: boolean, muscle: string | null, sets: number, min: number, max: number) =>
    [main && 'Principal', muscle, `${sets} × ${min === max ? min : `${min}–${max}`}`]
      .filter(Boolean)
      .join(' · '),
  /** RF-ENT-01.AC8: what changes against last time, under the suggestion (none to calibrate). */
  delta: {
    up: (load: string) => `↑ ${load}`,
    down: (load: string) => `↓ ${load}`,
    reps: (n: number) => `+${n} ${n === 1 ? 'rep' : 'reps'}`,
    moreReps: '+ reps',
    same: 'Igual',
  },
  todayList: 'Lo de hoy',
  goesUpIn: (n: number) => `Sube en ${n}`,
  addsRepsIn: (n: number) => `suma reps en ${n}`,
  inProgress: 'En curso',
  inProgressSince: (time: string) => `En curso · ${time}`,
  /** «×8» after the suggested load. */
  timesReps: (n: number) => `×${n}`,
  start: 'Empezar',
  continueWorkout: 'Continuar entrenamiento',
  changeDay: 'Cambiar día',
  restoreIncomplete: 'Faltan datos por restaurar. Las sugerencias pueden no estar al día.',
  noRoutine: {
    title: 'Todavía no tenés una rutina',
    body: 'Elegí una de las nuestras o armá la tuya.',
    chooseRoutine: 'Elegir una rutina',
    createRoutine: 'Crear rutina',
  },
  readError: {
    title: 'No pudimos cargar tu inicio',
    body: 'Tus datos siguen guardados en este teléfono. Probá de nuevo.',
    retry: 'Reintentar',
  },
  chooseDay: {
    title: 'Elegir día',
    routineDays: (n: number) => count(n, 'día', 'días'),
    subtitle: (routine: string, days: number) => `${routine} · ${count(days, 'día', 'días')}`,
    choose: (day: string) => `Elegir ${day}`,
    recommended: 'Recomendado',
    doneDaysAgo: (n: number) => `Hecho hace ${count(n, 'día', 'días')}`,
    neverDone: 'Nunca hecho',
    yourTurnToday: 'Te toca hoy',
  },
  /** Bar shown on every tab while a workout is in progress. */
  workoutBar: {
    title: 'Entrenamiento en curso',
    continue: 'Continuar',
  },
} as const;
