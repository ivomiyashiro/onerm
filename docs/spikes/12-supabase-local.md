# Spike 12 — ¿El servidor impone solo, con RLS y triggers, las reglas de 07 §3, y se puede testear con dos usuarios?

- **Issue:** #12
- **Fecha:** 2026-10-03
- **Tiempo acotado:** 4 horas · **Tiempo real:** 1,5 horas
- **ADR / RNF relacionados:** ADR-0001, ADR-0002, RN-SYNC-03, RN-SYNC-04, RN-SYNC-12, RN-SYNC-15, RNF-04, RNF-06, 07 §3

## Pregunta

ADR-0001 deja la app hablando directo con Supabase, sin backend propio. Entonces la base es la única que puede imponer:
- LWW por `updated_at`;
- el borrado que prevalece;
- el acotado de los `updated_at` del futuro;
- el `server_updated_at`;
- que nadie lea ni escriba datos ajenos.

Si los triggers no alcanzan, hace falta otro ADR antes de F6.

## Criterio de éxito

- [x] Supabase CLI en local (Docker) con una migración versionada en `supabase/migrations/`.
- [x] Una tabla de ejemplo con RLS por `user_id = auth.uid()`.
- [x] Un trigger que:
  - asigna `server_updated_at`;
  - rechaza un `updated_at` más viejo que el guardado;
  - aplica el borrado sin mirar `updated_at`;
  - no permite vaciar `deleted_at`;
  - acota los `updated_at` adelantados.
- [x] El upsert devuelve la fila resultante (ADR-0002, punto 6b).
- [x] Test automatizado con dos usuarios: ninguno lee ni modifica las filas del otro.
- [x] Script `test:supabase` y job de CI que levanta Supabase local. `CLAUDE.md` actualizado.

## Qué se hizo

**Versiones:** Supabase CLI 2.119.0 (paquete `supabase` de npm, como devDependency), `@supabase/supabase-js` 2.117.2, pgTAP del stack local, Docker 27.5.

1. `supabase init`. En `config.toml` se apagaron studio, storage, realtime, edge runtime y analytics, que no se usan. El stack arranca en unos 50 s en local y en unos 60 s en la CI.
2. **Puertos 553xx y `project_id = "onerm-mvp"`.** En la máquina ya corría un stack con el `project_id` `onerm` de un proyecto anterior, con datos, y el CLI lo reusaba en vez de crear uno nuevo. No se tocó.
3. Migración con `workouts` y `workout_sets` reducidas, las columnas comunes de 07 §2.1, RLS «own rows» (`for all to authenticated`, con `(select auth.uid())` para que Postgres lo evalúe una sola vez por consulta) e índices `(user_id, server_updated_at, id)` para el pull por keyset.
4. **Una sola función de trigger**, `sync_before_write()`, `BEFORE INSERT OR UPDATE`, con los pasos a–j de 07 §3 en el mismo orden:
   - el paso c recibe por argumento la tabla padre y la columna FK (`sync_before_write('workouts', 'workout_id')`), así la misma función sirve para todas las tablas;
   - en g e i devuelve `old` con el `server_updated_at` nuevo.
5. `sync_cascade_delete()`: `AFTER UPDATE OF deleted_at`, con la tabla hija y la FK por argumento. Las dos funciones son `security definer` con `search_path = ''`.
6. **pgTAP** (`supabase test db`): 17 aserciones en una transacción con `rollback`. Cubren los tests obligatorios de 07 §3 (alta nueva, update que gana, update que pierde, empate, `updated_at` del futuro, tombstone sobre fila viva y su propagación, update sobre tombstone, hijo con padre borrado, `user_id` ajeno, dueño que no cambia) y RLS. Para validar los tests se cambió `>=` por `>` en el empate y el test correspondiente falló.
7. **Jest + supabase-js** contra PostgREST, con dos usuarios reales creados con `signUp`. 4 tests:
   - el upsert devuelve la fila ganadora también cuando el cambio pierde;
   - reenviar el mismo cambio no duplica (RNF-04);
   - B no lee, no actualiza, no hace upsert ni borra filas de A;
   - un anónimo no ve nada.
8. Script `test:supabase` (`supabase test db && jest -c jest.supabase.config.js`) y un job `supabase` en la CI que corre `bunx supabase start` y el script. Se probó en el PR borrador #68, que se cerró sin mergear: el job pasó en 64 s.

Documentación: [Supabase CLI local](https://supabase.com/docs/guides/local-development), [pgTAP en Supabase](https://supabase.com/docs/guides/database/testing), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Resultado

| Qué | Resultado |
|---|---|
| LWW, empate, borrado que prevalece, tombstone terminal, `updated_at` acotado, hijo con padre borrado | ✅ Lo impone el trigger. Los 17 tests de pgTAP pasan |
| Propagación del borrado a los hijos | ✅ El trigger AFTER marca los hijos, y esa escritura pasa por el BEFORE de la tabla hija |
| `user_id` ajeno | ✅ En el INSERT se reemplaza por `auth.uid()` y en el UPDATE se mantiene el dueño |
| Upsert con `return=representation` | ✅ Devuelve la fila tal como quedó: si el cambio pierde por LWW, devuelve la versión del servidor con un `server_updated_at` nuevo |
| Dos usuarios (RNF-06) | ✅ B no ve ni modifica nada de A. El SELECT, el UPDATE y el DELETE de B devuelven 0 filas, sin error |
| Upsert sobre un `id` ajeno | ⚠️ Responde **error 42501** (violación de RLS), no 0 filas: el `ON CONFLICT DO UPDATE` choca con una fila que el usuario no puede ver. Con UUID generados en el cliente es prácticamente imposible, pero el push lo tiene que tratar como rechazo (`_conflict`, RN-SYNC-11) y no reintentar para siempre |
| Tests de Jest con `jest-expo` | ⚠️ La configuración de `jest-expo` reemplaza `fetch`, y supabase-js falla con `"undefined" is not valid JSON`. Los tests contra Supabase usan una config de Jest aparte (`jest.supabase.config.js`, entorno `node`) y la suite normal los ignora |
| CI | ✅ El job levanta Supabase y corre los dos tipos de test en unos 64 s, en paralelo con el resto |

## Decisión

**Se confirman ADR-0001 y 07 §3:** los triggers y RLS alcanzan, sin backend propio. Entra en #40:

1. Una función `sync_before_write()` compartida, con la tabla padre y la FK por argumento, y una `sync_cascade_delete()` por cada relación padre → hijo.
2. RLS `for all to authenticated` con `(select auth.uid())`, e índices `(user_id, server_updated_at, id)` en cada tabla de usuario.
3. `supabase/config.toml` con `project_id = "onerm-mvp"`, puertos 553xx y los servicios que no se usan apagados.
4. Tests en dos niveles, los dos en `bun run test:supabase` y en el job `supabase` de la CI:
   - **pgTAP** (`supabase/tests/*.sql`) para las reglas del trigger, una transacción con `rollback` por archivo;
   - **Jest + supabase-js** (`*.supabase.test.ts`, con `jest.supabase.config.js`) para lo que ve el cliente por PostgREST: la fila devuelta por el upsert, la idempotencia y los dos usuarios.

**Para F7 (push):** un error 42501 en el upsert es un rechazo definitivo de esa fila (RN-SYNC-11), no un error de red.

## Código

Rama [`spike/12-supabase-local`](https://github.com/ivomiyashiro/onerm/tree/spike/12-supabase-local). Se conserva como referencia y **no se mergea**. La migración, los tests, `jest.supabase.config.js` y el job de CI se reescriben en #40. El spike #13 parte de esta rama.
