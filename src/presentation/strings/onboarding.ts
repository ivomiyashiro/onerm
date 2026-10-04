/** S05 Onboarding and S06 Recomendación (13 §2, §10). */
export const onboarding = {
  stepOf: (n: number) => `Paso ${n} de 3`,
  skip: 'Saltear',
  back: 'Atrás',
  next: 'Siguiente',
  seeMyRoutine: 'Ver mi rutina',
  level: {
    question: '¿Cuánta experiencia tenés entrenando con pesas?',
    novice: {
      title: 'Estoy empezando',
      body: 'Hace menos de 6 meses que entreno, o vuelvo después de un tiempo largo.',
    },
    intermediate: {
      title: 'Tengo algo de experiencia',
      body: 'Entreno regularmente hace entre 6 meses y 2 años.',
    },
    advanced: {
      title: 'Tengo mucha experiencia',
      body: 'Entreno hace más de 2 años y armo mis propias rutinas.',
    },
  },
  goal: {
    question: '¿Qué buscás principalmente?',
    health: {
      title: 'Sentirme mejor y más fuerte',
      body: 'Salud general: entrenar de forma segura y constante.',
    },
    hypertrophy: { title: 'Ganar músculo', body: 'Aumentar el tamaño muscular.' },
    strength: { title: 'Ganar fuerza', body: 'Poder levantar más peso.' },
  },
  days: {
    question: '¿Cuántos días por semana podés entrenar?',
    help: 'Siendo realista: es mejor poco y constante.',
  },
  recommendation: {
    title: 'Te recomendamos',
    weRecommend: (template: string) => `Te recomendamos ${template}`,
    why: '¿Por qué?',
    start: 'Empezar con esta rutina',
    seeOthers: 'Ver otras rutinas',
    notNow: 'Ahora no',
    equipment: 'Máquinas y mancuernas',
    noviceManyDays: 'Con 3 días alcanza para progresar. Si querés más, también tenés la de 4 días.',
    intermediateManyDays: 'Esta rutina es de 4 días: podés repetir la rotación sin problema.',
  },
} as const;
