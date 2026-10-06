import { count } from '@/presentation/strings/plural';

/** Actions and words repeated across screens (13-textos). */
export const common = {
  /** The text of the logo (Figma «Logo/Marca»). */
  brandMark: '1RM',
  cancel: 'Cancelar',
  retry: 'Reintentar',
  continue: 'Continuar',
  save: 'Guardar',
  done: 'Hecho',
  ready: 'Listo',
  close: 'Cerrar',
  notNow: 'Ahora no',
  accept: 'Aceptar',
  next: 'Siguiente',
  back: 'Atrás',
  skip: 'Saltear',
  why: '¿Por qué?',
  understood: 'Entendido',
  newRecord: 'Nuevo récord',
  skipped: 'Salteado',
  units: { kg: 'kg', lb: 'lb' },
  /** Load convention (13 §9). */
  loadUnit: {
    perDumbbell: 'por mancuerna',
    perSide: 'por lado',
    totalWithBar: 'total con barra',
  },
  days: (n: number) => count(n, 'día', 'días'),
  minutes: (n: number) => `~${n} min`,
  exercises: (n: number) => count(n, 'ejercicio', 'ejercicios'),
  sets: (n: number) => count(n, 'serie', 'series'),
} as const;
