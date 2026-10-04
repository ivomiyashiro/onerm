/** S13 Rutinas, S14 Plantilla, S15 Editor (13 §5, §7, §9, §10). */
export const routines = {
  list: {
    title: 'Rutinas',
    mine: 'Mis rutinas',
    templates: 'Plantillas',
    active: 'Rutina activa',
    recommended: 'Recomendada para vos',
    create: 'Crear rutina',
    days: (n: number) => `${n} días`,
    minutes: (n: number) => `~${n} min`,
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
    day: (day: string) => `Día ${day}`,
    exercises: (n: number) => `${n} ejercicios`,
    setsByRange: (sets: number, range: string) => `${sets} series × ${range}`,
    main: 'Principal',
    accessory: 'Accesorio',
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
    /** S06 and S14, with the strength goal. */
    strengthWarning:
      'Estas rutinas usan máquinas y mancuernas. Si tu meta es levantar más en sentadilla, banca o peso muerto con barra, podés armar tu propia rutina con esos ejercicios.',
  },
  editor: {
    title: 'Editar rutina',
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
    },
    rirZeroWarning:
      'RIR 0 significa ir al fallo en cada serie. No lo recomendamos: no suma fuerza y aumenta la fatiga.',
  },
} as const;
