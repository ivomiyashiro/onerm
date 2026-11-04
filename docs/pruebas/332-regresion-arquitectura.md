# Línea base de no regresión para F11 (#332)

**Fecha:** 4 de noviembre de 2026.
**Commit:** `aa9bd0c` de `main`, antes de cualquier refactor de F11.
**Decisiones de la fase:** [ADR-0013](../especificacion/adr/0013-estructura-objetivo-de-la-arquitectura.md).

Este documento define qué significa «la app sigue igual» durante F11. Las cards de la fase usan la regla de comparación de perf y el recorrido. La línea base de abajo solo se usa en #348, al cerrar la fase.

## 1. Tests

| Suite | Comando | Resultado |
|---|---|---|
| Unitarios y de pantalla | `bun run test` | 2789 tests en 242 suites |
| Integración | `bun run test:int` | 225 tests en 20 suites |
| Servidor | `bun run test:supabase` | 39 de pgTAP en 2 archivos, y 56 de Jest en 4 suites |

Todos pasan. Una card de F11 puede cambiar estas cantidades solo si el PR explica por qué.

## 2. Performance

3 corridas de `bun run perf`, una detrás de otra y con la máquina sin compilar nada. Un rango indica que el valor cambió entre corridas; los commits dependen de cuándo caen los timers reales.

| Escenario | Commits | Renders | SQL (lect. + escr., máx.) | Último commit (ms, Node) |
|---|---|---|---|---|
| S07 mount | 3 | 133 | 20 + 0 | 242–490 |
| S07 3 s on screen (clock) | 3 | 6 | 0 + 0 | 2899–2903 |
| S09 mount | 3 | 99 | 15 + 0 | 177–306 |
| S09 3 s on screen (clock) | 3 | 6 | 0 + 0 | 2889–2900 |
| S09 «Hecho» (RNF-03) | 3–4 | 139–144 | 22 + 7 | 70–142 |
| S09 3 s of rest (countdown) | 3 | 17–18 | 0 + 0 | 2010–2996 |
| S09 sync rewrites one catalog row | 0–1 | 0–6 | 2 + 1 | 0–75 |
| logSet → observeWorkout (1000 workouts) | 0 | 1 | 20 + 5 | 11–13 |
| S18 + S09 mount | 3–4 | 227 | 16 + 0 | 219–645 |
| S18 + S09 «Hecho» | 4 | 144 | 24 + 7 | 46–49 |

Máximo de renders por componente en las 3 corridas (línea `components:`):

| Escenario | Componentes |
|---|---|
| S07 mount | Text 66, Animated(View) 15, SkeletonBlock 12, SvgMock 7, TodayRow 6, Icon 5, SkeletonRow 4, EntranceStep 3, HomeScreen 2, ElapsedText 2 |
| S07 3 s on screen (clock) | ElapsedText 3, Text 3 |
| S09 mount | Text 24, PressabilityDebugView 10, Overlay 10, SvgMock 8, Icon 6, Animated(View) 5, BottomSheet 5, Dialog 5, WorkoutScreen 3, Button 3 |
| S09 3 s on screen (clock) | ElapsedText 3, Text 3 |
| S09 «Hecho» (RNF-03) | Text 24, PressabilityDebugView 20, Overlay 18, Animated(View) 16, Dialog 10, BottomSheet 7, SetRow 6, GestureDetector 6, Button 5, Icon 3 |
| S09 3 s of rest (countdown) | RestEnd 3, RestPanel 3, GestureDetector 3, Animated(View) 3, RestRing 3, Text 3 |
| S09 sync rewrites one catalog row | RestEnd 1, RestPanel 1, GestureDetector 1, Animated(View) 1, RestRing 1, Text 1 |
| S18 + S09 mount | Text 57, Animated(View) 24, PressabilityDebugView 19, SvgMock 15, Icon 13, SkeletonBlock 12, Overlay 11, VirtualizedListCellContextProvider 10, GestureDetector 8, ItemWithSeparator 7 |
| S18 + S09 «Hecho» | Text 24, PressabilityDebugView 20, Overlay 18, Animated(View) 16, Dialog 10, BottomSheet 7, GestureDetector 6, SetRow 6, Button 5, Icon 3 |

**Límite del arnés:** `components:` muestra solo los 10 componentes con más renders de cada escenario (`tools/perf/app.perf.tsx`). Uno que está fuera de esa lista no se puede comparar por componente, aunque sí cuenta en el total de renders. Tampoco cuenta los componentes envueltos en `React.memo` o `forwardRef` ([221](221-performance.md)).

## 3. Regla de comparación de perf

La misma para todas las cards. Se comparan 3 corridas de la rama con 3 de su commit base (`git merge-base origin/main HEAD`), por escenario:

- **SQL (lecturas + escrituras):** el máximo de la rama no supera el máximo de la base.
- **Commits:** el máximo de la rama no supera el máximo de la base.
- **Renders, por componente (línea `components:`):** los componentes que ya existían no superan su máximo de la base. Un componente nuevo no renderiza más veces que su padre y se lista en el PR. Uno movido o renombrado se compara con su versión anterior.
- **Tiempos de Node:** solo orientan; no aprueban ni rechazan.
- Un exceso se repite una vez. Si persiste, se frena y se avisa.

La línea base de la sección 2 solo se usa en #348. Las demás cards comparan contra su propio commit base.

## 4. Recorrido reproducible

Cada paso tiene su captura en `332/<plataforma>/<ID>.png`. El recorrido se manejó con `adb` en Android y con [idb](https://fbidb.io) en iOS, leyendo el árbol de accesibilidad.

### Entorno

| Recorrido | Android | iOS |
|---|---|---|
| A y B | Emulador Pixel_10 (Android 16) en **modo avión**, sin variables de Supabase | Simulador iPhone 17 Pro (iOS 26.5), **sin servidor configurado**, porque no tiene modo avión |
| C | Sin modo avión, contra Supabase local | Contra Supabase local |

**Build:** `bunx expo run:android --no-bundler` y `bunx expo run:ios --no-bundler`, desde el worktree de la card, que no tiene `.env.local`. Las variables `EXPO_PUBLIC_*` las incorpora Metro al armar el bundle, así que cada recorrido arranca Metro con las suyas y `--clear`.

**Entorno de C:**

```bash
bunx supabase start
KEY=$(bunx supabase status -o env | sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p')
# Android
EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:55321 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$KEY" bunx expo start --dev-client --clear
# iOS
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$KEY" bunx expo start --dev-client --clear
```

**Nunca se copia `.env.local` ni se usa una URL `supabase.co`:** crearía cuentas de prueba en el proyecto real. Si el stack local no levanta, se frena.

### A · Núcleo sin conexión

Parte de datos borrados: `adb shell pm clear com.training.onerm` en Android, y desinstalar y reinstalar la app en iOS.

| ID | Cómo | Resultado esperado | Android | iOS |
|---|---|---|---|---|
| A1 | Abrir la app | S01 con «Continuar sin cuenta», «Crear cuenta» e «Iniciar sesión» | ✅ | ✅ |
| A2 | «Continuar sin cuenta» y elegir «Estoy empezando» | Paso 1 de 3 con la opción marcada | ✅ | ✅ |
| A3 | «Ganar músculo», 3 días, «Ver mi rutina» | S06 recomienda Cuerpo completo A/B, 3 días | ✅ | ✅ |
| A4 | «Empezar con esta rutina» | S07 con «Empezar Día A» | ✅ | ✅ |
| A5 | «Empezar Día A» | S09 en Prensa de piernas: «Primera vez», series sin carga | ✅ | ✅ |
| A6 | Tocar la serie 1: 80 kg, × 6, «2 o 3» | Hoja con los valores cargados | ✅ | ✅ |
| A7 | «Hecho» y aceptar los permisos | Serie 1 hecha, a 80 kg; las siguientes se precargan a 80 kg × 6 | ✅ | ✅ |
| A8 | Matar el proceso durante el descanso y reabrir | Retoma con la serie guardada y el tiempo real (RNF-02) | ✅ | ✅ |
| A9 | Menú, «Finalizar entrenamiento», «Finalizar igual», «Ahora no» en D13 | S12 con el ejercicio hecho y el resto salteado | ✅ | ✅ |
| A10 | «Listo» | S07 con «Empezar Día B» | ✅ | ✅ |
| A11 | Pestaña Progreso | S18 con el entrenamiento del Día A | ✅ | ✅ |
| A12 | Abrir el detalle, editar la serie 1 y subir la carga | S19 con la serie 1 a 85 kg, sin cambiar las demás | ✅ | ✅ |

En Android, A7 a A9 registran 3 series y en iOS 1: en iOS el recorrido siguió a B desde el primer descanso. A7 en Android muestra además la fila que pide permitir las alarmas, y A8 se reconecta a Metro porque el development build vuelve a su inicio al matar el proceso. Ninguna de las dos cosas pasa en una build de release.

### B · Descanso y dispositivo

Parte del estado de A, con un entrenamiento en curso. En Android se permiten las alarmas exactas con `adb shell appops set com.training.onerm SCHEDULE_EXACT_ALARM allow`, y la pantalla de bloqueo se activa con `adb shell locksettings set-disabled false` (después se vuelve a dejar en `true`).

| ID | Cómo | Resultado esperado | Android | iOS |
|---|---|---|---|---|
| B1 | Primera serie del entrenamiento | Android: D05 y después el pedido del sistema. iOS: directo el pedido del sistema (08) | ✅ | ✅ sin captura |
| B2 | Registrar una serie | Descanso a pantalla completa con el tiempo total y la serie siguiente | ✅ | ✅ |
| B3 | Android: salir a Inicio y abrir las notificaciones | Notificación «Descanso» con la cuenta regresiva y la serie siguiente | ✅ | No aplica: la cumple el Live Activity de B4 |
| B4 | Bloquear la pantalla durante el descanso | iOS: Live Activity con la cuenta regresiva. Android: notificación en curso | ⚠️ ver abajo | ✅ tras aceptar el permiso del sistema |
| B5 | Esperar el fin del descanso con la pantalla bloqueada | «¡Descanso terminado!» con la serie siguiente | ✅ | ✅ |
| B6 | «Agregar serie» y deslizar la serie nueva a la izquierda | Aparece la papelera | ✅ | ✅ |
| B7 | Tocar la papelera | La serie agregada desaparece y quedan las otras | ✅ | ✅ |

**Pendiente en el iPhone físico:** el aviso con sonido y vibración, y el tiempo de entrega de B5. El simulador muestra la notificación, pero no reproduce hápticos.

### C · Cuenta y sync

Parte del invitado con historial que dejó A, sin entrenamiento en curso. El email de prueba es `test332a@example.com` en Android y `test332i@example.com` en iOS, y solo existen en el stack local.

| ID | Cómo | Resultado esperado | Android | iOS |
|---|---|---|---|---|
| C1 | Perfil, «Crear cuenta», completar y confirmar | Se crea la cuenta | ✅ | ✅ |
| C2 | Esperar la unión del invitado | «Revisando tu cuenta…» y Perfil con el email; sin perder ni duplicar filas | ✅ | ✅ |
| C3 | Esperar el respaldo en Perfil | «Respaldado · hace menos de 1 min», y las filas en Postgres (consulta abajo) | ✅ | ✅ |
| C4 | «Cerrar sesión» | Sin datos del usuario en el dispositivo: Perfil de invitado y «Empezar» no disponible | ✅ | ✅ |
| C5 | «Iniciar sesión» con la misma cuenta | Entra y vuelve a Perfil | ✅ | ✅ |
| C6 | Abrir Progreso, el detalle e Inicio | Restaurados: el historial con la corrección de A12 y «Empezar Día B» | ✅ | ✅ |
| C7 | Tocar «Continuar con Google», sin iniciar sesión | Android: «Ingresando…» y el flujo de Google. iOS: sin botón, porque no hay cliente de iOS configurado (ADR-0012) | ✅ | ✅ |

Consulta de C3, con los valores que dio cada plataforma:

```bash
docker exec supabase_db_onerm-mvp psql -U postgres -At -c "select s.load_kg, s.reps from public.workout_sets s join auth.users u on u.id = s.user_id where u.email = '<email>' order by s.created_at;"
```

| Plataforma | Entrenamientos | Series |
|---|---|---|
| Android | 1 | 85 × 6, 80 × 6, 80 × 6 |
| iOS | 1 | 85 × 6 |

## 5. Problemas previos y observaciones

Se anotan para no atribuírselos a F11. Ninguno lo causó esta card, que no cambia código.

| Observación | Plataforma | Estado |
|---|---|---|
| **B4:** con la pantalla bloqueada, la notificación en curso se ve solo como un ícono compacto, sin el número de la cuenta regresiva. La cuenta regresiva sí se ve en el panel de notificaciones (B3) y el aviso del final se ve completo (B5). Puede ser el modo compacto de notificaciones de Android 16 en el bloqueo. | Android | Sin card: falta confirmarlo en un teléfono físico |
| Después de crear la cuenta, «Respaldando…» duró cerca de un minuto, con el emulador muy exigido. En iOS terminó en menos de 10 s. | Android | Referencia para comparar, sin card |
| Al cargar el bundle de desarrollo con la máquina muy exigida, el sistema mostró «OneRM isn't responding» y la app siguió al tocar «Wait». No se vio ningún error de la app en los registros. | Android | Propio del entorno de desarrollo |
| La primera vez que se tocó «Continuar con Google», el emulador terminó mostrando Google Calendar. La segunda vez abrió el flujo normal de Google, y no se repitió. | Android | Sin card: no hay cuenta de Google en el emulador y no se pudo reproducir |
