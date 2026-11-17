# Spike 342 — ¿Conviene que los comandos que escriben en dos repositorios sean atómicos, y cómo?

- **Issue:** #342
- **Fecha:** 2026-11-16
- **Tiempo acotado:** 8 horas · **Tiempo real:** 2 horas
- **ADR / RNF relacionados:** ADR-0010, ADR-0013, RNF-02, 07 §6, 08 §3

## Pregunta

Algunos comandos escriben en dos repositorios, cada uno con su propia transacción. Si la segunda escritura falla, la primera queda hecha. Hoy funciona: `delete-routine.ts` ordena sus escrituras para tolerar el fallo, y el fallo es raro. La pregunta es si vale la pena hacerlos atómicos y, si es así, de qué forma.

## Criterio de éxito

- [x] Inventario de los comandos con dos o más escrituras locales: qué queda si falla la segunda y si el usuario lo notaría.
- [x] Las restricciones (transacción síncrona, repositorios con `db()`, estados intermedios que ve la navegación) comprobadas con una prueba.
- [x] Las opciones A, B y C comparadas con un ejemplo real probado, con su costo.
- [x] Una recomendación.

## Qué se hizo

1. **Lectura de los comandos** del inventario de la card, de `ObserveEntry`, `ObserveNextDay` y `ObserveRoutines`, y de `SyncGuestUnion.unite`.
2. **Pruebas en la rama `spike/342-atomic-writes`** (`src/data/spike-342-atomic-writes.int.test.ts`, contra SQLite real con `openTestDatabase()`):
   - una transacción de Drizzle cuya función devuelve una promesa;
   - `DeleteRoutine` con la segunda escritura (`profiles.save`) forzada a fallar;
   - un prototipo de la opción A y otro de la B sobre el mismo caso, cada uno con su fallo forzado.

## Resultado

### Restricciones

- **La transacción es síncrona.** `db.transaction(async () => …)` la rechaza `better-sqlite3`: «Transaction function cannot return a promise» (probado). El driver de la app (expo-sqlite, `BaseSQLiteDatabase<'sync'>`) tiene el mismo contrato. Así que no se puede envolver dos `await repositorio.save(…)` en una transacción.
- **Los repositorios reciben `db()`, no un `tx`,** y sus escrituras son `async`. Unir dos escrituras exige otra versión síncrona de cada una, que reciba `tx`.
- **La red y el dispositivo no pueden entrar en una transacción:** `AuthGateway`, `RestNotifier`, `RestCountdown`.
- **Lo que ve la navegación.** `ObserveEntry` decide la entrada con el perfil y el paso (`step ?? 'level'`). `ObserveNextDay` y `ObserveRoutines` tratan una rutina activa borrada como «sin rutina activa» (RN-RUT-02). En todos los casos de abajo, el estado intermedio que ven las pantallas es igual al final o es uno que el usuario puede corregir. Unir las escrituras no cambiaría ninguna pantalla.

### Inventario

| Comando | Escrituras locales | Si falla la segunda | ¿Se nota? |
|---|---|---|---|
| `StartAsGuest` | perfil, paso del onboarding | perfil sin paso | No: `ObserveEntry` toma `step ?? 'level'`, la misma pantalla |
| `AnswerOnboarding` | perfil, paso | la respuesta guardada, el paso anterior | Apenas: vuelve a la pregunta ya respondida, con la respuesta marcada |
| `FinishOnboarding` | perfil (`onboardingCompletedAt`), paso `null` | onboarding completo con un paso guardado | No: con `onboardingCompletedAt` la entrada es la app; el paso no se usa |
| `ContinueAfterAuth` | perfil, paso | perfil sin paso | No: igual que `StartAsGuest` |
| `DeleteRoutine` | rutina borrada, perfil sin rutina activa | rutina borrada y el perfil apuntándola | No: referencia débil, Inicio muestra «sin rutina» (probado) |
| `AdoptTemplate` | rutina nueva, perfil con la rutina activa | rutina guardada pero no activa | Sí, recuperable: aparece en «Mis rutinas» y se activa con un toque |
| `EnterAccount` (cuenta vacía) | dueño, email, migración pendiente `null` | dueño sin email, o la migración sin limpiar | Poco: Perfil sin el email hasta el próximo ingreso; la migración pendiente ya era `null` en un dispositivo vacío |
| `FinishWorkout` | entrenamiento terminado, fin del descanso `null` (y el aviso del dispositivo) | entrenamiento terminado con un descanso guardado | No en pantalla: el descanso solo se ve en S09, que ya no está, y `StartRest` lo pisa en el próximo. El aviso del dispositivo podría llegar, pero ese aviso nunca es atómico |
| `DiscardWorkout` | entrenamiento borrado, fin del descanso | igual que `FinishWorkout` | Igual |
| `FinishGuestUnion` | `unite` | — | **Ya es atómico:** perfil, filas del invitado y `app_state` (con `pendingMigrationUid`) van en una sola transacción |
| `UpdateProfile`, `AdjustActiveRoutine` | una sola escritura | — | — |
| `logSet` → `rest.onLogged` | dos comandos (serie, descanso) | serie guardada sin descanso | Sí, recuperable: no arranca el descanso; la serie está y se sigue entrenando |
| `use-after-auth` | `continueAfterAuth`, después la sync (red) | — | Fuera de alcance: combina la base local con la red |

**Lectura del inventario.** Ningún caso deja datos inconsistentes que el usuario no pueda ver ni corregir. Los dos que se notan (`AdoptTemplate` y `logSet` → descanso) dejan algo que la propia app ofrece arreglar. El fallo de una escritura local en SQLite es raro: disco lleno, base corrupta. En ese caso, además, la app tendría problemas mayores que este.

### Opciones, probadas sobre `DeleteRoutine`

| | A. Puerto `AtomicWrites` | B. Método combinado | C. No cambiar |
|---|---|---|---|
| Cómo | `AtomicWrites.run(tx => …)` en `domain/services`, con versiones síncronas `…In(tx)` de cada escritura que participe | Un método por caso, por ejemplo `deleteAndDeactivate(id)`, que hace las dos escrituras en una transacción | Mantener el orden de escritura actual y documentarlo como decisión |
| Probado | ✅ todo o nada | ✅ todo o nada | ✅ el estado que queda se ve como «sin rutina» |
| Costo en código | Alto: el puerto, su implementación y su cableado, más una versión `…In(tx)` de cada escritura de los repositorios del inventario (perfil, paso, rutina, entrenamiento, descanso, cuenta), unas 150–250 líneas | Medio por caso: unas 25–40 líneas por método más su fake y su test. Mezcla dos agregados en un repositorio (rutina y perfil), contra 06 §2 | Ninguno |
| Fakes | El fake en memoria tendría que deshacer los cambios si algo falla (fotos del estado), o los tests dejan de probar la atomicidad | Un método más por fake | Sin cambios |
| Riesgo para la navegación | Bajo, pero cambia cuántas emisiones ve cada pantalla al escribir | Bajo por caso | Ninguno |
| Encaja con ADR-0013 | Agrega un concepto nuevo (transacciones en el dominio) | Rompe «un repositorio, un agregado» | Sí |

## Decisión

**Decidido: C (2026-11-16). No cambiar, y dejar el orden de escritura documentado como decisión aceptada.**

- **El riesgo es bajo:** ningún caso deja datos inconsistentes que el usuario no pueda ver o corregir.
- **A y B tienen costo cierto:** A agrega transacciones al dominio y versiones síncronas de varias escrituras; B mezcla agregados en un repositorio. Las dos tocan código que hoy funciona, y la consigna de F11 es no cambiar el comportamiento.
- **La atomicidad completa no existe igual:** la parte de red y de dispositivo no entra en ninguna transacción.
- **Ya está cubierto donde más importa:** la unión del invitado (`unite`) es una sola transacción.

Con C:
- Se agrega a ADR-0013 la regla de orden: primero la escritura que deja un estado válido por sí sola. Hoy se cumple, por ejemplo, borrar la rutina antes de quitar la activa, o guardar el perfil antes del paso.
- `#343` se cierra como «not planned».
- `#350` toma como regla para el revisor: «un comando nuevo con dos escrituras respeta ese orden».

La persona eligió C. La regla de orden quedó en ADR-0013, «Lo que no se cambia».

## Código

Rama `spike/342-atomic-writes`, con `src/data/spike-342-atomic-writes.int.test.ts`: la restricción, el fallo inyectado y los prototipos A y B. **Se descarta:** no se mergea. Solo esta nota llega a `main`.
