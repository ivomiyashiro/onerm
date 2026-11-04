# ADR-0013 — Estructura objetivo de la arquitectura y límites de F11

- **Estado:** Aceptado
- **Fecha:** 2026-11-04
- **Relacionado:** ADR-0009, ADR-0011, 12-arquitectura, RNF-11, F11 Arquitectura (#332)

## Contexto

La app funciona y sus capas se respetan: `domain` no importa React, Expo, Supabase ni Drizzle, y el lint lo vigila (RNF-11). Pero al crecer se acumuló desorden dentro de cada capa:

- `domain/repositories/` mezcla 10 repositorios con 8 puertos que no lo son y con `observer.ts`.
- `domain/usecases/` tiene 54 archivos de producción en una sola carpeta, y `domain/rules/` tiene archivos sueltos en la raíz junto a sus subcarpetas.
- Hay features que importan piezas de otras, y el lint no lo impide.
- `src/di` hace más que componer: lee `process.env`, registra listeners del sistema y configura SDKs.
- Muchos comandos leen con `observe…()` y `firstValue` lo que se podría leer una sola vez con `get…()`.

Ordenar esto no debe cambiar lo que la app hace. Este ADR fija cómo tiene que quedar la estructura y, sobre todo, **qué no se cambia**, para que ninguna card de F11 reabra decisiones. Las cards de la fase, los revisores y el juez de fase se apoyan en este documento.

## Decisión

### Lo que se adopta

1. **Repositorios y servicios separados.** `domain/repositories/` conserva solo los 10 `*-repository`. `domain/services/` agrupa los 8 puertos que no son repositorios: `auth-gateway`, `device-permissions`, `guest-union`, `local-database`, `rest-countdown`, `rest-notifier`, `sync-engine` y `sync-triggers`. El término «servicios» ya está en 12 §1. `observer.ts` pasa a `domain/observer.ts`, porque lo usan ambos grupos.
2. **Casos de uso por feature y reglas por tema.** Los casos de uso viven en `domain/usecases/<feature>/`. `domain/rules/` no tiene archivos sueltos en la raíz.
3. **Piezas compartidas en `presentation/shared/`.** Una feature no importa otra, salvo las excepciones listadas en el lint.
4. **El composition root solo compone.** Las políticas de infraestructura (variables de entorno, listeners del sistema, configuración de SDKs) salen de `src/di` y pasan a `src/data`.
5. **Los comandos leen con `get…()`.** `observe…()` queda para lo que se observa de verdad: un caso de uso `Observe…` sigue observando.

### Lo que no se cambia

Son límites de toda la fase. Si una card o un revisor pide alguno de estos cambios, la respuesta es este ADR.

| Decisión | Motivo |
|---|---|
| Los casos de uso siguen en `domain` y siguen siendo clases con `execute` (ADR-0011 §5). No se crea `src/application`. | Una capa más no resuelve el desorden, que es de carpetas. Para una persona, y para defenderlo en el TPO, tres capas se explican mejor. |
| Los modelos siguen siendo tipos, con las reglas en funciones puras (ADR-0009). No se introducen clases de dominio. | El motor es un fold puro sobre datos planos. Las clases complicarían los mappers y las pruebas por tablas de casos (RNF-15), sin ganar nada. |
| Los modelos de lectura con forma de pantalla (`WorkoutExerciseView`, `ObserveBackupNotice`) siguen en `usecases`. | Son la salida de su caso de uso, no conceptos del dominio. Moverlos a `models/` los presentaría como lo que no son. |
| `SessionWatcher`, `SyncWatcher` y `GuestUnionGate` siguen como componentes. | Dependen de montarse dentro de `StartupGate`, cuando las migraciones ya corrieron (07 §6). Sacarlos de React obligaría a reproducir ese orden a mano. |
| La orquestación que hoy está en ViewModels y hooks (`log` → descanso, `use-after-auth`) no se mueve a casos de uso. | Coordina efectos de la pantalla y funciona. Moverla es el cambio con más riesgo de alterar el comportamiento, y no aporta una regla nueva que probar. |
| `WorkoutRepository.delete` sigue resolviendo si el borrado es físico o lógico según el estado (RN-SYNC-13, I-07), y RN-SYNC-15 sigue en `writeSyncRow`. | Son reglas de filas y tombstones: dependen de cómo se persiste, no del negocio. |
| Las rutas siguen como literales. No se crean constantes de rutas. | `experiments.typedRoutes` ya las valida al compilar. Las constantes duplicarían esa garantía. |
| `domain/testing` y `presentation/use-cases/testing.ts` no se mueven. | Están bien ubicados junto a lo que simulan. El riesgo real es usarlos en producción, y #338 lo impide con el lint. |

### Consumidores de casos de uso

ADR-0011 §1 nombraba solo a `useXViewModel`. En el código también los consumen los hooks `use-*` de una feature y los archivos `*-watcher.tsx`, y eso se acepta: son lógica sin JSX visual de pantalla, con el mismo papel de coordinación. Los componentes visuales no pueden consumirlos, y hoy se cumple. ADR-0011 §1 queda actualizado con referencia a este ADR.

### Deriva registrada

ADR-0011 §2 y 12 §4 dicen que el store global guarda el entrenamiento en curso y el temporizador. **No es así:** `app-store.ts` guarda el dueño de los datos, el estado de sync y las solicitudes de unión. El entrenamiento en curso y el descanso se observan desde SQLite, que es lo que pide RN-SYNC-01. El código está bien y el texto quedó viejo: la corrección va en #348, junto con el resto de 12.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| **Ordenar dentro de las capas actuales** (elegida) | No cambia conceptos ni dependencias. Cada movimiento se puede comprobar con lint, tests y `bun run perf` | No aporta nada visible para la persona usuaria y deja algunas deudas aceptadas (ver arriba) |
| Renombrar `repositories/` a `ports/` | Es el término clásico de arquitectura hexagonal y cubre a los dos grupos | Cambia un nombre que usa toda la especificación, y mezcla dos conceptos que acá se quieren separar. 12 §1 ya distingue repositorios y servicios |
| Crear `src/application` para los casos de uso | Separa reglas de negocio y orquestación, como Clean Architecture estricta | Una capa más para una persona, sin una regla nueva que vigilar. Obliga a cambiar ADR-0011, 12 y el lint a la vez |
| Funciones en lugar de clases para los casos de uso | Menos código repetido | Toca los 50 y tantos casos de uso y su composición, sin cambiar nada de lo que hacen. Es riesgo sin beneficio |

## Consecuencias

**Positivas**
- La estructura se puede leer sin conocer la historia del proyecto y se explica mejor en la defensa.
- Los límites de la fase están escritos: lo descartado no se vuelve a discutir en cada revisión.
- Los revisores tienen una referencia para detectar desvíos (#350).

**Negativas**
- Muchos archivos se mueven, y eso dificulta seguir su historia con `git blame`. Se mitiga moviendo sin editar en el mismo commit.
- Durante la fase conviven la estructura vieja y la nueva.
- 12 §5 y `CLAUDE.md` quedan desactualizados hasta #348.

## Riesgos y mitigaciones

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Un refactor cambia el comportamiento sin que los tests lo vean | Línea base y recorrido reproducible en [`docs/pruebas/332-regresion-arquitectura.md`](../../pruebas/332-regresion-arquitectura.md). Cada card compara contra ese contrato |
| R2 | Un movimiento agrega renders o consultas | La regla de comparación de perf de ese documento se aplica a cada card |
| R3 | La fase se extiende a cambios que este ADR descarta | La tabla «Lo que no se cambia» y el «Fuera de alcance» de cada card. Pedir uno de esos cambios requiere otro ADR |
| R4 | Una excepción de lint se vuelve la forma de esquivar la regla | Cada excepción lleva su motivo, y `phase-judge` las cuenta al cerrar la fase (#350) |

## Cuándo revisar esta decisión

- Si `domain/usecases/<feature>/` deja de alcanzar, por ejemplo con casos de uso que no pertenecen a ninguna feature en cantidad.
- Si la orquestación de un ViewModel necesita correr sin esa pantalla: ahí sí pasa a un caso de uso, con su propio ADR.
- Si las excepciones de lint entre features crecen de una fase a otra: la división por features no estaría reflejando bien la app.
