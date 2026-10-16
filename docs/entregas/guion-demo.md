# Guion de la demo (entrega final, §7.5)

Estructura recomendada por la cátedra: **problema → escenario → acción del usuario → respuesta de la aplicación → valor generado**. Duración objetivo: 8 a 10 minutos, más las preguntas.

**Dispositivo:** el emulador de Android (plataforma de referencia) proyectado, o un teléfono por `scrcpy`. La app instalada como development build, con Metro corriendo, o como build de release (`bunx expo run:android --variant release`).

## Antes de la demo

**El día anterior**
- [ ] **Despertar Supabase en la nube.** El plan gratuito pausa el proyecto tras 7 días sin actividad. Hay que entrar a [supabase.com/dashboard](https://supabase.com/dashboard), abrir el proyecto `onerm` y, si dice *Paused*, tocar **Restore project** (tarda unos minutos). Después, iniciar sesión una vez desde la app para confirmar que responde.
- [ ] `.env.local` con la URL `https://…supabase.co` del proyecto en la nube y su clave publicable, y la app recompilada si cambió (`bun run android`).
- [ ] **Dispositivo A, «con historia»:** una cuenta de demo con al menos 3 entrenamientos del Día A en días distintos, para que se vean sugerencias que suben, el gráfico del 1RM estimado y récords. En el último, Prensa de piernas con 80 kg × 12, 12, 12, así la próxima sugerencia es **85 kg × 8** (RF03).
- [ ] **Dispositivo B, «recién instalado»:** datos borrados (`adb shell pm clear com.training.onerm`), para mostrar el primer uso en modo avión.
- [ ] Permisos de notificaciones y de alarmas exactas concedidos en el dispositivo A, con la pantalla bloqueándose en 30 s, para mostrar el aviso de fin de descanso.
- [ ] `bun run typecheck && bun run lint && bun run test` en verde y el CI de `main` en verde (por si preguntan).

**Justo antes**
- [ ] Modo avión **activado** en el dispositivo B.
- [ ] Descanso por defecto corto en la rutina de demo (60 s), para no esperar 2 minutos.
- [ ] Cerrar las notificaciones viejas y dejar el volumen alto para la vibración.

## Guion

### 1. Problema (30 s)
> «Quien entrena fuerza no sabe con cuánto peso hacer cada ejercicio para seguir progresando sin lastimarse. Hoy lo decide a ojo, lo anota en el celular o en un papel que se pierde, o paga un personal trainer. Y muchos gimnasios están en un subsuelo, sin señal.»

### 2. Escenario (30 s)
> «Martín empieza en el gimnasio. Abre la app por primera vez, en el subsuelo, sin señal.»

### 3. Primer uso sin conexión — RF01 (1 min 30 s) · dispositivo B, en modo avión
| Acción | Respuesta | Qué mostrar |
|---|---|---|
| «Continuar sin cuenta» | Onboarding de 3 preguntas, sin pedir conexión ni cuenta | El ícono de modo avión en la barra |
| Responder nivel, objetivo y días | Recomienda «Cuerpo completo A/B — 3 días» y explica por qué | «¿Por qué?» con los criterios y sus fuentes |
| «Empezar con esta rutina» | Inicio con «Hoy toca Día A» y sus ejercicios | La rutina quedó activa sin red |

### 4. Entrenar — RF02 (2 min) · dispositivo B, en modo avión
| Acción | Respuesta | Qué mostrar |
|---|---|---|
| Botón central «Empezar» | S09 con el primer ejercicio y «Primera vez: elegí un peso…» | La calibración del ejercicio nuevo |
| Ajustar la carga con ±, elegir el esfuerzo y «Hecho» | Vibra, la serie queda hecha, arranca el descanso a pantalla completa | Un toque por serie; ± en los saltos del equipamiento |
| Se calcula la serie 2 | «Calculado a partir de lo que hiciste…» | La sugerencia sale del esfuerzo de la calibración |
| **Matar la app** desde los recientes y reabrirla | Vuelve a S09 con la serie guardada y el descanso con su tiempo real | RNF-02: nada se pierde |

### 5. La sugerencia y su motivo — RF03 (1 min 30 s) · dispositivo A
| Acción | Respuesta | Qué mostrar |
|---|---|---|
| Inicio, Prensa de piernas | «85 kg × 8» con el ícono de que sube | Venía de 80 kg × 12, 12, 12 |
| Empezar y tocar «¿Por qué?» | «¡Completaste 3 × 12! Subimos a 85 kg.», con la regla, los datos y el principio | El motor es determinista y explicable, sin IA |
| «Hecho» y bloquear la pantalla | Al terminar el descanso llega la notificación con la pantalla bloqueada | RNF-23: < 1 s de retraso medido |

### 6. Progreso — RF04 (1 min) · dispositivo A
| Acción | Respuesta | Qué mostrar |
|---|---|---|
| Progreso → Historial | Entrenamientos por mes, con récords | |
| Un entrenamiento → editar una serie | La sugerencia del próximo día cambia al instante | El pasado es editable y los derivados se recalculan |
| Progreso del ejercicio | Gráfico del 1RM estimado y récords | |
| Volumen | Series por músculo de la semana, con la guía de 8 a 12 | |

### 7. Respaldo — sin bloquear el entrenamiento (1 min) · dispositivo A, con cuenta
| Acción | Respuesta | Qué mostrar |
|---|---|---|
| Modo avión y registrar una serie | El entrenamiento no cambia; Perfil dice «1 cambio sin respaldar · sin conexión» | RNF-10: la sync nunca interrumpe |
| Quitar el modo avión | Perfil vuelve a «Respaldado · hace menos de 1 min» | La sync corre aparte |
| (Opcional) Iniciar sesión con la misma cuenta en el dispositivo B | «Restaurando tus datos… N %» y aparece el historial | El historial no se pierde al cambiar de teléfono |

### 8. Valor (30 s)
> «Martín sabe qué hacer hoy en cada ejercicio, entiende por qué, lo registra con un toque aunque no haya señal y ve que progresa. Sin pagar un trainer y sin perder lo anotado.»

## Preguntas probables y dónde está la respuesta

| Tema | Dónde |
|---|---|
| Arquitectura, capas, ViewModel | README «Architecture», [12-arquitectura](../especificacion/12-arquitectura.md), [ADR-0011](../especificacion/adr/0011-mvvm-clean-en-react-native.md); ejemplo: `src/presentation/features/workout/use-workout-view-model.ts` |
| Estado y navegación | Zustand (`src/presentation/state`), Expo Router (`app/`) |
| Persistencia | Drizzle + SQLite (`src/data/db/schema.ts`, `src/data/repositories`), migraciones en `drizzle/` |
| Networking y sincronización | `src/data/sync` (push, pull, motor), `src/domain/usecases/sync-scheduler.ts`; [07](../especificacion/07-datos-y-sincronizacion.md) |
| Motor de sugerencias | `src/domain/rules/suggestion`, con los casos de referencia como tests |
| Capacidades del dispositivo | Notificación programada, alarmas exactas, pantalla encendida y vibración; GPS, cámara y sensores descartados porque no resuelven el problema |
| UX | Un toque por serie, acción principal abajo, nada interrumpe el entrenamiento, «¿Por qué?» en cada sugerencia; accesibilidad en [48](../pruebas/48-accesibilidad.md) |
| Uso de IA | README «Team», §8 de la consigna: todo cambio pasó por tests, CI y revisión, y se puede explicar |
