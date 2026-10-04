# ADR-0002 — Sync local primero: LWW por registro, borrado lógico y derivados sin sincronizar

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** RF-SYNC-*, RF-AUTH-05..07, RN-SYNC-*, RNF-01..05, ADR-0001

## Contexto

Fuerzas en juego:

- **Offline first real:** en el gimnasio puede no haber señal. Ninguna acción puede esperar a la red (RNF-01).
- **El historial es editable:** si el usuario se equivoca, tiene que poder corregirlo. Por lo tanto, los datos **no** son de solo agregar.
- **Multidispositivo deseado:** el mismo usuario puede escribir desde dos dispositivos, incluso los dos sin conexión.
- **Cada usuario escribe solo sus datos:** no hay colaboración entre usuarios, así que los conflictos son raros y siempre de una misma persona.
- Equipo chico: la solución tiene que ser **explicable en la defensa** y realizable.

## Decisión

1. **Base local (SQLite) como fuente de verdad de la interfaz.** Toda escritura va primero a la base local (RN-SYNC-01).
2. **UUID generados en el cliente** (RN-SYNC-02).
3. **Metadatos en cada registro sincronizable:**
   - `updated_at`: momento de la última modificación, según el reloj del cliente, en UTC.
   - `deleted_at`: borrado lógico.
   - `server_updated_at`: lo asigna un **trigger del servidor** al recibir el cambio y se usa como cursor de pull.
   - Marca local de **pendiente** (`dirty`).
4. **Push:** se envían los registros pendientes por lotes, en orden de dependencias (padres antes que hijos: rutina → día → ejercicio de rutina; entrenamiento → serie). El servidor aplica **LWW** y acepta el cambio solo si su `updated_at` es mayor que el guardado. El upsert por UUID lo hace **idempotente**.
5. **Pull:** se piden los registros con `server_updated_at` mayor que el cursor, se aplica LWW localmente y se avanza el cursor.
6. **Borrado lógico, y la eliminación prevalece siempre** (RN-SYNC-04): se aplica **antes** que el LWW y sin mirar `updated_at`. Una vez que `deleted_at` tiene valor, no se vuelve a vaciar. Los hijos de un padre borrado se consideran borrados (RN-SYNC-12).
6b. **Reconciliación:** el servidor devuelve la fila tal como quedó después de cada upsert, y el cliente la adopta. Si su cambio perdió por LWW, se entera y no hay divergencia silenciosa (07 §3).
6c. **El entrenamiento en curso no se sincroniza** hasta finalizarlo (RN-SYNC-13). Así se evita que otro dispositivo lo continúe o lo descarte.
7. **Conflicto a nivel de registro**, no de campo (RN-SYNC-05).
8. **Los datos derivados no se sincronizan** (RN-SYNC-10). Sugerencias, e1RM, récords y próximo día son funciones puras del historial. Así se evita toda una clase de conflictos y cualquier corrección se propaga sola.
9. **Cuándo se dispara** la sync: RN-SYNC-06.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| **LWW por registro + borrado lógico** (elegida) | Simple, explicable y suficiente para un solo usuario por dato | Puede perder una edición concurrente a nivel de campo (riesgo aceptado) |
| Solo agregar, sin edición | Sin conflictos | El usuario no puede corregir errores. Descartada por decisión del equipo |
| El servidor siempre gana | Trivial | Pierde las ediciones hechas sin conexión, que son el caso principal |
| CRDT o fusión por campo | Sin pérdida | Complejidad desproporcionada para el problema |
| Librería de sync (PowerSync, WatermelonDB sync) | Menos código propio y probado | Otra dependencia y otro servicio. **Esconde justo lo que la defensa pide explicar.** Queda como plan B si el tiempo no alcanza |

## Consecuencias

- ✅ La interfaz es siempre instantánea y funciona sin red.
- ✅ Las correcciones y los datos de otros dispositivos se reflejan sin lógica especial, por el punto 8.
- ✅ Los reintentos son seguros, por la idempotencia.
- ⚠️ Hay que mantener los metadatos en todas las tablas sincronizables y respetar el orden de dependencias.
- ⚠️ Los *tombstones* se acumulan. Se aceptan sin purga en el MVP porque el volumen es chico.

## Riesgos y mitigaciones

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | **Reloj del dispositivo desfasado:** un dispositivo con la hora adelantada "gana" siempre, y uno atrasado pierde sus ediciones. | Android e iOS sincronizan la hora por red. El servidor **acota** los `updated_at` adelantados (RN-SYNC-03). Con la **reconciliación** (6b), un cambio que pierde se ve y no queda como pendiente fantasma. El cursor de pull usa la hora del servidor. |
| R2 | **Pull con el cursor por timestamp pierde filas:** transacciones concurrentes pueden confirmar con un `server_updated_at` anterior a uno ya leído. | Leer con una **ventana de solapamiento** (cursor − unos segundos). La aplicación idempotente con LWW hace inofensivo el releer. |
| R3 | Pérdida de una edición a nivel de campo (RN-SYNC-05). | Riesgo aceptado: requiere editar la misma serie en dos dispositivos sin conexión. |
| R4 | Un registro inválido bloquea toda la cola. | Los errores se aíslan por registro: quedan en conflicto, retienen solo a sus hijos, y el usuario puede descartarlos (RN-SYNC-11, RF-SYNC-06 AC4). |
| R5 | Un hijo llega antes que su padre (FK). | Push en orden de dependencias. Si igual falla, el hijo se reintenta en el próximo ciclo. |
| R6 | La restauración inicial es grande. | Pull paginado en orden catálogo → perfil → rutinas → entrenamientos (RF-SYNC-03). |
| R7 | Llega un registro que referencia un ejercicio que el catálogo local todavía no tiene. | Catálogo primero. Las referencias al catálogo no tienen FK, y el registro se guarda igual (RN-CAT-04). |
| R8 | Una app vieja sigue sincronizando con un esquema nuevo. | Versión mínima de app publicada por el servidor (RN-SYNC-14). Migraciones solo aditivas. |
| R9 | Una página del pull con más de 500 filas en la misma ventana no avanza. | Paginación por keyset `(server_updated_at, id)` y solapamiento aplicado una sola vez por pull (07 §4.1). |
| R10 | El reloj del dispositivo se corrige hacia atrás y se pierden ediciones propias. | `updated_at` monótono por fila (RN-GEN-03). |
| R11 | Una edición que pierde por LWW se descarta sin aviso. | Riesgo aceptado: los dispositivos convergen (RNF-05) y el caso requiere editar el mismo registro en dos dispositivos. |

## Cuándo revisar esta decisión

- Si aparecen datos **compartidos entre usuarios** (por ejemplo, el modo coach/alumno).
- Si la pérdida a nivel de campo se vuelve un problema real.
- Si la sync propia no se termina a tiempo: pasar a una librería (plan B). **Punto de control superado** en el [spike #13](../../spikes/13-push-pull.md) (2026-10-03): el núcleo entró en 280 líneas con los casos de 07 §4.1 testeados contra Supabase, salvo el desempate por `id` del keyset, que no se puede forzar desde el cliente. El plan B no se activa.
