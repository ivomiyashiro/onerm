import type { ExerciseRole, ExperienceLevel, TrainingGoal } from '@/domain/models/vocabulary';
import { count } from '@/presentation/strings/plural';

/** «{nivel}» in S13 and S14. */
const levels: Record<ExperienceLevel, string> = {
  novice: 'Novato',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

/** «{objetivo}» in S14 (and D06). */
const goals: Record<TrainingGoal, string> = {
  health: 'salud general',
  hypertrophy: 'ganar músculo',
  strength: 'ganar fuerza',
};

const roles: Record<ExerciseRole, string> = { main: 'Principal', accessory: 'Accesorio' };

const setsByRange = (sets: number, range: string) => `${count(sets, 'serie', 'series')} × ${range}`;

/** A rep range, «8–12». */
const repRange = ({ min, max }: { min: number; max: number }) => `${min}–${max}`;

/** S13 Rutinas, S14 Plantilla, S15 Editor (13 §5, §7, §9, §10). */
export const routines = {
  levels,
  goals,
  repRange,
  list: {
    title: 'Rutinas',
    mine: 'Mis rutinas',
    templates: 'Plantillas',
    active: 'Rutina activa',
    recommended: 'Recomendada para vos',
    create: 'Crear rutina',
    days: (n: number) => count(n, 'día', 'días'),
    minutes: (n: number) => `~${n} min`,
    /** The card line: «3 días · Novato · ~49 min», without the level for an own routine. */
    summary: (days: number, level: ExperienceLevel | null, minutes: number) =>
      [count(days, 'día', 'días'), level && levels[level], `~${minutes} min`]
        .filter(Boolean)
        .join(' · '),
    /** Accessible name of the «⋯» of a card. */
    options: (routine: string) => `Opciones de ${routine}`,
    templatesHelp:
      'Las plantillas se copian a Mis rutinas cuando las usás: después podés cambiarlas sin afectar el original.',
    menu: { edit: 'Editar', activate: 'Activar', duplicate: 'Duplicar', delete: 'Eliminar rutina' },
    empty: {
      title: 'Sin rutinas',
      body: 'Tus rutinas van a aparecer acá.',
      action: 'Ver plantillas',
    },
    readError: {
      title: 'No pudimos cargar tus rutinas',
      body: 'Tus datos siguen guardados en este teléfono. Probá de nuevo.',
      retry: 'Reintentar',
    },
  },
  template: {
    label: 'Plantilla',
    why: '¿Por qué esta rutina?',
    prescription: (goal: string, range: string, rir: number) =>
      `Prescripción calculada para tu objetivo: ${goal} (${range} repeticiones, dejando ${rir} en reserva).`,
    exercises: (n: number) => count(n, 'ejercicio', 'ejercicios'),
    /** «Día A · 6 ejercicios». */
    dayTitle: (day: string, exercises: number) =>
      `${day} · ${count(exercises, 'ejercicio', 'ejercicios')}`,
    /** «3 series × 8–12 · Principal». */
    exerciseLine: (sets: number, range: string, role: ExerciseRole) =>
      `${setsByRange(sets, range)} · ${roles[role]}`,
    setsByRange,
    main: roles.main,
    accessory: roles.accessory,
    use: 'Usar esta rutina',
    sources: 'Ver las fuentes completas',
    /** «¿Por qué esta rutina?» (13 §5). */
    rationale: {
      'PLT-FB3':
        'Trabajás todo el cuerpo en cada sesión y cada músculo unas 3 veces por semana, lo que te da mucha práctica de cada movimiento. Usamos máquinas, poleas y mancuernas porque son más fáciles de aprender y dan resultados parecidos a la barra. Las sesiones duran alrededor de una hora o menos.',
      'PLT-FB2':
        'Si tenés poco tiempo, 2 días bien hechos ya generan mejoras importantes. Cada músculo trabaja 2 veces por semana. Hacemos alguna serie más por ejercicio para compensar.',
      'PLT-TP4':
        'Separamos tren superior e inferior para meter más trabajo por músculo sin alargar las sesiones. Cada músculo trabaja 2 veces por semana. Incluye ejercicios con más técnica, pensados para quien ya tiene experiencia.',
    },
    /** S06: the short line under the recommended template (13 §5). */
    summary: {
      'PLT-FB3':
        'Cada músculo unas 3 veces por semana con sesiones cortas. Mucha práctica de cada movimiento.',
      'PLT-FB2':
        'Dos sesiones de cuerpo completo por semana: alcanza para mejorar si tenés poco tiempo.',
      'PLT-TP4':
        'Separamos tren superior e inferior: más trabajo por músculo sin alargar las sesiones.',
    },
    /** The criteria of each template and their sources, under the paragraph (13 §5). */
    criteria: {
      'PLT-FB3': [
        {
          title: 'Cada músculo 2 o más veces por semana',
          sources: 'Schoenfeld 2019 · OMS 2020',
        },
        { title: 'Máquinas y mancuernas: resultados parecidos a la barra', sources: 'Haugen 2023' },
        { title: 'Sesiones de una hora o menos', sources: 'Criterio de práctica' },
      ],
      'PLT-FB2': [
        {
          title: 'Con 2 días por semana ya hay mejoras importantes',
          sources: 'OMS 2020 · ACSM 2026',
        },
        { title: 'Cada músculo 2 veces por semana', sources: 'Schoenfeld 2019 · OMS 2020' },
        { title: 'Algo menos de volumen: una concesión por el tiempo', sources: 'Pelland 2025' },
      ],
      'PLT-TP4': [
        { title: 'Cada músculo 2 veces por semana', sources: 'Schoenfeld 2019 · OMS 2020' },
        { title: 'Unas 10 series por semana por músculo', sources: 'ACSM 2026 · Pelland 2025' },
        {
          title: 'Más ejercicios con técnica, para quien ya tiene experiencia',
          sources: 'Criterio de práctica',
        },
      ],
    },
    /** S06 and S14, with the strength goal. */
    strengthWarning:
      'Estas rutinas usan máquinas y mancuernas. Si tu meta es levantar más en sentadilla, banca o peso muerto con barra, podés armar tu propia rutina con esos ejercicios.',
  },
  editor: {
    title: 'Editar rutina',
    createTitle: 'Crear rutina',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    /** The row's line: «3 × 8–12 · reserva 2 · 2 min». */
    exerciseLine: (sets: number, range: string, rir: number, rest: string) =>
      `${sets} × ${range} · reserva ${rir} · ${rest}`,
    /** «60 s», «90 s», «2 min», «2:30». */
    rest: (seconds: number) => {
      if (seconds <= 90) return `${seconds} s`;
      const minutes = Math.floor(seconds / 60);
      const rest = seconds % 60;
      return rest === 0 ? `${minutes} min` : `${minutes}:${String(rest).padStart(2, '0')}`;
    },
    workoutInProgress: 'Los cambios aplican desde tu próximo entrenamiento.',
    /** S15 · Prescripción (hoja): «Principal · Día A». */
    sheetSubtitle: (role: ExerciseRole, day: string) => `${roles[role]} · ${day}`,
    role: 'Rol',
    roles,
    notes: 'Notas',
    notesPlaceholder: 'Ej.: asiento en posición 4',
    notesCount: (n: number, max: number) => `${n}/${max}`,
    replace: 'Reemplazar ejercicio',
    remove: 'Quitar ejercicio',
    /** S15 · Opciones del día (hoja). */
    day: {
      exercises: (n: number) => count(n, 'ejercicio', 'ejercicios'),
      name: 'Nombre del día',
      moveBefore: 'Mover antes',
      moveAfter: 'Mover después',
      remove: 'Quitar día',
    },
    name: 'Nombre de la rutina',
    addDay: '+ Día',
    addExercise: 'Agregar ejercicio',
    reorderHelp: 'Arrastrá desde el asa o usá las flechas para cambiar el orden.',
    save: 'Guardar',
    emptyDay: {
      title: 'Este día no tiene ejercicios',
      body: 'Agregá al menos uno, o quitá el día.',
    },
    dayWithoutExercises: {
      title: (day: string) => `El ${day} no tiene ejercicios`,
      body: 'Agregá al menos uno para poder guardar, o quitá el día.',
    },
    reserve: (n: number) => `reserva ${n}`,
    reserveHelp: (n: number) => `${n} = terminás cada serie sintiendo que podías hacer ${n} más.`,
    mainFirstHelp: 'Los ejercicios principales suelen ir primero para rendir más en fuerza.',
    fields: {
      sets: 'Series',
      repMin: 'Reps mín.',
      repMax: 'Reps máx.',
      reserve: 'Repeticiones en reserva',
      reserveAdvanced: 'Esfuerzo objetivo (RIR)',
      rest: 'Descanso',
    },
    validation: {
      emptyName: 'El nombre no puede estar vacío.',
      minOverMax: 'El mínimo no puede ser mayor que el máximo.',
      dayWithoutExercises: (day: string) => `Agregá al menos un ejercicio a ${day}.`,
      sets: 'Las series tienen que estar entre 1 y 10.',
      reps: 'Las repeticiones tienen que estar entre 1 y 30.',
    },
    rirZeroWarning:
      'RIR 0 significa ir al fallo en cada serie. No lo recomendamos: no suma fuerza y aumenta la fatiga.',
  },
} as const;
