import { count } from '@/presentation/strings/plural';

/** S16 Buscador and S17 Detalle de ejercicio (13 §7, §9, §10). */
export const catalog = {
  search: {
    placeholder: 'Buscar ejercicio',
    sameMuscle: 'Mismo músculo',
    addTo: (day: string) => `Agregar al ${day}`,
    count: (n: number) => count(n, 'ejercicio', 'ejercicios'),
    moreFilters: 'Más filtros',
    empty: {
      title: 'No encontramos ejercicios',
      body: 'Probá con otra palabra o quitá filtros.',
      action: 'Limpiar filtros',
    },
  },
  detail: {
    howTo: 'Cómo se hace',
    primary: 'Principales',
    secondary: 'Secundarios',
    seeProgress: 'Ver mi progreso',
    source: (source: string, license: string) => `Fuente: ${source} · ${license}`,
    deprecated:
      'Este ejercicio ya no está en el catálogo. Tus rutinas y registros que lo usan se conservan.',
    deprecatedNotice: 'Ya no está en el catálogo.',
    replace: 'Reemplazar',
    unavailable: 'No disponible',
    notYetAvailable:
      'Ejercicio no disponible todavía. Lo estamos actualizando: cuando tengas conexión aparece completo.',
  },
} as const;
