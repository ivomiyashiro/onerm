/**
 * Texts of the development-only component showcase (#19): section names and sample values. The
 * real texts it shows come from the catalog (`strings`).
 */
export const devShowcase = {
  title: 'Componentes',
  sections: {
    buttons: 'Botones',
    steppers: 'Carga y repeticiones',
    fields: 'Campos',
    feedback: 'Estados',
    sync: 'Respaldo',
    overlays: 'Hojas y diálogos',
  },
  buttons: {
    start: 'Empezar',
    done: 'Hecho',
    saving: 'Guardando…',
    seeAll: 'Ver todos',
    skip: 'Saltear',
    deleteSet: 'Eliminar serie',
    discard: 'Descartar',
  },
  stepper: {
    load: 'Carga',
    reps: 'Repeticiones',
    unit: 'kg',
    loadNote: 'Subimos 2,5 kg',
    repsError: 'Mínimo 1',
    decreaseLoad: 'Bajar la carga',
    increaseLoad: 'Subir la carga',
    decreaseReps: 'Bajar las repeticiones',
    increaseReps: 'Subir las repeticiones',
  },
  field: {
    label: 'Email',
    placeholder: 'vos@correo.com',
    help: 'Si existe una cuenta con ese email, te enviamos un enlace.',
    error: 'Email o contraseña incorrectos.',
  },
  empty: {
    title: 'No encontramos ejercicios',
    body: 'Probá con otra palabra o quitá filtros.',
    action: 'Limpiar filtros',
  },
  overlays: {
    openSheet: 'Abrir la hoja',
    openDialog: 'Abrir el diálogo',
    showSnackbar: 'Mostrar el aviso',
    sheetTitle: 'Press de banca con barra',
    sheetSubtitle: 'Ejercicio 2 de 6',
    close: 'Cerrar',
  },
} as const;
