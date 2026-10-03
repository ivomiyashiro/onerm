# Spike 11 — ¿Drizzle sobre expo-sqlite cubre lo que asume ADR-0010, y cómo se testean los repositorios fuera del dispositivo?

- **Issue:** #11
- **Fecha:** 2026-10-03
- **Tiempo acotado:** 4 horas · **Tiempo real:** 1,5 horas
- **ADR / RNF relacionados:** ADR-0010, ADR-0002, RNF-02, RNF-03, 07 §2 y §6

## Pregunta

ADR-0010 asume que Drizzle sobre `expo-sqlite` da migraciones generadas con `drizzle-kit` e incluidas en la app, consultas reactivas para `observe…()`, transacciones y modo WAL. Si algo de eso falla, F4 (#27, #29) se construye sobre una base equivocada. Además, la sección TDD de `CLAUDE.md` necesita definir cómo se corren los tests de integración de los repositorios en Jest, sin dispositivo.

## Criterio de éxito

- [x] Una tabla con las columnas comunes de 07 §2.1 en `schema.ts`.
- [x] Migración generada con `drizzle-kit` y aplicada al iniciar la app.
- [x] Una consulta reactiva actualiza la UI después de un INSERT, sin recargar a mano.
- [x] WAL activo y una transacción que escribe padre e hijo de forma atómica.
- [x] Una fila insertada sobrevive a matar el proceso (RNF-02).
- [x] Decidido cómo se corren los tests de integración en Jest, con sus limitaciones.
- [x] `CLAUDE.md` (sección TDD) actualizado.

## Qué se hizo

**Versiones:** `expo-sqlite` 57.0.3 (SQLite 3.50.3 en el dispositivo), `drizzle-orm` 0.45.3, `drizzle-kit` 0.31.11, `better-sqlite3` 12.11.1 (SQLite 3.53.2), `babel-plugin-inline-import` 3.0.0. Expo SDK 57 y emulador Pixel_10 (Android 17).

1. `schema.ts` con `workouts` y `workout_sets` reducidas: columnas comunes de 07 §2.1 (`id`, `user_id`, `created_at`, `updated_at`, `deleted_at`, `server_updated_at`, `_dirty`, `_conflict`), FK hijo → padre, un índice y dos CHECK.
2. `drizzle.config.ts` con `dialect: 'sqlite'` y `driver: 'expo'`. `drizzle-kit generate` produce los `.sql`, `meta/_journal.json` y `drizzle/migrations.js`, que los importa para incluirlos en el bundle.
3. Para que Metro empaquete los `.sql` hacen falta dos archivos de config: `metro.config.js` (`resolver.sourceExts.push('sql')`) y `babel.config.js` (`inline-import` con `extensions: ['.sql']`), más un `declare module '*.sql'` para TypeScript.
4. `useMigrations(db, migrations)` antes de montar la UI. Devuelve `{ success, error }`, así que la pantalla de error con «Reintentar» de 07 §6 se arma directo con `error`.
5. `useLiveQuery` sobre la conexión abierta con `openDatabaseSync('onerm.db', { enableChangeListener: true })`.
6. Botones de prueba: INSERT, transacción padre+hijo correcta y transacción que falla en el segundo INSERT (viola el CHECK de `reps`).
7. `adb shell am force-stop` justo después de un INSERT, y reapertura.
8. Una segunda migración aditiva (`ALTER TABLE workouts ADD notes text`), generada y aplicada al reabrir.
9. En Jest: las mismas migraciones de `drizzle/` aplicadas con `drizzle-orm/better-sqlite3/migrator` sobre una base `:memory:`. Tres tests: round-trip, atomicidad y FK.

Documentación: [Drizzle + Expo SQLite](https://orm.drizzle.team/docs/connect-expo-sqlite), [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/).

## Resultado

| Qué | Resultado |
|---|---|
| Migraciones al iniciar | ✅ Se aplican la primera vez y no se reaplican al reabrir. La migración aditiva se aplicó sobre la base con datos, sin perder filas |
| Consulta reactiva | ✅ `useLiveQuery` actualiza la lista y los contadores en cuanto termina el INSERT, también con los INSERT dentro de una transacción |
| Transacción padre+hijo | ✅ `db.transaction()` es sincrónica. Si falla el segundo INSERT, no queda ni el padre ni el primer hijo |
| WAL | ⚠️ **No viene por defecto**: `expo-sqlite` abre con `journal_mode=delete`. Con `PRAGMA journal_mode = WAL` al abrir queda en `wal` |
| Claves foráneas | ⚠️ **Apagadas por defecto** (`foreign_keys=0`). Hay que activarlas en cada apertura: no se guardan en la base |
| Matar el proceso (RNF-02) | ✅ La fila insertada justo antes del `force-stop` estaba al reabrir |
| Tiempo de un INSERT | ~3 ms (16 ms el primero, en frío), lejos de los 100 ms de RNF-03. Es una medición en el emulador, no en un dispositivo de gama media |
| Tests en Jest | ✅ `better-sqlite3` aplica los mismos `.sql`. Los 3 tests tardan ~1,5 s |
| Instalación de `better-sqlite3` | ⚠️ La v13 trae binarios precompilados, pero bun igual corre `node-gyp rebuild` y falla si no hay compilador (en macOS, sin aceptar la licencia de Xcode). La v12 descarga el binario precompilado y `bun install --frozen-lockfile` termina bien |

**Un mismo tipo para los dos drivers.** `ExpoSQLiteDatabase` y `BetterSQLite3Database` se pueden asignar a `BaseSQLiteDatabase<'sync', unknown>` (verificado con `tsc`). Los repositorios reciben ese tipo y el mismo código corre en la app y en Jest.

**Limitaciones de los tests en Jest:**
- La versión de SQLite no es la misma: 3.53.2 en Jest y 3.50.3 en el dispositivo. No se usan funciones de SQL más nuevas que la del dispositivo.
- `useLiveQuery` y `addDatabaseChangeListener` son de `expo-sqlite`: en Jest no hay notificaciones de cambios. Se testea la consulta que usa `observe…()`, no la suscripción. El cableado reactivo se prueba en el emulador.
- El migrador es distinto: en Jest lee la carpeta `drizzle/` y en la app, `migrations.js`. Los dos aplican los mismos `.sql` en el mismo orden según `_journal.json`.
- Los PRAGMA (`foreign_keys`, WAL) se configuran en los dos lados, con una sola función compartida.

## Decisión

**Se confirma ADR-0010**, con tres ajustes que entran en #27:

1. Al abrir la conexión se ejecuta `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`. La misma función configura la base de los tests.
2. Las migraciones van en `drizzle/` en la raíz, con `metro.config.js`, `babel.config.js` y `babel-plugin-inline-import`. Ninguna se edita a mano después de mergeada (07 §6: aditivas).
3. Los repositorios reciben `AppDatabase = BaseSQLiteDatabase<'sync', unknown>`, no el tipo de un driver.

**Tests de integración** (`*.int.test.ts`, en `src/data/` junto al repositorio):
- Base `better-sqlite3` `:memory:` nueva por test, con las migraciones de `drizzle/` y los mismos PRAGMA. Sin mocks de la base.
- `bun run test` corre solo los unitarios y `bun run test:int`, solo los de integración. La CI corre los dos.
- El script, el helper `openTestDatabase()` y la excepción de lint para `node:*` en `*.int.test.ts` entran en #27. Hoy el lint rechaza `node:path` desde `data`, y la excepción va **solo** en los tests.
- `better-sqlite3` queda en la **v12** hasta que bun deje de compilar la v13.

**Para #29:** `observe…()` no puede depender de `useLiveQuery`, que es un hook de React y no pertenece a `data`. Propuesta: el repositorio expone `observe(listener)`, que vuelve a correr la consulta cuando cambia la tabla. Escucha `addDatabaseChangeListener` en la app y un emisor manual en los tests. Se decide en #29.

## Código

Rama [`spike/11-sqlite-drizzle`](https://github.com/ivomiyashiro/onerm/tree/spike/11-sqlite-drizzle). Se conserva como referencia y **no se mergea**. Lo que sirve (`schema.ts`, `client.ts`, `db.int.test.ts`, la config de Metro y Babel) se reescribe con TDD en #27.
