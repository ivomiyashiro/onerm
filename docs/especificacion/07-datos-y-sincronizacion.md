# 07 — Datos, persistencia y sincronización

Responde a los §4.12 (persistencia) y §4.13 (Offline First) del TPO.
**ADR:** [0002](adr/0002-estrategia-de-sincronizacion.md), [0010](adr/0010-base-local-sqlite-drizzle.md), [0001](adr/0001-supabase-directo-sin-backend-propio.md).

## 1. Qué se persiste y dónde (§4.12)

| Información | Origen | Local (SQLite) | Remoto (Supabase) | Notas |
|---|---|---|---|---|
| Perfil y preferencias | Usuario | ✅ fuente de verdad | ✅ respaldo | |
| Rutinas, días, ejercicios de rutina | Usuario | ✅ | ✅ | |
| Entrenamientos **finalizados**, ejercicios y series | Usuario | ✅ | ✅ | Editables (RF-PROG-03) |
| Entrenamiento **en curso** | Usuario | ✅ | ❌ hasta finalizarlo | RN-SYNC-13 |
| Catálogo de ejercicios | Seed desde **APIs externas** (wger…) | ✅ snapshot + actualizaciones | ✅ publicado | Solo lectura (ADR-0004) |
| Plantillas | Seed desde un archivo del repo | ✅ | ✅ | Solo lectura |
| Sesión de autenticación | Supabase Auth | 🔐 cifrada (ver §1.1) | — | RNF-07 |
| Estado de sync (cursores, pendientes, conflictos) | Sistema | ✅ | — | Solo local |
| Temporizador (hora de fin del descanso) | Sistema | ✅ | — | Solo local (RN-ENT-07) |
| Datos derivados | Motor | ❌ | ❌ | Se calculan (RN-SYNC-10) |

### 1.1 Almacenamiento de la sesión

La sesión de Supabase (access token y refresh token) puede superar el límite de tamaño por valor de `expo-secure-store`, que es de unos 2 KB en algunas plataformas. Por eso se usa el patrón que recomienda Supabase para React Native:

- Se genera una **clave AES** que se guarda en `expo-secure-store`, es decir, en Keychain o Keystore.
- La sesión se guarda **cifrada con esa clave** en el almacenamiento local de la app.

Nunca se guarda en texto plano (RNF-07).

## 2. Esquema

### 2.1 Columnas comunes a toda tabla sincronizable

| Columna | Local | Remoto | Uso |
|---|---|---|---|
| `id` | TEXT (UUID) | `uuid` PK | Se genera en el cliente (RN-SYNC-02) |
| `user_id` | TEXT, **nulo si es invitado** | `uuid` NOT NULL, default `auth.uid()` | RLS. Se desnormaliza en todas las tablas para que las políticas no necesiten joins |
| `created_at` | INTEGER (ms UTC) | `timestamptz` | |
| `updated_at` | INTEGER (ms UTC, reloj del cliente, monótono por fila: RN-GEN-03) | `timestamptz` | LWW (RN-SYNC-03). Borrar también lo actualiza |
| `deleted_at` | INTEGER? | `timestamptz` | Borrado lógico (RN-SYNC-04) |
| `server_updated_at` | INTEGER? | `timestamptz`, lo asigna un **trigger** | Cursor de pull |
| `_dirty` | INTEGER 0/1 | — | Pendiente de push. **Solo local** |
| `_conflict` | TEXT? | — | Motivo del rechazo del servidor (RN-SYNC-11). **Solo local** |

### 2.2 Tablas de usuario (locales y remotas)

| Tabla | Columnas propias | Restricciones |
|---|---|---|
| `profiles` | **`id = user_id`** (RN-AUTH-06; el invitado usa un id local fijo) · `level`, `goal`, `days_per_week`, `unit`, `effort_mode`, `effort_mode_explicit`, `load_increments_kg` (JSON), `load_increments_lb` (JSON), `active_routine_id?`, `onboarding_completed_at?` | Una por usuario (`user_id` único **en el servidor**; en local, una sola fila viva) · CHECK de enums · `days_per_week` 2–6 · `active_routine_id` **sin FK** (referencia débil, RN-RUT-02) |
| `routines` | `name`, `source_template_id?` | largo del nombre 1–50 |
| `routine_days` | `routine_id` FK, `name`, `position` | |
| `routine_exercises` | `routine_day_id` FK, `exercise_id`, `position`, `role`, `sets`, `rep_min`, `rep_max`, `rest_seconds`, `target_rir`, `notes?` | CHECK RN-RUT-04 |
| `workouts` | `routine_id?`, `routine_day_id?` (**referencias débiles, sin FK**, RN-RUT-07), `routine_name_snapshot`, `day_name_snapshot`, `status`, `started_at`, `finished_at?`, `notes?` | CHECK `status`. En el servidor solo `finished` (RN-SYNC-13) |
| `workout_exercises` | `workout_id` FK, `routine_exercise_id?` (débil), `planned_exercise_id?`, `exercise_id`, `position`, `status`, `role`, `sets`, `rep_min`, `rep_max`, `rest_seconds`, `target_rir`, `load_type`, `is_unilateral` | Copia de la prescripción y de los atributos del ejercicio (RN-ENT-08) |
| `workout_sets` | `workout_exercise_id` FK, `position`, `load_kg?`, `reps?`, `rir?`, `reps_left?`, `reps_right?`, `rir_left?`, `rir_right?`, `is_warmup`, `completed_at` | CHECK: o bilateral o unilateral (I-05) · `load_kg` 0–1000 · reps 0–100 · rir 0–5 |

**Referencias al catálogo** (`exercise_id`, `planned_exercise_id`): **sin FK**, ni en local ni en el servidor. Pueden llegar antes que el ejercicio (RN-CAT-04).

### 2.3 Tablas de catálogo (remotas con lectura pública; locales de solo lectura)

`exercises` (modelo canónico, ADR-0004), `routine_templates`, `template_days`, `template_exercises`. Solo el seed las escribe, con la `service_role`. En la app, el snapshot incluido las carga en la primera ejecución.

`exercise_source_refs(exercise_id, source, external_id)`, con clave única `(source, external_id)`, existe **solo en el servidor**.

`app_config(min_app_version)` es de lectura pública (RN-SYNC-14).

### 2.4 Tablas solo locales

| Tabla | Contenido |
|---|---|
| `sync_state` | `table_name`, `cursor` (TEXT: el `server_updated_at` y el `id` de la última fila, tal como los devuelve el servidor; un `Date` truncaría los microsegundos, spike #13), `last_success_at`, `restore_completed` |
| `app_state` | `owner` (`guest` o `user_id`), `pending_migration_uid?` (unión del invitado sin terminar, §4.3), `onboarding_step?` (RF-PERF-01 AC6), `catalog_version`, `rest_timer_ends_at?`, `rest_timer_notification_id?`, `last_account_nudge_at?`, `notification_permission_asked` |

## 3. Servidor: seguridad, LWW y borrado

```sql
-- RLS en cada tabla de usuario (ejemplo: workout_sets)
alter table workout_sets enable row level security;
create policy "own rows" on workout_sets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Trigger BEFORE INSERT OR UPDATE (función compartida), con ramas por TG_OP. El ORDEN importa.
-- Un upsert de PostgREST (INSERT … ON CONFLICT DO UPDATE) ejecuta la rama INSERT si la fila no existe
-- y la rama UPDATE si ya existe.
-- Común:
--  a. new.server_updated_at := clock_timestamp()
--  b. si new.updated_at > now() + interval '5 min' → new.updated_at := now()            (RN-SYNC-03)
--  c. si el padre (FK) está borrado → new.deleted_at := coalesce(new.deleted_at, now())  (RN-SYNC-12)
-- TG_OP = 'INSERT':
--  d. new.user_id := auth.uid()   (ignora el user_id enviado: nadie escribe en nombre de otro)
--  e. aceptar
-- TG_OP = 'UPDATE':
--  f. new.user_id := old.user_id                                                        (el dueño no cambia)
--  g. si old.deleted_at is not null → devolver old con server_updated_at nuevo           (el borrado es terminal)
--  h. si new.deleted_at is not null → aceptar el borrado SIEMPRE, sin mirar updated_at    (RN-SYNC-04)
--     new.updated_at := greatest(new.updated_at, old.updated_at)
--  i. si old.updated_at >= new.updated_at → devolver old con server_updated_at nuevo (LWW: gana el servidor)
--  j. si no → aceptar
-- Tests SQL obligatorios: alta nueva, update que gana, update que pierde, tombstone sobre fila viva,
-- update sobre tombstone, hijo con padre borrado, user_id ajeno.

-- Trigger AFTER UPDATE OF deleted_at: propaga el borrado a los hijos directos (RN-SYNC-12)
```

- El **push** es un `upsert` por `id` vía PostgREST, con `Prefer: return=representation`. El servidor **devuelve la fila tal como quedó**, y el cliente la aplica sobre la local. Así, si el cambio perdió por LWW, el cliente adopta la versión ganadora y **los dispositivos convergen**. *Aclaración:* una edición que pierde por LWW se descarta **sin avisar al usuario**. Es una consecuencia aceptada de LWW (RN-SYNC-05, ADR-0002 R3), y es poco probable porque requiere editar el mismo registro en dos dispositivos.
- Reenviar el mismo cambio es **idempotente** (RNF-04).
- Las tablas de catálogo y `app_config` tienen la política `select using (true)` y ninguna política de escritura.
- Las migraciones SQL se versionan en el repo (`supabase/migrations/`) y son **solo aditivas** (ADR-0001, R3).

## 4. Algoritmo de sincronización

### 4.1 Sync normal

```
sync():
  si min_app_version > versión de la app → estado "Actualizá la app"; fin               (RN-SYNC-14)
  pullCatalog()                                                                          (primero: RN-SYNC-06)
  si owner = guest → fin                                                                 (RN-SYNC-09)
  si ya hay un sync en curso → marcar "repetir al terminar"; fin

  PUSH, en orden de dependencias:
    profiles → routines → routine_days → routine_exercises → workouts → workout_exercises → workout_sets
    excluir: entrenamientos in_progress y sus hijos (RN-SYNC-13); filas cuyo padre está en conflicto (RN-SYNC-11);
             filas con user_id distinto del de la sesión (defensa adicional a RN-AUTH-07)
    por lotes de hasta 200 filas con _dirty = 1:
      upsert remoto, pidiendo que devuelva las filas
      por cada fila devuelta:
        aplicarla localmente (reconciliar); _dirty = 0 si updated_at local no cambió mientras tanto
      rechazo por validación → _conflict = motivo; la fila y sus hijos quedan retenidos
      error de red → abortar; reintentar con backoff (5 s, 15 s, 60 s, máx. 5 min) o con el próximo disparador

  PULL, en el mismo orden, con paginación por keyset:
    desde = (cursor.ts − 5 s, id mínimo)          ← el solapamiento se aplica UNA vez, al inicio del pull
    repetir:
      pedir filas con (server_updated_at, id) > desde, ordenadas por (server_updated_at, id), de a 500
      por cada fila remota:
        si la remota tiene deleted_at → insertar o actualizar la local como BORRADA (lógico), aunque no exista
                                         o tenga _dirty (RN-SYNC-04, RN-SYNC-15)
        si la local tiene deleted_at → conservarla borrada (nunca revive)
        si no existe local → insertar
        si la local tiene _dirty = 1 y local.updated_at > remota.updated_at → conservar la local (gana en el próximo push)
        si no → reemplazar la local por la remota
      desde = (server_updated_at, id) de la última fila recibida
    hasta recibir menos de 500
    cursor = desde
```

**Disparadores:** RN-SYNC-06.

### 4.2 Restauración inicial (RF-SYNC-03)

- Es el mismo pull con los cursores en 0, en el orden perfil → rutinas → entrenamientos.
- Trae también los **tombstones**, que RN-RUT-01 y RN-SYNC-12 necesitan.
- `restore_completed` se marca recién cuando terminan **todas** las tablas. Mientras tanto se muestra el aviso de restauración incompleta.
- **Progreso:** S23 muestra un indicador **indeterminado** con la cantidad de registros descargados (no un porcentaje, porque el total no se conoce).

**Onboarding después de autenticarse:** se repite **solo** si ni el perfil local ni el de la cuenta tienen `onboarding_completed_at`.

### 4.3 Unión de los datos del invitado (RF-AUTH-05, RN-AUTH-04)

```
al autenticarse con owner = guest:
  0. pending_migration_uid = uid        ← si la app se cierra acá, al reabrir se retoma desde 1
  1. descargar el perfil de la cuenta (si existe) y comprobar si la cuenta tiene datos (RN-AUTH-05)
  2. PERFIL (RN-AUTH-06):
       si la cuenta tiene perfil → se usa ese; el del invitado se descarta (si la cuenta no tiene
                                    rutina activa y el invitado sí, se copia la del invitado)
       si no → el perfil del invitado pasa a id = uid, user_id = uid, _dirty = 1
  3. si el invitado no tiene datos (RN-AUTH-05) → ir a 6
  4. si la cuenta no tiene datos → reasignar todo el resto → user_id = uid, _dirty = 1; ir a 6
  5. preguntar D01 "¿Sumamos tus datos a la cuenta?"
       Sumar    → reasignar el resto de las filas del invitado → user_id = uid, _dirty = 1
       Descartar → D01b; si confirma → borrar físicamente las filas del invitado (incluido un
                   entrenamiento en curso, que D01b menciona); si cancela → volver a D01
       Cancelar → cerrar la sesión de autenticación, owner sigue = guest, pending_migration_uid = null; fin
  6. owner = uid; pending_migration_uid = null; restauración (§4.2) y después sync normal
```

- **Entrenamiento en curso del invitado:** se migra con el resto, pero no se sube hasta que se finaliza (RN-SYNC-13).
- La unión es **local** y en **una sola transacción**. Si la red se corta después, los datos quedan como pendientes.

### 4.4 Cierre de sesión y cambio de cuenta (RF-AUTH-07, RN-AUTH-07)

- Se cuentan los **pendientes** (RN-SYNC-08) y los **conflictos**, y se sigue el flujo de ese RF. El entrenamiento en curso bloquea el cierre (D14).
- Al confirmar, se borran las tablas de usuario, `sync_state` y la sesión cifrada. El catálogo se conserva.
- Se vuelve a la bienvenida con `owner = guest` y sin datos.
- **Cambio de cuenta:** con `owner = A`, el login solo acepta la cuenta A (RN-AUTH-07). Si se ingresa otra, se muestra "Para entrar con otra cuenta, primero cerrá sesión".
- **Sesión vencida o revocada:** los datos y pendientes quedan en el dispositivo. S21 muestra el estado "Sesión vencida" con "Volver a entrar", que solo acepta la cuenta A.

## 5. Escenarios de conectividad (§4.13)

| Escenario | Qué pasa | Qué ve el usuario |
|---|---|---|
| **Con conexión** | Todo se escribe primero en local. El push sale unos 3 s después, salvo el entrenamiento en curso, que se sube al finalizar. El pull, al abrir la app o volver al primer plano. | Nada especial. Perfil: "Respaldado · hace X". |
| **Pierde la conexión** | Las escrituras siguen en local y quedan `_dirty`. Los intentos de sync fallan en silencio, con backoff. | **Nada cambia en el entrenamiento** (RNF-10). Hay un indicador discreto de "N cambios sin respaldar". Las acciones de cuenta muestran "Necesitás conexión". |
| **Recupera la conexión** | Se dispara el sync: catálogo, push y pull. | El indicador vuelve a "Respaldado". Si llegaron datos de otro dispositivo, el historial y las sugerencias se actualizan solos. |
| **Información local desactualizada** | Se resuelve en el próximo pull. Hasta entonces, las sugerencias usan los datos locales. | Ve sus datos locales. Al sincronizar, los datos derivados se recalculan. |
| **Sin información local todavía** | *Invitado:* el catálogo y las plantillas vienen incluidos, así que la app es usable sin red. *Login en un dispositivo nuevo:* restauración. | Invitado: onboarding normal. Usuario: "Restaurando tus datos…" y, si se corta, el aviso de restauración incompleta. |
| **Conflicto** (misma fila en dos dispositivos) | LWW por fila. El borrado prevalece siempre. El servidor devuelve la versión ganadora y el cliente la adopta. | Los dos dispositivos convergen (RNF-05). |
| **Cambio rechazado** (validación) | La fila queda en conflicto y retiene a sus hijos (RN-SYNC-11). | "1 cambio no se pudo respaldar" → ver detalle → "Descartar este cambio". |
| **App desactualizada** | Se pausa la sync (RN-SYNC-14). | "Actualizá la app para respaldar tus datos". Todo lo demás funciona. |

## 6. Migraciones de la base local

- Se hacen con **Drizzle migrations**, incluidas en la app. Se ejecutan al iniciar, antes de montar la UI (ADR-0010).
- Son **aditivas**. Si una migración falla, se muestra una pantalla de error con "Reintentar" y **nunca** se borra la base.

## 7. Volumen de datos esperado

Con 1.000 entrenamientos (RNF-14) hay unas 20.000 series. Los tombstones no se purgan (ADR-0002). Como el pull es incremental, cada tombstone viaja **una sola vez**, así que el costo por sync depende solo de los cambios nuevos.
