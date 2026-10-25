import type { Equipment, Machine, Muscle } from '@/domain/models/vocabulary';
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

/** #306, 13 «Máquinas»: the picture's accessible name and how to recognize the machine. */
const machine = (name: string, hint: string) => ({ picture: `Imagen de ${name}`, hint });

const machines: Record<Machine, { picture: string; hint: string }> = {
  'leg-press': machine(
    'Prensa de piernas',
    'Asiento reclinado frente a una plataforma grande para los pies. Se carga con discos a los costados.',
  ),
  'hack-squat': machine(
    'Sentadilla hack',
    'Plataforma inclinada para los pies y un respaldo con almohadillas que apoyan en los hombros.',
  ),
  smith: machine(
    'Máquina Smith',
    'Una barra que sube y baja guiada por dos rieles, con ganchos para trabarla a distintas alturas.',
  ),
  'leg-extension': machine(
    'Extensión de cuádriceps',
    'Asiento con un rodillo que va delante de los tobillos.',
  ),
  'leg-curl-seated': machine(
    'Curl femoral sentado',
    'Asiento con un rodillo debajo de los tobillos y otro que sujeta los muslos desde arriba.',
  ),
  'leg-curl-lying': machine(
    'Curl femoral tumbado',
    'Banco donde te acostás boca abajo, con un rodillo detrás de los tobillos.',
  ),
  'calf-raise-standing': machine(
    'Gemelos de pie',
    'Almohadillas que apoyan en los hombros y un escalón para la punta de los pies.',
  ),
  'calf-raise-seated': machine(
    'Gemelos sentado',
    'Asiento con una almohadilla sobre las rodillas y un escalón para la punta de los pies.',
  ),
  'hip-thrust': machine(
    'Hip thrust',
    'Respaldo bajo para la espalda alta y una almohadilla que va sobre la cadera.',
  ),
  'hip-abduction': machine(
    'Abductora',
    'Asiento con dos almohadillas que van por fuera de las rodillas.',
  ),
  'hip-adduction': machine(
    'Aductora',
    'Asiento con dos almohadillas que van por dentro de las rodillas.',
  ),
  'chest-press': machine(
    'Press de pecho',
    'Asiento con respaldo vertical y dos manijas a la altura del pecho.',
  ),
  'pec-deck': machine(
    'Aperturas (pec deck)',
    'Asiento con respaldo vertical y dos brazos que se abren y se juntan delante del pecho.',
  ),
  'shoulder-press': machine(
    'Press de hombros',
    'Asiento con respaldo vertical y dos manijas a la altura de los hombros que se empujan hacia arriba.',
  ),
  pullover: machine(
    'Pullover',
    'Asiento con un brazo que pasa por encima de la cabeza y almohadillas para los codos.',
  ),
  'lat-pulldown': machine(
    'Jalón',
    'Asiento con almohadillas sobre los muslos y manijas arriba que se tiran hacia abajo.',
  ),
  'seated-row': machine(
    'Remo sentado',
    'Asiento vertical con un apoyo para el pecho y manijas delante que se tiran hacia el cuerpo.',
  ),
  'chest-supported-row': machine(
    'Remo con apoyo de pecho',
    'Almohadilla inclinada donde apoyás el pecho y manijas abajo que se tiran hacia arriba.',
  ),
  'preacher-curl': machine(
    'Curl predicador',
    'Asiento con un atril inclinado donde apoyás la parte de atrás de los brazos.',
  ),
};

/** S16 Buscador and S17 Detalle de ejercicio (13 §7, §9, §10). */
export const catalog = {
  muscles,
  equipment,
  machines,
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
    video: 'Ver un video',
    videoOnline: 'Se abre en YouTube.',
    videoOffline: 'Sin conexión. El video se abre en YouTube cuando tengas señal.',
    /** What YouTube is searched for when the team chose no video (RF-CAT-02 AC5). */
    videoSearch: (exercise: string) => `${exercise} técnica`,
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
