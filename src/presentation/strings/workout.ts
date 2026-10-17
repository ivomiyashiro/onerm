import { count } from '@/presentation/strings/plural';

/** S09 Entrenamiento, S11 Sustituir, S12 Resumen, effort, rest timer and notification (13 §3, §9, §10). */
export const workout = {
  header: {
    workout: 'Entrenamiento',
    seeAll: 'Ver todos',
    nOfTotal: (n: number, total: number) => `${n} de ${total}`,
    exerciseOf: (n: number, total: number) => `Ejercicio ${n} de ${total}`,
    /** Only with an account (08 §5). */
    backedUpOnFinish: 'Se respalda al finalizar',
  },
  set: {
    setOf: (n: number, total: number) => `Serie ${n} de ${total}`,
    exerciseComplete: 'Ejercicio completo',
    tapToAdjust: 'Tocá para ajustar',
    now: 'Ahora',
    editing: 'Editando',
    warmUp: 'Es una serie de calentamiento',
    differentPerSide: 'Distinto por lado',
    left: 'Izq',
    right: 'Der',
    repsLeft: 'Reps izq.',
    repsRight: 'Reps der.',
    bodyweight: 'Sin carga: peso corporal',
    complete: 'Completo',
    load: 'Carga',
    reps: 'Repeticiones',
    decreaseLoad: 'Bajar la carga',
    increaseLoad: 'Subir la carga',
    decreaseReps: 'Bajar las repeticiones',
    increaseReps: 'Subir las repeticiones',
    /** In the sheet, the load of a calibration's first set still to choose (RN-ENT-04): greyed. */
    noLoad: '0',
    /** The same load in its row: «— × 8», so it never reads as «use 0 kg». */
    noLoadInRow: '—',
    /** Under the load, the last one logged in the exercise (#195). */
    lastLoad: (load: string) => `Última vez: ${load}`,
    unilateral: 'Unilateral',
    /** The index of a warm-up row (Figma «SetRow» Warmup). */
    warmUpIndex: 'C',
    /** The start of a row's accessible name (13 §10): which set it is and whether it is done. */
    rowName: {
      set: (n: number) => `Serie ${n}`,
      done: (n: number) => `Serie ${n}, hecha`,
      warmUpDone: 'Calentamiento, hecha',
    },
    prescription: (sets: number, range: string) => `${sets} × ${range}`,
    /** The values of a set row: «62,5 kg × 8», the unit apart. */
    timesReps: (n: number) => `× ${n}`,
    sideReps: (left: number, right: number) => `× ${left} / ${right}`,
    stepAccessibility: (field: string, value: string, unit: string) =>
      `${field}: ${value} ${unit}. Tocá para escribir`,
    warmUpHelp:
      'Antes de empezar, hacé 1 o 2 series livianas del mismo movimiento y marcalas como calentamiento.',
  },
  stepNotes: {
    upBy: (kg: string) => `Subimos ${kg} kg`,
    downBy: (percent: number) => `Bajamos ${percent} %`,
    sameLoad: 'Mismo peso',
    backToFloor: (floor: number) => `Volvés a ${floor}: piso del rango`,
    overCap: (n: number) => `${n} más que el tope`,
    range: (floor: number, cap: number) => `Rango ${floor} a ${cap}`,
  },
  primaryAction: {
    done: 'Hecho',
    nextExercise: 'Siguiente ejercicio',
    finish: 'Finalizar entrenamiento',
  },
  exerciseMenu: {
    /** Accessibility label of the ⋯ of the exercise (like S13's). */
    title: (exercise: string) => `Opciones de ${exercise}`,
    substitute: 'Sustituir ejercicio',
    skip: 'Saltear ejercicio',
    addSet: 'Agregar serie',
  },
  workoutMenu: {
    title: 'Entrenamiento',
    subtitle: (day: string, time: string) => `${day} · ${time}`,
    finish: 'Finalizar entrenamiento',
    discard: 'Descartar entrenamiento',
  },
  exerciseList: {
    title: 'Ejercicios de hoy',
    subtitle: (day: string, n: number, total: number) => `${day} · ${n} de ${total}`,
    progress: (done: number, total: number) => `${done}/${total}`,
    skipped: 'Salteado',
    tapToGo: 'Tocá uno para ir',
  },
  editSet: {
    title: (n: number) => `Editar serie ${n}`,
    delete: 'Eliminar serie',
    save: 'Guardar',
    saveChanges: 'Guardar cambios',
    cancel: 'Cancelar',
    accept: 'Aceptar',
    setOfExercise: (n: number, exercise: string) => `Serie ${n} · ${exercise}`,
  },
  validation: {
    /** The maximum of RN-ENT-02 (1000 kg) already in the user unit: «1000 kg», «2204,6 lb». */
    load: (max: string, unit: string) => `La carga tiene que estar entre 0 y ${max} ${unit}.`,
    reps: 'Las repeticiones tienen que estar entre 0 y 100.',
    /** Confirmed without choosing a load (RN-ENT-04, #195). */
    noLoad: 'Elegí la carga que usaste.',
  },
  effort: {
    simpleQuestion: '¿Cuántas más podías hacer?',
    simple: { none: 'Ninguna', one: '1', twoOrThree: '2 o 3', fourOrMore: '4 o más' },
    /** Short labels in the set row (13 §10). */
    row: {
      none: 'Ninguna más',
      one: '1 más',
      twoOrThree: '2 o 3 más',
      fourOrMore: '4 o más',
      missing: '¿Cuántas más?',
    },
    /** In the row with the RIR scale, like the rows of S15 (13 §10). */
    rowRir: (n: number) => (n >= 5 ? 'reserva 5+' : `reserva ${n}`),
    rirTitle: 'Repeticiones en reserva (RIR)',
    rir: ['0', '1', '2', '3', '4', '5+'],
    rirHelp: '0 = no podías hacer ni una más.',
  },
  calibration: {
    firstTime: 'Primera vez',
    askEffort: 'Contanos cuántas más podías hacer: con eso calculamos tu peso.',
    askEffortForSet: (n: number) =>
      `Contanos cuántas más podías hacer en la serie ${n}: con eso calculamos tu peso.`,
    missingEffort: 'Falta esfuerzo',
    chooseAbove: 'Elegí una opción arriba para seguir.',
    answerToContinue: (n: number) =>
      `Respondé para seguir: con esto calculamos tu peso para la serie ${n}.`,
    nextByAnswer: (n: number, total: number) =>
      `Siguiente: serie ${n} de ${total} · peso según tu respuesta`,
    tooHeavy: (n: number, load: string) => `Era mucho peso: en la serie ${n} probá con ${load}.`,
    setDone: (n: number, total: number) => `Serie ${n} de ${total} · hecha`,
  },
  substitution: {
    substitute: 'Sustituto',
    insteadOf: (exercise: string) => `En lugar de ${exercise}. Solo para hoy.`,
  },
  unavailable: {
    title: 'Ejercicio no disponible todavía.',
    body: 'Lo podés sustituir por otro del mismo músculo o saltearlo.',
  },
  rest: {
    title: 'Descanso',
    ofTotal: (time: string) => `de ${time}`,
    plus15: '+15 s',
    restart: 'Reiniciar',
    skip: 'Saltear',
    skipAccessibility: 'Saltear descanso',
    skipRest: 'Saltear descanso',
    minimize: 'Minimizar',
    openTimer: 'Abrir temporizador',
    /** `values` is «62,5 kg × 8». */
    nextSet: (n: number, total: number, values: string) =>
      `Siguiente: serie ${n} de ${total} · ${values}`,
    next: (exercise: string, values: string) => `Siguiente: ${exercise} · ${values}`,
    /** The minimized bar (Figma «RestTimer»). */
    nextShort: (values: string) => `Siguiente: ${values}`,
    /** In place of «{carga} × {reps}» for an exercise with no load yet (D1 of the F9 review). */
    firstTime: 'primera vez',
    /** The card of the set just done (Figma «Serie hecha»). */
    doneSet: (n: number, values: string) => `Serie ${n} · ${values}`,
    finished: '¡Descanso terminado!',
    readyForSet: (n: number) => `Listo para la serie ${n}`,
    goToSet: (n: number) => `Ir a la serie ${n}`,
    lastExerciseDone: 'Último ejercicio terminado',
  },
  /** Local notification at the end of the rest (RN-ENT-07). */
  restNotification: {
    title: '¡Descanso terminado!',
  },
  /** Discreet notices of S09 (never network errors, UX-04). */
  notices: {
    notificationsDenied:
      'Activá las notificaciones para que te avisemos con la pantalla bloqueada.',
    notificationsAction: 'Activar',
    exactAlarmsDenied:
      'Permití las alarmas para que te avisemos a tiempo con la pantalla bloqueada.',
    exactAlarmsAction: 'Permitir',
  },
  setDeleted: { message: 'Serie eliminada', undo: 'Deshacer' },
  substitute: {
    title: 'Sustituir ejercicio',
    insteadOf: (exercise: string) => `En lugar de ${exercise}`,
    search: 'Buscar ejercicio',
    sameMuscle: 'Mismo músculo',
    others: 'Otros ejercicios',
    noResultsTitle: 'No encontramos ejercicios',
    noResultsBody: 'Probá con otra palabra o elegí uno del mismo músculo.',
    seeSameMuscle: 'Ver el mismo músculo',
  },
  summary: {
    workout: 'Entrenamiento',
    finished: 'Terminado',
    duration: 'Duración',
    sets: 'Series',
    exercises: 'Ejercicios',
    doneOfTotal: (done: number, total: number) => `${done} de ${total}`,
    todayRecords: 'Récords de hoy',
    newRecord: 'Nuevo récord',
    heaviestLoad: 'Mayor carga',
    estimatedMax: 'Máximo estimado',
    whatYouDid: 'Lo que hiciste',
    exerciseLine: (sets: number, load: string, reps: number) =>
      `${count(sets, 'serie', 'series')} · mejor ${load} × ${reps}`,
    /** Bodyweight: no load, like the set rows («× 12»). */
    exerciseLineBodyweight: (sets: number, reps: number) =>
      `${count(sets, 'serie', 'series')} · mejor × ${reps}`,
    minutes: (n: number) => `${n} min`,
    title: (day: string) => `Entrenamiento · ${day}`,
    recordTitle: (record: string) => `Nuevo récord · ${record}`,
    approximate: (value: string) => `${value} (aprox.)`,
    skipped: 'Salteado',
    nextDay: (day: string) => `Próximo: ${day}`,
    ready: 'Listo',
  },
} as const;
