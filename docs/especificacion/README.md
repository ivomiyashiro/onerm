# Especificación del MVP — onerm

> **onerm** es un nombre provisional.
> **Estado:** borrador en construcción. Iteraciones 1 y 3 hechas: base, auth, sync, perfil, catálogo, rutinas, entrenamiento, fundamentos científicos y plantillas. Iteración 4 hecha: motor y progreso. Iteración 5 hecha: dominio, datos, arquitectura, pantallas y trazabilidad. **La especificación del MVP está completa en borrador.**
> **Última actualización:** 2026-09-30

## Propósito

Es la **fuente de verdad** de qué hace la app, para quién y por qué. Los entregables del TPO, en particular los 3–4 RF de la preentrega, **se derivan de esta especificación**, no al revés (ver [Relación con el TPO](#relación-con-el-tpo)).

Se inspira en ISO/IEC/IEEE 29148 (especificación de requisitos), adaptada a un proyecto chico:

- Requisitos como **historias de usuario** con **criterios de aceptación en Gherkin**.
- **Reglas de negocio** separadas de los requisitos, para no repetir fórmulas ni umbrales.
- **RNF medibles**, clasificados según ISO/IEC 25010.
- **Decisiones técnicas registradas como ADR** (Architecture Decision Records).
- **Trazabilidad** con IDs estables.

## Índice

| Documento | Contenido | Estado |
|---|---|---|
| [00-vision-y-alcance.md](00-vision-y-alcance.md) | Problema, objetivos, alcance del MVP, fuera de alcance, supuestos | Borrador |
| [01-glosario.md](01-glosario.md) | Lenguaje ubicuo del dominio (ES ↔ código) | Borrador |
| [02-actores.md](02-actores.md) | Actores humanos y de sistema, perfiles de usuario | Borrador |
| [03-requisitos/auth.md](03-requisitos/auth.md) | RF-AUTH: invitado, registro, login, Google, migración, logout | Borrador |
| [03-requisitos/sync.md](03-requisitos/sync.md) | RF-SYNC: respaldo, restauración, multidispositivo, conflictos, estado | Borrador |
| [03-requisitos/onboarding-perfil.md](03-requisitos/onboarding-perfil.md) | RF-PERF: onboarding, recomendación, perfil, unidades, esfuerzo | Borrador |
| [03-requisitos/catalogo.md](03-requisitos/catalogo.md) | RF-CAT: búsqueda, detalle, offline, actualización, créditos | Borrador |
| [03-requisitos/rutinas.md](03-requisitos/rutinas.md) | RF-RUT: plantillas, adoptar, crear, editar, reordenar, activar | Borrador |
| [03-requisitos/entrenamiento.md](03-requisitos/entrenamiento.md) | RF-ENT: iniciar, registrar (incluye unilateral), descanso, saltear, sustituir, finalizar, retomar | Borrador |
| [03-requisitos/sugerencias.md](03-requisitos/sugerencias.md) | RF-SUG: calibración, doble progresión, esfuerzo, descarga, reentrada, motivo; casos de referencia | Borrador |
| [03-requisitos/progreso.md](03-requisitos/progreso.md) | RF-PROG: historial, editar el pasado, e1RM, récords, volumen semanal | Borrador |
| [04-reglas-de-negocio.md](04-reglas-de-negocio.md) | RN-*: auth, sync, perfil, rutinas, entrenamiento, catálogo, motor y progreso | Borrador |
| [05-requisitos-no-funcionales.md](05-requisitos-no-funcionales.md) | RNF-01..23 (ISO 25010) | Borrador |
| [06-modelo-de-dominio.md](06-modelo-de-dominio.md) | Entidades, agregados, invariantes, casos de uso | Borrador |
| [07-datos-y-sincronizacion.md](07-datos-y-sincronizacion.md) | Qué se persiste, esquema local y remoto, RLS y LWW, algoritmo de sync, escenarios de conectividad | Borrador |
| [08-flujos-y-pantallas.md](08-flujos-y-pantallas.md) | Principios de UX, 25 pantallas, 15 diálogos, flujos (mermaid), estados por pantalla, checklist de Figma | Borrador |
| [09-trazabilidad.md](09-trazabilidad.md) | Los 4 RF del TPO, matriz RF ↔ RN ↔ pantalla ↔ verificación, entregables de la preentrega | Borrador |
| [10-fundamentos-cientificos.md](10-fundamentos-cientificos.md) | Principios P-01..P-13 con la evidencia citada y verificada | Borrador |
| [11-plantillas.md](11-plantillas.md) | Plantillas PLT-FB2, PLT-FB3 y PLT-TP4, parametrización por objetivo y volumen semanal | Borrador |
| [13-textos.md](13-textos.md) | Catálogo de textos: onboarding, esfuerzo, motivos de sugerencia, diálogos, estados vacíos y errores | Borrador |
| [12-arquitectura.md](12-arquitectura.md) | Capas, flujo de datos, topología, estado (MVVM) y carpetas | Borrador |
| [adr/](adr/README.md) | Decisiones de arquitectura | 12 registradas |

**Orden de lectura sugerido:** visión → glosario → actores → requisitos → reglas → RNF → ADR.

## Convenciones

### Identificadores

Los IDs **no se reutilizan nunca**. Si se descarta un requisito, se marca como `Eliminado` y conserva su ID.

| Prefijo | Qué identifica | Ejemplo |
|---|---|---|
| `RF-<ÉPICA>-NN` | Requisito funcional | `RF-AUTH-02` |
| `RF-<ÉPICA>-NN.ACn` | Criterio de aceptación | `RF-AUTH-02.AC3` |
| `RN-<ÁREA>-NN` | Regla de negocio | `RN-SYNC-04` |
| `RNF-NN` | Requisito no funcional | `RNF-05` |
| `ADR-NNNN` | Decisión de arquitectura | `ADR-0002` |
| `OBJ-NN` | Objetivo de producto | `OBJ-01` |
| `Q-NN` | Pregunta abierta | `Q-01` |

Épicas y áreas:

| Código | Épica |
|---|---|
| `AUTH` | Autenticación y cuenta |
| `SYNC` | Sincronización y respaldo |
| `PERF` | Onboarding y perfil |
| `CAT` | Catálogo de ejercicios |
| `RUT` | Rutinas |
| `ENT` | Entrenamiento: la sesión de entrenamiento en curso |
| `SUG` | Motor de sugerencias |
| `PROG` | Progreso e historial |

> ⚠️ Se usa `ENT` (entrenamiento) y no `SES` porque "sesión" es ambigua: puede ser sesión de autenticación o de entrenamiento. Ver [glosario](01-glosario.md).

### Prioridad (MoSCoW)

| Prioridad | Significado |
|---|---|
| **Must** | Sin esto el MVP no resuelve el problema. Se implementa sí o sí. |
| **Should** | Importante, pero el MVP funciona sin esto. Se implementa si el tiempo alcanza. |
| **Could** | Deseable. Solo si sobra tiempo. |
| **Won't** | Fuera del MVP, de forma explícita. Se registra para no reabrir la discusión. |

### Estados de un requisito

`Borrador` → `Revisado` → `Aprobado`. `Eliminado` si se descarta.

### Plantilla de requisito funcional

````md
### RF-XXX-NN — Título en infinitivo

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Usuario registrado | RN-… | ADR-… |

**Historia:** Como <actor>, quiero <acción>, para <beneficio>.

**Criterios de aceptación**

```gherkin
Escenario: AC1 — <camino feliz>
  Dado …
  Cuando …
  Entonces …
```

**Notas:** supuestos, dependencias, fuera de alcance de este RF.
````

### Criterios de aceptación

- Se escriben en **Gherkin en español**: `Dado` / `Cuando` / `Entonces` / `Y` / `Pero`.
- Cada RF tiene al menos **un camino feliz** y **un caso de error o sin conexión**.
- Cada AC tiene que poder verificarse con un test o con una prueba manual reproducible.

### Lenguaje

- **Palabras prohibidas sin una métrica:** rápido, fácil, intuitivo, amigable, simple, eficiente, robusto. Por ejemplo, no "se guarda rápido" sino "se guarda en menos de 100 ms".
- **"Sesión" nunca va sola:** siempre "sesión de autenticación" o "entrenamiento".
- Los términos del dominio se usan **tal como están definidos** en el [glosario](01-glosario.md).

### Definición de Listo (DoR) de un RF

Un RF pasa a `Revisado` cuando:

- [ ] Tiene historia (actor, acción y beneficio) y prioridad.
- [ ] Tiene al menos un AC de camino feliz y uno de error o sin conexión. *Excepción:* en las épicas que funcionan 100 % en local (PERF, CAT salvo CAT-04, RUT, ENT, SUG, PROG), el comportamiento sin conexión lo cubre **RNF-01** para todos sus RF, y no se repite un AC por RF.
- [ ] Los textos entre comillas en los AC son **ilustrativos**. La fuente única del copy es [13-textos.md](13-textos.md): si difieren, prevalece 13.
- [ ] Referencia las reglas de negocio que usa, en lugar de redefinirlas.
- [ ] No usa palabras prohibidas ni términos que falten en el glosario.
- [ ] No tiene preguntas abiertas (`Q-NN`) que lo bloqueen.

## Relación con el TPO

El TPO pide **entre 3 y 4 RF** en la preentrega. Esta especificación tiene más, y con más detalle. Cómo se reconcilian:

- Los RF finos de esta especificación se **agrupan en 3–4 RF macro** para la preentrega (por ejemplo, "Registrar entrenamiento" agrupa `RF-ENT-01..0N`).
- **Auth y sync son habilitadores**, no el valor de la app. Se presentan dentro de Offline First, persistencia y arquitectura, y **no** como uno de los 4 RF, salvo que la cátedra indique otra cosa.
- El mapeo exacto queda en `09-trazabilidad.md`.

## Preguntas abiertas

| ID | Pregunta | Afecta | Propuesta |
|---|---|---|---|
| Q-04 | ¿Hace falta sincronizar en segundo plano, con la app cerrada? | RF-SYNC-01 | Won't en el MVP: se sincroniza al abrir la app, al volver al primer plano y al recuperar la conexión. |
| Q-09 | ¿Hacemos que un profesional valide las plantillas? | 11-plantillas | Opcional, fuera de la especificación. |

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-09-30 | Iteración 1: estructura, convenciones, visión, glosario, actores, auth, sync, reglas y RNF iniciales, ADR-0001 a ADR-0006. |
| 2026-09-30 | Se resuelven Q-01 (sin confirmación de email en el MVP, queda para más adelante) y Q-02 (recuperar contraseña: Should). Se aceptan los ADR 0001, 0002 y 0004 a 0006. Se propone ADR-0007 (Expo). |
| 2026-09-30 | Iteración 3: RF-PERF, RF-CAT, RF-RUT y RF-ENT; reglas PERF, RUT, ENT y CAT; fundamentos científicos (10) y plantillas (11); ADR-0008 (unilateral). Se resuelven Q-06 y Q-07. |
| 2026-09-30 | Iteración 4: RF-SUG (con casos de referencia) y RF-PROG; RN-SUG-00..13 y RN-PROG; ADR-0009 (motor como función pura); RNF-13..15; e1RM con Brzycki y precisión alta o aproximada. |
| 2026-09-30 | Iteración 5: 06 dominio, 07 datos y sync, 08 pantallas, 09 trazabilidad, 12 arquitectura; ADR-0010 (SQLite + Drizzle), 0011 (MVVM en RN), 0012 (iOS); RNF-16..22 (accesibilidad, compatibilidad, iOS, idioma, batería). |
| 2026-09-30 | **Revisión de jueces ciegos** (2 revisores independientes). Correcciones: trigger de sync (el borrado prevalece siempre, reconciliación), unión de datos del invitado (07 §4.3), entrenamiento en curso sin sincronizar, sin vinculación automática de identidades, cambios rechazados con salida, catálogo primero; motor: W = carga más usada, EE/ERR, cambio de prescripción (RN-SUG-14), umbrales de esfuerzo alcanzables, consolidación única, reentrada por inactividad general, grilla de redondeo, calentamientos (RF-ENT-14 → Should); nuevos RN-GEN, RN-AUTH-05, RN-SYNC-11..14, RN-PERF-07, RN-RUT-08, RN-ENT-12, RN-SUG-14..16; RF-SUG-10; casos H–L; 08 completo (25 pantallas, 13 diálogos, estados de todas); 13-textos; ajustes a la redacción científica; Google y RF-SYNC-02 → Should; ADR-0007..0009 aceptados. |
| 2026-09-30 | **Segunda revisión de jueces ciegos.** Correcciones: pull por keyset `(server_updated_at, id)`; borrado lógico siempre en el cliente y tombstones (RN-SYNC-15); trigger con ramas por TG_OP; perfil con `id = user_id` (RN-AUTH-06); una cuenta por dispositivo (RN-AUTH-07) y estado de sesión vencida; "pendiente" = subible (RN-SYNC-08); descarte en cascada de cambios rechazados; unión de invitado reanudable y cancelable; `updated_at` monótono (RN-GEN-03); motor: "tope alcanzado" con definición única, marca por repeticiones medias con reinicio al bajar carga o cambiar series, reentrada por hueco de inactividad (21/42 días, Bosquet) también en prioridades 1 y 2, repeticiones extra antes de saltos > 10 % (`EXTEND_REPS`), `COMPLETE_SETS`, `CALIBRATION_STEP_DOWN`, carga mínima por equipamiento (RN-PERF-08), entradas del fold (RN-SUG-17); casos M–R; atributos del catálogo inmutables y copiados al entrenamiento; D14–D16, estados nuevos de S09 y S21, anatomía de S07; copy faltante; limitaciones declaradas (fuerza sin barra, entrenamiento en curso). |
| 2026-10-01 | Diseño: sistema visual "Peligro" (solo modo oscuro, modo claro fuera de alcance en 00 §6). 13-textos suma §10 con los textos nuevos que pidió el diseño de S07, S09 y el sistema de componentes. |
| 2026-10-01 | Diseño: el color primario pasa de amarillo a lima (#C5F04A), el de éxito a turquesa, y la identidad se llama "Kinetic" (diseno/marca.md §10). |
| 2026-10-01 | Diseño revisado con jueces (diseno/marca.md §11). 13-textos §7 y §10 actualizados (menos jerga para novatos, "Respaldar ahora", textos de S11, errores de lectura y estados nuevos). 08 §5: en S07 el motivo vive en S09/S10. |
| 2026-10-01 | S09: la serie actual se ajusta en la hoja "Ajustar serie" (carga, reps, calentamiento y esfuerzo opcional); la pantalla deja solo Hecho abajo (08 §5, 13-textos §10, diseno/marca.md §12). |
| 2026-10-01 | S09: después de Hecho, el descanso se abre a pantalla completa (esfuerzo, +15 s, Saltear) y se puede minimizar a una barra sobre Hecho (08 §5, 13-textos §10, diseno/marca.md §13). |
| 2026-10-01 | S09: hoja "Menú del entrenamiento" (Finalizar, Descartar) y descanso de calibración a pantalla completa con esfuerzo obligatorio (13-textos §10, diseno/marca.md §13). |
| 2026-10-01 | S21: hojas de ajustes para Nivel, Objetivo, Días por semana, Unidad de peso y Esfuerzo (13-textos §10, diseno/marca.md §14). |
| 2026-10-01 | Revisión final del diseño: checklist 08 §7 completo (snackbar de deshacer, S09 con notificaciones rechazadas y calibración hacia arriba); calibración corregida según RN-SUG-06 y RN-ENT-04; 09-trazabilidad enlaza el archivo de Figma. |
| 2026-10-02 | 09 §2: el caso K pasa a RF-SUG-01 (sustituto, RN-SUG-15) y el caso J se suma a RF-SUG-04 (revisión del backlog con jueces). |
| 2026-10-03 | Spikes de F1: ADR-0010 (PRAGMA de WAL y `foreign_keys` al abrir), ADR-0002 (punto de control del plan B superado), 07 §2.4 (cursor de `sync_state` como TEXT; `rest_timer_notification_id` reemplazado por un identificador fijo), RN-ENT-07 y RNF-23 (el aviso con la pantalla bloqueada requiere alarmas exactas; sin el permiso no se programa), RF-ENT-06 AC5, AC9 y AC10, D17 y su aviso en S09 y S21, ADR-0001 R10 (trigger contra la vinculación automática de identidades), RN-GEN-02 (0,1 lb cuenta como igual, aceptado). |
| 2026-10-04 | 13-textos: regla de plurales (singular con {n} = 1 y los casos de {n} = 0), «Se respalda al finalizar» en S09 y «tus datos solo están» en el estado de invitado y D13, como en RF-SYNC-06 y RF-AUTH. |
| 2026-10-05 | Peso de la barra en el perfil, uno por unidad (`barWeightKg`, `barWeightLb`; 06 §3, 07 §2.2, RN-PERF-08), decidido por el usuario: RN-PERF-08 lo hacía configurable sin campo donde guardarlo. |
| 2026-10-05 | Revisión de F3, decididas por el usuario: RN-SUG-04 (una ERR con todas las series con W en el tope, aunque sean menos de N, no suma al estancamiento; resuelve la contradicción con RF-SUG-03 AC8 y el caso Q), RN-SUG-12 (el peso corporal usa la prescripción actual) y RN-PERF-08 (con una carga mínima fuera de la grilla, el primer múltiplo igual o mayor). |
| 2026-10-06 | Inicio: la acción principal pasa al botón central de la barra de pestañas (Empezar · Continuar con el tiempo · deshabilitado) y reemplaza a la barra de acción de S07 y a la barra "Entrenamiento en curso" (08 §2 y §5, RF-ENT-01 AC1, AC4 y AC7 nuevo, 13-textos §10, diseno/marca.md §15). |

### Preguntas resueltas

| ID | Resolución |
|---|---|
| Q-01 | El registro **no exige confirmar el email** en el MVP. Queda como mejora futura y limitación conocida (ver 00 §6). |
| Q-02 | Recuperar contraseña es **Should**. |
| Q-06 | Ejercicios propios: **Could** (RF-CAT-06). |
| Q-07 | Unidades: siempre en kg, convertidas al mostrar (RN-PERF-05). |
| Q-08 | Android mínimo: el valor por defecto de Expo; pruebas en Android 10+ (RNF-19). |
| Q-03 | Recordatorio de crear cuenta: al terminar el primer entrenamiento y después como máximo una vez cada 7 días (RF-AUTH-01 AC5, D13). |
| Q-05 | Expo con development build (ADR-0007, aceptado). |
| Q-10 | Accesorios de hombros de PLT-FB3: 3 series (11-plantillas). |
