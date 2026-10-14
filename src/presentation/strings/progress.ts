import { count } from '@/presentation/strings/plural';

/** S18 Progreso, S19 Detalle de entrenamiento, S20 Progreso de ejercicio (13 §7, §9, §10). */
export const progress = {
  overview: {
    title: 'Progreso',
    history: 'Historial',
    volume: 'Volumen',
    monthYear: (month: string, year: number) => `${month} ${year}`,
    duration: (minutes: number) => `${minutes} min`,
    /** «Día A · Cuerpo completo A/B» (Figma «S18 · Historial»). */
    workoutTitle: (day: string, routine: string) => `${day} · ${routine}`,
    /** «52 min · 17 series». */
    workoutMeta: (minutes: number, sets: number) =>
      `${minutes} min · ${count(sets, 'serie', 'series')}`,
    sets: (n: number) => count(n, 'serie', 'series'),
    records: (n: number) => count(n, 'récord', 'récords'),
    pending: 'Pendiente',
    thisWeek: 'Esta semana',
    dateRange: (from: string, to: string) => `${from} – ${to}`,
    workoutsOfGoal: (n: number, goal: number) => `${n} de ${goal} entrenamientos`,
    setsPerWeek: 'Series por semana',
    reference: 'Referencia: 10',
    volumeHelp:
      'Rango guía: 8 a 12 series por músculo. Contamos 1 por cada serie de un músculo principal y 0,5 si es secundario.',
    why10: '¿Por qué 10 series?',
    empty: {
      title: 'Todavía no hay entrenamientos',
      body: 'Cuando termines tu primer entrenamiento lo vas a ver acá.',
      action: 'Empezar el próximo',
    },
    readError: {
      title: 'No pudimos cargar tu historial',
      body: 'Tus datos siguen guardados en este teléfono. Probá de nuevo.',
      retry: 'Reintentar',
    },
  },
  workoutDetail: {
    title: 'Entrenamiento',
    edit: 'Editar entrenamiento',
    date: (weekday: string, day: number, month: string) => `${weekday} ${day} de ${month}`,
    /** «Miércoles 30 de septiembre · 52 min · 17 series» (Figma «S19 · Detalle»). */
    meta: (date: string, minutes: number, sets: number) =>
      `${date.charAt(0).toUpperCase()}${date.slice(1)} · ${minutes} min · ${count(sets, 'serie', 'series')}`,
    /** Accessibility label of the ⋯ while editing (13 §S19). */
    menu: 'Opciones del entrenamiento',
    substitutes: (exercise: string) => `Sustituye a ${exercise}`,
    skipped: 'Salteado',
    editHelp: 'Tocá una serie para corregirla. Tus sugerencias se recalculan solas.',
    addSet: 'Agregar serie',
    delete: 'Eliminar entrenamiento',
    done: 'Listo',
  },
  exercise: {
    estimatedMax: 'Máximo estimado',
    heaviestLoad: 'Mayor carga',
    bestSet: 'Mejor serie',
    record: 'récord',
    approximate: 'aproximado',
    periods: { fourWeeks: '4 semanas', threeMonths: '3 meses', all: 'Todo' },
    estimatedMaxIn: (unit: string) => `Máximo estimado en ${unit}`,
    highPrecision: 'Precisión alta',
    approximatePrecision: 'Aproximada',
    recordLegend: 'Récord',
    chartHelp:
      'Calculado con el peso y las repeticiones que hiciste. Los puntos huecos son aproximados (series largas). El punto lima es tu récord.',
    noE1rm: {
      totalReps: 'Repeticiones totales',
      bestSetReps: (load: string) => `Repeticiones de la mejor serie (${load})`,
      help: 'Con más de 15 repeticiones no podemos estimar tu máximo con precisión, así que te mostramos tu mejor serie.',
    },
    bestSetPerWorkout: 'Mejor serie de cada entrenamiento',
    maxReps: 'Máximas reps',
    totalReps: 'Reps totales',
    maxRepsPerWorkout: 'Máximas repeticiones por entrenamiento',
    bodyweight: 'Es un ejercicio de peso corporal: seguimos tus repeticiones, sin máximo estimado.',
    onePoint: {
      title: '¡Buen comienzo!',
      body: 'Entrená este ejercicio un par de veces más para ver tu evolución.',
    },
  },
  newRecord: 'Nuevo récord',
} as const;
