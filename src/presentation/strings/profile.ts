import { count } from '@/presentation/strings/plural';

/** S21 Perfil, its setting sheets, S22 Acerca de, S23 Restaurando, S25 Conflictos (13 §9, §10). */
export const profile = {
  title: 'Perfil',
  guest: 'Invitado',
  noAccount: 'Sin cuenta',
  /** The account block when the email isn't known. */
  account: 'Mi cuenta',
  sections: { training: 'Entrenamiento', preferences: 'Preferencias' },
  rows: {
    level: 'Nivel',
    goal: 'Objetivo',
    daysPerWeek: 'Días por semana',
    unit: 'Unidad de peso',
    effort: 'Esfuerzo',
    simpleScale: 'Escala simple',
    increments: 'Incrementos de peso',
    byEquipment: 'Por equipamiento',
    restNotifications: 'Notificaciones del descanso',
    restNotificationsHelp: 'Te avisamos aunque la pantalla esté bloqueada.',
    about: 'Acerca de y créditos',
    signOut: 'Cerrar sesión',
    /** RF-AUTH-07.AC2: the pending changes go up before signing out. */
    signingOutBackingUp: 'Respaldando tus datos…',
    backUpNow: 'Respaldar ahora',
  },
  permissions: {
    notificationsBlocked:
      'Están bloqueadas en los ajustes del teléfono. Activalas ahí para que te avisemos con la pantalla bloqueada.',
    openPhoneSettings: 'Abrir ajustes del teléfono',
    exactAlarmsOff:
      'Alarmas exactas desactivadas: sin ellas no te avisamos con la pantalla bloqueada.',
    allow: 'Permitir',
  },
  increments: {
    help: 'Usamos estos saltos para que las sugerencias sean pesos que existen en tu gimnasio.',
    title: 'Incrementos de peso',
    inKg: 'En kg',
    inLb: 'En lb',
    bar: 'Barra',
    /** «2,5 kg». */
    value: (amount: string, unit: string) => `${amount} ${unit}`,
    invalid: (max: number, unit: string) => `Tiene que ser mayor que 0 y hasta ${max} ${unit}.`,
    barWeight: 'Peso de la barra',
    lbNote: 'Si cambiás a lb usamos otros saltos (5 lb, 10 lb): no se convierten.',
  },
  /** The current value of each row (Figma S21). */
  values: {
    goal: { health: 'Salud general', hypertrophy: 'Ganar músculo', strength: 'Ganar fuerza' },
    unit: { kg: 'kg', lb: 'lb' },
    effort: { simple: 'Escala simple', rir: 'RIR numérico' },
    /** «{nivel}» inside D06 (13 §8). */
    levelInText: { novice: 'novato', intermediate: 'intermedio', advanced: 'avanzado' },
  },
  readError: {
    title: 'No pudimos cargar tu perfil',
    body: 'Tus datos siguen guardados en este teléfono. Probá de nuevo.',
    retry: 'Reintentar',
  },
  /** Setting sheets of S21 (marca §14). */
  sheets: {
    level: 'Nivel',
    goal: 'Objetivo',
    daysPerWeek: 'Días por semana',
    unit: 'Unidad de peso',
    effort: 'Esfuerzo',
    save: 'Guardar',
    routineDoesNotChange: 'Tu rutina no cambia sola: después te preguntamos si querés ajustarla.',
    kg: { title: 'Kilos (kg)', body: 'Como se ve hoy.' },
    lb: { title: 'Libras (lb)', body: 'Para discos y mancuernas en libras.' },
    unitNote:
      'Tus datos no cambian: solo cómo se muestran y cómo cargás los pesos. Si cambiás a lb usamos otros saltos (5 lb, 10 lb): no se convierten.',
    simple: { title: 'Escala simple', body: '«¿Cuántas más podías hacer?»' },
    simpleOptions: ['Ninguna', '1', '2 o 3', '4 o más'],
    rir: {
      title: 'RIR numérico',
      body: 'Repeticiones en reserva, de 0 a 5+. Para quien ya lo usa.',
    },
    effortKept: 'Si después cambiás tu nivel, esta elección se mantiene.',
  },
  /** Backup status (RF-SYNC-06, 13 §9). */
  sync: {
    synced: (time: string) => `Respaldado · hace ${time}`,
    /** {tiempo} of «Respaldado · hace {tiempo}», in the largest whole unit. */
    lessThanAMinute: 'menos de 1 min',
    minutes: (n: number) => `${n} min`,
    hours: (n: number) => `${n} h`,
    days: (n: number) => count(n, 'día', 'días'),
    syncing: 'Respaldando…',
    pendingOffline: (n: number) => `${count(n, 'cambio', 'cambios')} sin respaldar · sin conexión`,
    pendingOnline: (n: number) => `${count(n, 'cambio', 'cambios')} por respaldar…`,
    workoutInProgress: 'Tu entrenamiento se respalda al finalizarlo.',
    sessionExpired: 'Tu sesión venció. Tus datos siguen en este teléfono.',
    signInAgain: 'Volver a entrar',
    conflict: (n: number) =>
      n === 1 ? '1 cambio no se pudo respaldar' : `${n} cambios no se pudieron respaldar`,
    see: 'Ver',
    networkError: 'No pudimos respaldar. Lo intentamos de nuevo solos.',
    retry: 'Reintentar',
    guest: 'Sin respaldo: tus datos solo están en este teléfono.',
    createAccount: 'Crear cuenta',
    appOutdated: 'Actualizá la app para respaldar tus datos.',
    backUpNow: 'Respaldar ahora',
  },
  about: {
    title: 'Acerca de',
    version: (version: string) => `Versión ${version}`,
    credits: 'Créditos',
    exerciseCatalog: 'Catálogo de ejercicios',
    photos: 'Fotos',
    fonts: 'Tipografías',
    /** The brand name, split to color «RM» like the logo (Figma S22). */
    appName: { one: 'One', rm: 'RM' },
    fontsCredit: 'Geist, Archivo y JetBrains Mono · SIL Open Font License',
    photosCredit: 'Eduardo Cano Photo Co., Alora Griffiths y Victor Freitas · Licencia de Unsplash',
    basedOn: 'En qué nos basamos',
    principlesCount: (n: number) => count(n, 'principio', 'principios'),
    principlesHelp: 'Los principios detrás de las sugerencias y sus fuentes científicas.',
  },
  restoring: {
    /** «{porcentaje}» once the total is known; before, the title alone. */
    title: (percent: number | null) =>
      percent === null ? 'Restaurando tus datos…' : `Restaurando tus datos… ${percent} %`,
    progress: (done: number, total: number) =>
      `${done} de ${count(total, 'registro', 'registros')}`,
    help: 'Si se corta la conexión, lo que ya bajó queda guardado y seguimos solos después.',
    interrupted: 'Se cortó la conexión',
    interruptedBody:
      'Podés seguir usando la app. Terminamos de restaurar solos cuando vuelva la conexión.',
    continue: 'Continuar',
  },
  conflicts: {
    title: 'Cambios sin respaldar',
    body: 'No pudimos respaldar estos cambios. Tocá uno para ver qué pasó y qué podés hacer.',
    empty: { title: 'Todo respaldado', body: 'No hay cambios pendientes.' },
    /** The record each rejected change is about (decided in #46). */
    record: {
      profile: 'Tu perfil',
      routine: (name: string | null) => (name ? `Rutina «${name}»` : 'Una rutina'),
      routineDay: (name: string | null) =>
        name ? `Día «${name}» de una rutina` : 'Un día de una rutina',
      routineExercise: 'Un ejercicio de una rutina',
      workout: (name: string | null) => (name ? `Entrenamiento del ${name}` : 'Un entrenamiento'),
      workoutExercise: 'Un ejercicio de un entrenamiento',
      workoutSet: 'Una serie de un entrenamiento',
    },
    /** D12 {detalle}: why the server rejected it, by its Postgres code (decided in #46). */
    reason: {
      outOfRange: 'Algún dato está fuera de los valores que acepta el servidor',
      missingValue: 'Falta un dato obligatorio',
      missingParent: 'Falta el registro del que depende',
      duplicate: 'Ya existe un registro igual en el servidor',
      notAllowed: 'El servidor no permite este cambio',
      other: 'El servidor no aceptó este cambio',
    },
    discardOffline: 'Necesitás conexión para descartarlo.',
    readError: {
      title: 'No pudimos cargar los cambios',
      body: 'Tus datos siguen guardados en este teléfono. Probá de nuevo.',
    },
  },
} as const;
