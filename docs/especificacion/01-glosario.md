# 01 — Glosario (lenguaje ubicuo)

Los documentos se escriben en español y el código en inglés. Esta tabla es el **puente obligatorio** entre los dos: si un término no está acá, se agrega antes de usarlo en un requisito o en el código.

## Entrenamiento

| Término | Definición | En código |
|---|---|---|
| **Ejercicio** | Movimiento concreto del catálogo (ej.: sentadilla con barra). Tiene un tipo de carga, músculos, un equipamiento principal y una lista de equipamiento. | `Exercise` |
| **Equipamiento principal** | El equipamiento que define el incremento de carga de un ejercicio (RN-CAT-03). | `primaryEquipment` |
| **Catálogo** | Conjunto de ejercicios disponibles. Lo mantiene el equipo y es de solo lectura para el usuario. | `ExerciseCatalog` |
| **Tipo de carga** | Cómo se mide la dificultad de un ejercicio. En el MVP: `externa` (barra, mancuerna, máquina) o `peso corporal`. Ver ADR-0005. | `LoadType` (`external`, `bodyweight`) |
| **Rutina** | Plan de entrenamiento del usuario: una lista ordenada de días. | `Routine` |
| **Plantilla** | Rutina predefinida por el equipo, con un nivel sugerido (PLT-FB2 y PLT-FB3 para novatos, PLT-TP4 para intermedios). Al adoptarla, se **copia** como rutina del usuario. | `RoutineTemplate` |
| **Día (de rutina)** | Parte de la rutina que se hace en un entrenamiento (ej.: "Día A — Tren superior"). | `RoutineDay` |
| **Ejercicio de rutina** | Un ejercicio dentro de un día, con su prescripción. Un mismo ejercicio puede aparecer en varios días con prescripciones distintas. | `RoutineExercise` |
| **Prescripción** | Lo que se pide hacer en un ejercicio de rutina: cantidad de series, rango de repeticiones y esfuerzo objetivo. | `Prescription` |
| **Rango de repeticiones** | Mínimo (piso) y máximo (tope) de repeticiones objetivo (ej.: 8–12). | `RepRange { min, max }` |
| **Rutina activa** | La rutina que el usuario sigue actualmente. Hay una sola a la vez. | `activeRoutineId` |
| **Próximo día** | Día que la app propone para el siguiente entrenamiento. Se **deriva** del historial (ADR-0006). | `nextDay` (derivado) |
| **Entrenamiento** | Una instancia de entrenar: se inicia, se registran series y se finaliza o descarta. Evitar decir "sesión" a secas. | `Workout` |
| **Entrenamiento en curso** | Entrenamiento iniciado y todavía sin finalizar. Hay como máximo uno en el dispositivo, y no se sincroniza hasta finalizarlo (RN-SYNC-13). | `Workout.status = in_progress` |
| **Serie** | Una ejecución registrada: carga × repeticiones, más el esfuerzo opcional. | `WorkoutSet` (no `Set`, que choca con el `Set` de JS) |
| **Repeticiones** | Cantidad de veces que se completó el movimiento en una serie. | `reps` |
| **Carga / peso** | Peso externo usado en la serie, guardado en la unidad canónica (Q-07). | `loadKg` (columna `load_kg`) |
| **RIR** | *Reps In Reserve*: cuántas repeticiones más se podrían haber hecho. 0 = al fallo. | `rir` |
| **RPE** | *Rate of Perceived Exertion*, escala 1–10. Equivale a RPE = 10 − RIR. Solo se usa como equivalencia. | — |
| **Escala de esfuerzo simple** | Versión de RIR para novatos. Pregunta "¿Cuántas más podías hacer?" con las opciones "Ninguna", "1", "2 o 3" y "4 o más", que se traducen a RIR (RN-ENT-03). | `EffortLevel` |
| **1RM** | Peso máximo con el que se puede hacer una sola repetición. | `oneRepMax` |
| **e1RM** | 1RM **estimado** a partir de una serie submáxima (fórmula de Brzycki, RN-SUG-07). | `estimatedOneRepMax` |
| **Sugerencia** | Carga y repeticiones propuestas por el motor para un ejercicio de rutina en un entrenamiento, con su **motivo**. | `Suggestion { load, reps, reason }` |
| **Motivo** | Explicación legible de por qué el motor sugirió un valor (qué regla aplicó). | `SuggestionReason` |
| **Doble progresión** | Regla que primero suma repeticiones dentro del rango y, al llegar al tope, sube la carga y vuelve al piso. | `DoubleProgression` |
| **Calibración** | Procedimiento para el primer entrenamiento de un ejercicio sin historial, que sirve para encontrar la carga inicial. | `Calibration` |
| **Descarga** | Reducción temporal de la carga después de estancarse o fallar varias veces seguidas. | `Deload` |
| **Incremento mínimo** | Salto mínimo de carga disponible (ej.: 2,5 kg en barra, 2 kg en mancuernas), definido por equipamiento y por unidad. Toda sugerencia es múltiplo de este valor (RN-PERF-06, RN-SUG-09). | `loadIncrement` |
| **Récord personal** | Mejor marca de un ejercicio: mayor carga, mayor e1RM o más repeticiones con una carga dada. | `PersonalRecord` |
| **Nivel** | Experiencia declarada: novato, intermedio o avanzado (definiciones en RN-PERF-07). | `ExperienceLevel` |
| **Objetivo** | Meta de entrenamiento del perfil: salud general, músculo o fuerza. Define la prescripción por defecto. | `TrainingGoal` (`health`, `hypertrophy`, `strength`) |
| **Modo de esfuerzo** | Cómo se informa el esfuerzo: escala simple o RIR numérico. | `EffortMode` |
| **Rol (de ejercicio)** | *Principal* (multiarticular, va primero y descansa más) o *accesorio*. Junto con el objetivo, define la prescripción. | `ExerciseRole` (`main`, `accessory`) |
| **Unilateral** | Ejercicio que se hace de un lado por vez. Sus series guardan repeticiones y esfuerzo por lado. | `isUnilateral` |
| **Lado limitante** | En una serie unilateral, el lado con peor rendimiento. Es el que usa el motor (RN-ENT-06). | `limitingSide` |
| **Copia de la prescripción** | La prescripción del día copiada al iniciar un entrenamiento. Así el historial no cambia cuando se edita la rutina. | `WorkoutExercise.prescription` |
| **Ejercicio salteado** | Ejercicio de un entrenamiento que no se hizo. No cuenta ni como fallo ni como realización. | `skipped` |
| **Sustitución** | Reemplazo de un ejercicio solo para el entrenamiento en curso. Crea un ejercicio de entrenamiento nuevo con `exerciseId ≠ plannedExerciseId` (RN-ENT-10). | — |
| **Ejercicio planificado** | El ejercicio que indicaba la rutina al iniciar el entrenamiento (copia). | `plannedExerciseId` |
| **Entrenamiento abandonado** | Entrenamiento en curso iniciado hace más de 12 h (RN-ENT-11). | — |
| **Exposición de ejercicio (EE)** | Las series efectivas de un ejercicio en un entrenamiento finalizado, en cualquier contexto. Se usa para el e1RM, el progreso y los récords (RN-SUG-01). | `ExerciseExposure` |
| **Exposición de ejercicio de rutina (ERR)** | Una EE que pertenece a un ejercicio de rutina con su ejercicio actual. Es la unidad de la doble progresión (RN-SUG-01). | `RoutineExposure` |
| **Serie efectiva** | Serie con al menos 1 repetición que no es de calentamiento. | `EffectiveSet` |
| **Serie de calentamiento** | Serie marcada como calentamiento. No cuenta para nada (RN-ENT-12). | `isWarmup` |
| **Carga de trabajo (W)** | La carga más usada entre las series efectivas de una exposición; si empatan, la mayor (RN-SUG-01). | `workingLoad` |
| **Repeticiones hasta el fallo (RTF)** | Repeticiones hechas + RIR. Es la base del e1RM. | `repsToFailure` |
| **Marca** | Par (carga de trabajo, repeticiones totales con esa carga), usado para detectar estancamiento. | `PerformanceMark` |
| **Reentrada** | Reducción de la carga al volver después de una pausa (RN-SUG-05). | `Reentry` |
| **Serie fraccional** | Unidad de volumen semanal: las series directas valen 1 y las indirectas 0,5 (P-03). | — |

## Cuenta y sincronización

| Término | Definición | En código |
|---|---|---|
| **Invitado** | Persona que usa la app sin cuenta. Sus datos existen solo en el dispositivo. | `Guest` |
| **Usuario registrado** | Persona con cuenta (email y contraseña, o Google). Sus datos se respaldan. | `User` |
| **Cuenta** | Identidad en Supabase Auth. Una por email. | `Account` / `auth.users` |
| **Sesión de autenticación** | Estado de "estar logueado" en un dispositivo (tokens). No confundir con *entrenamiento*. | `AuthSession` |
| **Migración de invitado** | Traspasar los datos del invitado a una cuenta al registrarse o iniciar sesión. | `migrateGuestData` |
| **Sincronización (sync)** | Proceso que iguala los datos locales y remotos: push + pull. | `SyncEngine` |
| **Push** | Enviar los cambios locales pendientes al servidor. | `push` |
| **Pull** | Traer los cambios del servidor que el dispositivo no tiene. | `pull` |
| **Cambio pendiente** | Registro modificado localmente que todavía no se subió. | `dirty` / `outbox` |
| **Cursor de sync** | Marca del último cambio remoto ya recibido, para que el pull sea incremental. | `syncCursor` |
| **Borrado lógico** | Eliminar marcando `deleted_at` en vez de borrar la fila, para que la eliminación se propague. La fila marcada se llama *tombstone*. | `deletedAt` |
| **LWW** | *Last-Write-Wins*: ante dos versiones del mismo registro, gana la modificada más recientemente. | — |
| **Dato derivado** | Dato que se calcula a partir del historial y **no** se guarda ni sincroniza: sugerencias, e1RM, récords, próximo día. | — |
| **Fuente de verdad local** | La base SQLite del dispositivo. La UI siempre lee de ahí. | `LocalDataSource` |

## Catálogo y seed

| Término | Definición | En código |
|---|---|---|
| **Modelo canónico** | Nuestro modelo de ejercicio, independiente de cualquier fuente externa. | `CanonicalExercise` |
| **Fuente de catálogo** | Origen externo de datos de ejercicios (ej.: wger). Solo se usa al correr el seed, nunca desde la app. | `ExerciseSource` |
| **Adaptador de fuente** | Traduce los datos de una fuente al modelo canónico (capa anticorrupción). | `ExerciseSourceAdapter` |
| **Seed** | Proceso que extrae, mapea, valida, cura y carga el catálogo. | `catalog-seed` |
| **Curaduría** | Selección y correcciones manuales versionadas (lista de ejercicios incluidos y overrides). | `curation/` |

## Términos a evitar

| No usar | Usar |
|---|---|
| "Sesión" a secas | "Entrenamiento" o "sesión de autenticación" |
| "Set" (en código) | `WorkoutSet` |
| "Peso" cuando se habla del usuario | Fuera de alcance. "Peso" siempre es la carga del ejercicio |
| "Workout del día" | "Próximo día" o "Entrenamiento" según el caso |
