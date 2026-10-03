# Spike 13 — ¿La sync propia de ADR-0002 es realizable en el tiempo disponible? (punto de control del plan B)

- **Issue:** #13
- **Fecha:** 2026-10-03
- **Tiempo acotado:** 6 horas · **Tiempo real:** 2 horas
- **ADR / RNF relacionados:** ADR-0002 (plan B), RN-SYNC-03, 04, 06, 08, 13, 15, RN-GEN-03, RNF-04, RNF-05, 07 §4.1

## Pregunta

ADR-0002 elige una sync propia (push de filas `_dirty`, pull por cursor y LWW por registro) en vez de una librería, porque la defensa pide explicarla. El riesgo es que no entre en el tiempo disponible. Si este spike no cubre los casos básicos, se evalúa PowerSync u otra librería **antes de F4**, cuando todavía no hay código que dependa del modelo de sync.

## Criterio de éxito

- [x] Push de las filas `_dirty` con upsert por UUID: se adopta la fila que devuelve el servidor y se limpia `_dirty`.
- [x] Pull por keyset `(server_updated_at, id)` con ventana de solapamiento, aplicando LWW y borrado en el cliente.
- [x] Reenviar el mismo lote no duplica filas (RNF-04).
- [x] Dos clientes simulados con ediciones cruzadas convergen (RNF-05, versión reducida).
- [x] Estimación del esfuerzo para F8 y decisión explícita.

## Qué se hizo

Sobre las ramas de #11 y #12:
- **local:** el esquema Drizzle con `better-sqlite3`;
- **remoto:** el Supabase local, con la migración de RLS y triggers.

`src/data/sync/spike-sync.ts` (280 líneas) implementa 07 §4.1 para `workouts` → `workout_sets`:
- **Tablas como configuración:** el nombre remoto, la tabla de Drizzle y los mappers fila local ↔ fila remota (ms ↔ `timestamptz`). Sumar una tabla es sumar una entrada.
- **Push** en orden de dependencias, por lotes de 200:
  - sube con `upsert(...).select()` y adopta cada fila devuelta, salvo que la local haya cambiado mientras el pedido estaba en vuelo;
  - excluye los entrenamientos `in_progress` y sus hijos (RN-SYNC-13), y los hijos de filas en conflicto;
  - si el lote falla por un rechazo definitivo (42501, 23514, 23503, 23502), reintenta fila por fila y marca `_conflict` en las rechazadas (RN-SYNC-11). Cualquier otro error aborta.
- **Pull** por keyset `(server_updated_at, id)` en páginas de 500, con 5 s de solapamiento solo al inicio, y las cinco reglas de 07 §4.1 en una transacción por fila.
- `nextUpdatedAt()` (RN-GEN-03).

**Tests:** 13 en Jest contra el Supabase local, con un usuario y dos o tres "dispositivos" (bases locales independientes). Se hicieron 6 mutaciones del motor para comprobar que cada regla tiene un test que la detecta. 5 se detectan. La sexta (sacar el desempate por `id` del keyset) sobrevive: `clock_timestamp()` no repite valores con este volumen, y el empate de microsegundos no se puede forzar desde el cliente.

## Resultado

| Qué | Resultado |
|---|---|
| Push, adopción y `_dirty = 0` | ✅ La fila local queda igual a la del servidor, con `user_id` y `server_updated_at` asignados por él |
| Push que pierde por LWW | ✅ El servidor devuelve su versión y el cliente la adopta: converge sin pull |
| Push sobre un tombstone remoto | ✅ El cliente adopta el tombstone |
| RN-SYNC-13 | ✅ Un entrenamiento `in_progress` y sus series no salen, y no quedan en conflicto |
| Pull con páginas chicas | ✅ 20 filas en páginas de 7: ninguna se pierde ni se repite |
| Pull de más de 500 filas en la misma ventana de 5 s | ✅ 620 filas: push en 644 ms y pull en 215 ms (local, Docker) |
| Reglas del pull (local más nueva, local más vieja, tombstone sobre local `_dirty`, local borrada que no revive, tombstone de una fila que no existe) | ✅ Un test por regla |
| Idempotencia (RNF-04) | ✅ Reenviar el lote completo no duplica |
| Convergencia (RNF-05 reducido) | ✅ Dos dispositivos sin red, con ediciones cruzadas en el padre y en dos hijos y un borrado contra una edición posterior: después de A → B → A, los dos quedan idénticos y sin pendientes |

**Hallazgos que entran en F8:**
1. **El cursor guarda el string del servidor**, no un `Date`. `server_updated_at` tiene microsegundos y `Date` los trunca: un cursor truncado vuelve a pedir la última fila y, con una página llena del mismo milisegundo, el pull no avanzaría nunca. En `sync_state.cursor` va `TEXT`.
2. **Cada fila sale como mucho una vez por sync.** La primera versión repetía el push mientras quedaran filas `_dirty`, y una fila que no se limpiaba (por un bug en la adopción) dejaba el bucle colgado. Ahora queda pendiente para la próxima sync.
3. **Las reglas del pull casi nunca se ejercitan después de un push**, porque el push ya reconcilia. Solo importan para las filas que el push no subió (retenidas por un conflicto o editadas entre el push y el pull). Por eso los tests llaman a `push()` y `pull()` por separado, y así tienen que seguir en F8.
4. El lote es atómico en el servidor: una sola fila rechazada hace fallar las 200. El reintento fila por fila sirve, pero cuesta N pedidos. Con este volumen alcanza.

## Decisión

**Se confirma la sync propia (ADR-0002). El plan B no se activa.** El núcleo (push, pull, LWW, borrado e idempotencia) entró en 280 líneas y 2 horas, con todos los casos de 07 §4.1 cubiertos por tests contra Supabase real.

**Estimación para F8**, sobre el núcleo de este spike:

| Card | Qué falta | Estimación |
|---|---|---|
| #45 Respaldo automático con push y pull | Las 7 tablas en la configuración, `sync_state` persistente, disparadores de RN-SYNC-06 (3 s de agrupación, reconexión, primer plano, manual), backoff y "repetir al terminar" | 2 días |
| #46 Restauración, estado del respaldo y conflictos | Restauración inicial (07 §4.2), conteos de pendientes y conflictos (RN-SYNC-08), UI de estado | 1,5 días |
| #47 Cambios de otro dispositivo y sincronización manual | Aviso de cambios entrantes y botón manual | 1 día |
| #43 Unión de los datos del invitado | 07 §4.3, con `pending_migration_uid` y reintentos | 1,5 días |

En total, unos **6 días** de F8. El riesgo que queda está en la unión del invitado (#43), que no cubrió este spike.

## Código

Rama [`spike/13-push-pull`](https://github.com/ivomiyashiro/onerm/tree/spike/13-push-pull), que incluye las de #11 y #12. Se conserva como referencia y **no se mergea**. El motor y sus tests se reescriben con TDD en #45, y los tests siguen la misma estructura: push y pull por separado y dos dispositivos del mismo usuario.
