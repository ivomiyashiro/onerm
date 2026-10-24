import type { Equipment, Muscle } from '@/domain/models/vocabulary';
import { count } from '@/presentation/strings/plural';

/** RN-CAT-03, the controlled vocabularies. */
const muscles: Record<Muscle, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebrazos',
  abs: 'Abdominales',
  quads: 'Cuádriceps',
  hamstrings: 'Isquios',
  glutes: 'Glúteos',
  calves: 'Gemelos',
  adductors: 'Aductores',
};

const equipment: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuerna',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  kettlebell: 'Kettlebell',
};

/** S16 Buscador and S17 Detalle de ejercicio (13 §7, §9, §10). */
export const catalog = {
  muscles,
  equipment,
  search: {
    title: 'Ejercicios',
    placeholder: 'Buscar ejercicio',
    clear: 'Borrar',
    muscleFilter: 'Músculo',
    equipmentFilter: 'Equipamiento',
    readError: {
      title: 'No pudimos cargar los ejercicios',
      body: 'Tus datos siguen guardados en este teléfono. Probá de nuevo.',
    },
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
    title: 'Ejercicio',
    unilateral: 'Unilateral',
    howTo: 'Cómo se hace',
    mistakes: 'Errores comunes',
    mistake: (text: string) => `• ${text}`,
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
