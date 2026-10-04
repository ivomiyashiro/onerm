/** S09 Entrenamiento, S11 Sustituir, S12 Resumen, effort, rest timer and notification (13 §3, §9, §10). */
export const workout = {
  header: {
    workout: 'Entrenamiento',
    seeAll: 'Ver todos',
    nOfTotal: (n: number, total: number) => `${n} de ${total}`,
    exerciseOf: (n: number, total: number) => `Ejercicio ${n} de ${total}`,
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
    substitute: 'Sustituir ejercicio',
    skip: 'Saltear ejercicio',
    addSet: 'Agregar serie',
  },
  workoutMenu: {
    title: 'Entrenamiento',
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
    load: (unit: string) => `La carga tiene que estar entre 0 y 1000 ${unit}.`,
    reps: 'Las repeticiones tienen que estar entre 0 y 100.',
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
    nextSet: (n: number, total: number, load: string, reps: number) =>
      `Siguiente: serie ${n} de ${total} · ${load} × ${reps}`,
    next: (exercise: string, load: string, reps: number) =>
      `Siguiente: ${exercise} · ${load} × ${reps}`,
    finished: '¡Descanso terminado!',
    readyForSet: (n: number) => `Listo para la serie ${n}`,
    goToSet: (n: number) => `Ir a la serie ${n}`,
    lastExerciseDone: 'Último ejercicio terminado',
  },
  /** Local notification at the end of the rest (RN-ENT-07). */
  restNotification: {
    title: '¡Descanso terminado!',
    body: (exercise: string, load: string, reps: number) =>
      `Siguiente: ${exercise} · ${load} × ${reps}`,
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
      `${sets} series · mejor ${load} × ${reps}`,
    skipped: 'Salteado',
    nextDay: (day: string) => `Próximo: ${day}`,
    ready: 'Listo',
  },
} as const;
