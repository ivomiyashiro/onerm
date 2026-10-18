# Análisis de performance: re-renders, consultas y Supabase (#221)

**Fecha:** 18 de octubre de 2026.
Primero se midió y después se escribió la regla (CLAUDE.md, «Performance»). Cada hallazgo que vale la pena corregir tiene su card.

## Cómo se midió

`bun run perf` (`tools/perf/app.perf.tsx`, con `jest.perf.config.json`) monta las **pantallas reales** con sus ViewModels, casos de uso y repositorios sobre una base SQLite real (`better-sqlite3` en memoria, con las migraciones de la app). Los datos son la rutina PLT-FB3, un entrenamiento en curso y **1.000 entrenamientos terminados** de 6 ejercicios con 3 series cada uno (RNF-03, RNF-14).

- **Compilado con React Compiler**, como Metro compila la app (`experiments.reactCompiler`). La suite de tests normal no lo usa: sin él, los re-renders contados no serían los de la app.
- **Renders por componente:** `tools/perf/render-counter.ts` reemplaza el runtime de JSX y cuenta cada render de cada componente función. Un **commit** es una actualización de la pantalla (`React.Profiler`).
- **SQL:** `tools/perf/measured-database.ts` cuenta cada sentencia, y cada escritura que cambió filas avisa a los observadores, como `expo-sqlite` en el teléfono.
- **Las esperas son en tiempo real y fuera de `act()`**, así React programa cada actualización como en el teléfono. Adentro de `act()` todas se juntarían en un solo commit.
- **Los tiempos son de Node** (V8, modo desarrollo) y solo sirven para comparar. La referencia es el teléfono: RNF-03 sigue pendiente de medirse en uno físico ([50](50-verificacion-rnf.md)).
- `PressabilityDebugView` aparece en los conteos porque Jest corre en modo desarrollo; en la build de release no existe.

## Resultados (1.000 entrenamientos)

| Escenario | Commits | Renders | SQL (lect. + escr.) | Último commit |
|---|---|---|---|---|
| S07 · montar | 3 | 85 | 17 + 0 | 211 ms |
| S07 · 3 s en pantalla, con un entrenamiento en curso | 3 | 6 | 0 | — |
| S09 · montar | 4 | 83 | 15 + 0 | 207 ms |
| S09 · 3 s en pantalla | 3 | 12 | 0 | — |
| S09 · «Hecho» | 2 | 131 | 22 + 7 | 113 ms |
| S09 · 3 s de descanso | **16** | **292** | 0 | — |
| S09 · la sync reescribe una fila del catálogo | 2 | 91 | 2 + 1 | 59 ms |
| `logSet` → emisión de `observeWorkout`, sin React | — | — | 20 + 5 | **41 ms** (11 ms sin historial) |
| S18 + S09 · montar | 4 | 203 | 16 + 0 | 243 ms |
| S18 + S09 · «Hecho» | 3 | 199 | 24 + 7 | 81 ms |

## Hallazgos

### 1. Cada serie recorre todo el historial (RNF-03) → #228

Con 0 o con 1.000 entrenamientos, confirmar una serie corre **el mismo SQL** (20 lecturas + 5 escrituras), pero el tiempo hasta que `observeWorkout` emite pasa de 11 a 41 ms. La diferencia es CPU de JavaScript: en cada emisión, `ObserveWorkout` arma `historyKey` con un `JSON.stringify` de las ~18.000 series del historial. Si se anula `historyKey` a modo de prueba, baja a 20 ms. `observeFinished` ya devuelve el mismo array mientras el historial no cambia (#141), así que se puede cachear por referencia. En Hermes, en un teléfono de gama media, este tiempo se multiplica. Es el riesgo más concreto para RNF-03.

### 2. Los relojes re-renderizan la pantalla entera → #229

- **Descanso:** `useCountdown` actualiza el estado cada 250 ms con `Date.now()`. Son 16 commits y 292 renders en 3 s (unos 97 renders por segundo), aunque el número visible cambia una vez por segundo. Se re-renderizan `Workout` (todo S09), `RestScreen`, `RestRing` y los dos `Chip`, que reciben un `onPress` nuevo en cada tick.
- **Tiempo transcurrido:** `useElapsed` vive en `Workout`. Cada segundo se re-renderiza la pantalla y también la hoja del menú del entrenamiento **cerrada**, porque su subtítulo usa la hora. En S07 pasa lo mismo con la card `NextDay`.
- #180 ya hizo que los relojes no corran en segundo plano. Esto es lo que cuestan en primer plano.

### 3. Los observadores avisan aunque nada cambió → #230

`observeQuery` vuelve a leer con cada cambio de sus tablas y **siempre emite un objeto nuevo**. El ViewModel hace `setState` con él y React no puede saltear el render, tampoco con React Compiler.

- Con S18 (Historial) montada, cada serie vuelve a correr `observePendingWorkouts`. Una serie en curso nunca está pendiente (RN-SYNC-13), pero llega un `Set` nuevo y `ObserveHistory` rearma los 1.000 ítems: un commit más y 18 filas de la lista re-renderizadas por cada serie.
- Una fila del catálogo reescrita igual re-renderiza S09: 2 commits y 91 renders.
- `sharedQuery` (#141) ya resuelve esto para el historial con una huella; el resto de los `observe…()` no lo tiene.

### 4. La sync reescribe el catálogo cada vez → #231

El pull empieza 5 s antes del cursor (ADR-0002 R2). El seed carga cada tabla del catálogo en un solo upsert, así que todas sus filas quedan con `server_updated_at` dentro de esa ventana. Cada sync las vuelve a bajar y `writeRemoteRow` las reescribe sin comparar, lo que dispara los observadores del catálogo (hallazgo 3). Esto sale de leer el código y de la medición del re-render; falta confirmarlo contra Supabase local, y #231 lo pide como test.

## Supabase: requests por sync

| Paso | Requests |
|---|---|
| Versión mínima (`app_config`, RN-SYNC-14) | 1 |
| Pull del catálogo (4 tablas, aunque no haya cambios) | 4 |
| Push (7 tablas): solo las que tienen filas pendientes, en lotes de 200 | 0 sin cambios |
| Pull de las tablas del usuario (7 tablas, paginado por keyset) | 7 |
| **Total de una sync sin cambios** | **12** |

- **Cuándo corre:** al abrir la app y al volver al primer plano, al reconectar, 3 s después de una escritura que dejó algo para subir, y a mano. Nunca por sondeo (RNF-22). Las series de un entrenamiento en curso no la disparan (`countPending` da 0, RN-SYNC-13).
- **Está bien:** sin polling, una sola sync a la vez, escrituras agrupadas, paginación por keyset con su índice y push en lotes. Lo único evitable son las 4 requests del catálogo, más su reescritura (hallazgo 4).
- `getSession()` es local: no sale a la red salvo para refrescar el token.

## Lo que está bien y no se toca

- `sharedQuery` comparte la lectura del historial entre todas las pantallas y no lo relee si su huella no cambió (#141). Con 1.000 entrenamientos, una serie **no relee el historial**: solo corre la huella, un `count`/`sum` en SQL sobre las filas terminadas. Recorre toda la tabla, pero dentro de SQLite y sin armar objetos.
- Montar S07 o S09 lee el historial una vez. Con 0 entrenamientos el último commit llega a los 71 ms y con 1.000 a unos 210 ms, pero la pantalla aparece antes con su esqueleto. Si crece, el camino es leer solo lo que el motor necesita (las últimas exposiciones por ejercicio).
- El historial (S18) usa una lista virtualizada: con 1.000 entrenamientos monta 9 filas.
- La escritura de una serie es una sola transacción local (5 escrituras).

## Fuera de este análisis

- **#182:** el bucle de frames de Reanimated que usa CPU con la app quieta. Ya tiene card.
- **Tiempos en el teléfono:** este arnés cuenta trabajo, no lo cronometra en un teléfono. Para RNF-03 sigue valiendo la medición en un teléfono físico de [52](52-recorrido-modo-avion.md#pendiente-para-una-persona).
