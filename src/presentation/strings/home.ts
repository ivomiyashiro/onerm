import { count } from '@/presentation/strings/plural';

/** S07 Inicio and S08 Elegir día (13 §7, §9, §10). */
export const home = {
  todayIs: 'Hoy toca',
  exercises: (n: number) => count(n, 'ejercicio', 'ejercicios'),
  sets: (n: number) => count(n, 'serie', 'series'),
  minutes: (n: number) => `~${n} min`,
  /** The hero numbers: the figure big, the word under it («6 / ejercicios», «~49 / min»). */
  stats: {
    exercises: (n: number) => (n === 1 ? 'ejercicio' : 'ejercicios'),
    sets: (n: number) => (n === 1 ? 'serie' : 'series'),
    approxMinutes: (n: number) => `~${n}`,
    minutes: 'min',
  },
  thisWeek: 'Esta semana',
  weekProgress: (done: number, goal: number) => `${done} de ${goal}`,
  /** RF-ENT-01.AC8: what TalkBack reads for the week dots. */
  weekName: (done: number, goal: number) =>
    `Esta semana, ${done} de ${count(goal, 'entrenamiento', 'entrenamientos')}`,
  /** Under the day: its routine, exercises and time. */
  meta: (routine: string, exercises: number, minutes: number) =>
    `${routine} · ${count(exercises, 'ejercicio', 'ejercicios')} · ~${minutes} min`,
  /** RF-ENT-01.AC8: the suggestion of the first exercise. */
  startsWith: 'Empezás con',
  /** RF-ENT-01.AC8: what changes, as a badge (none to calibrate, #196). */
  badges: { up: 'Sube', reps: 'Suma reps', same: 'Igual', deload: 'Más liviano' },
  main: 'Principal',
  mainBadge: (badge: string) => `Principal · ${badge}`,
  today: 'Hoy',
  todayList: 'Lo de hoy',
  goesUpIn: (n: number) => `Sube en ${n}`,
  addsRepsIn: (n: number) => `suma reps en ${n}`,
  inProgress: 'En curso',
  inProgressSince: (time: string) => `En curso · ${time}`,
  /** «×8» after the suggested load. */
  timesReps: (n: number) => `×${n}`,
  startToday: 'Arrancá hoy',
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
