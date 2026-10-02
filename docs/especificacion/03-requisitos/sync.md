# RF-SYNC — Sincronización y respaldo

**Objetivo:** OBJ-04.
**ADR:** [ADR-0002](../adr/0002-estrategia-de-sincronizacion.md), [ADR-0001](../adr/0001-supabase-directo-sin-backend-propio.md).
**Reglas:** RN-SYNC-*.

## Qué se sincroniza

| Dato | ¿Se sincroniza? | Nota |
|---|---|---|
| Perfil y preferencias (nivel, objetivo, días, unidad, modo de esfuerzo, incrementos, rutina activa) | ✅ | |
| Rutinas, días y ejercicios de rutina | ✅ | Incluye las plantillas adoptadas, porque son copias del usuario |
| Entrenamientos **finalizados** y sus series | ✅ | Editables y eliminables (RF-SYNC-04) |
| Entrenamiento **en curso** | ❌ hasta finalizarlo | RN-SYNC-13 |
| Catálogo de ejercicios | ⬇️ Solo descarga | Viene incluido en la app y se actualiza desde el servidor (RF-CAT, ADR-0004) |
| Plantillas publicadas | ⬇️ Solo descarga | Igual que el catálogo |
| Datos derivados (sugerencias, e1RM, récords, próximo día) | ❌ | Se recalculan en el dispositivo (RN-SYNC-10) |
| Datos del invitado | ❌ | Hasta que se migran a una cuenta (RF-AUTH-05) |

## Resumen

| ID | Título | Prioridad |
|---|---|---|
| RF-SYNC-01 | Respaldar automáticamente los cambios locales | Must |
| RF-SYNC-02 | Recibir cambios hechos en otro dispositivo | Should |
| RF-SYNC-03 | Restaurar los datos al iniciar sesión | Must |
| RF-SYNC-04 | Propagar ediciones y eliminaciones | Must |
| RF-SYNC-05 | Resolver conflictos de edición concurrente | Must |
| RF-SYNC-06 | Ver el estado de sincronización | Must |
| RF-SYNC-07 | Sincronizar manualmente | Should |

---

### RF-SYNC-01 — Respaldar automáticamente los cambios locales

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Usuario registrado, Motor de sincronización | RN-SYNC-01, 06, 07, 09 | ADR-0002 |

**Historia:** Como usuario registrado, quiero que lo que registro se respalde solo, para no tener que acordarme de hacerlo ni perder datos.

```gherkin
Escenario: AC1 — Con conexión
  Dado que estoy autenticado y tengo conexión
  Cuando guardo un cambio sincronizable (por ejemplo, edito una rutina o finalizo un entrenamiento)
  Entonces el cambio se guarda localmente de inmediato
  Y se sube al servidor en menos de 10 segundos, sin que tenga que hacer nada
  (las series del entrenamiento en curso se suben al finalizarlo, AC8)

Escenario: AC2 — Sin conexión
  Dado que estoy autenticado y no tengo conexión
  Cuando confirmo una serie
  Entonces la serie se guarda localmente y queda como cambio pendiente
  Y la interfaz no muestra errores ni bloquea el registro

Escenario: AC3 — Recuperar la conexión
  Dado que tengo cambios pendientes
  Cuando el dispositivo recupera la conexión con la app abierta
  Entonces los cambios pendientes se suben sin intervención

Escenario: AC4 — Reabrir la app con pendientes
  Dado que cerré la app con cambios pendientes
  Cuando la abro o vuelve al primer plano con conexión
  Entonces los cambios pendientes se suben

Escenario: AC5 — El servidor rechaza un cambio
  Dado que tengo 10 cambios pendientes
  Y el servidor rechaza 1 por datos inválidos
  Cuando se sincroniza
  Entonces los otros 9 se suben igual
  Y el rechazado queda marcado con error, visible en el estado de sincronización (RF-SYNC-06)

Escenario: AC6 — Reenvío idempotente
  Dado que un cambio se subió pero la confirmación no llegó al dispositivo
  Cuando se vuelve a enviar
  Entonces en el servidor no queda duplicado

Escenario: AC7 — El invitado no sincroniza
  Dado que uso la app como invitado
  Cuando registro datos con conexión
  Entonces no se intenta ninguna comunicación con el servidor de datos del usuario

Escenario: AC8 — El entrenamiento en curso se sube al finalizar
  Dado que estoy autenticado, con conexión y en pleno entrenamiento
  Cuando confirmo series
  Entonces se guardan localmente, pero no se suben (RN-SYNC-13)
  Y cuando finalizo el entrenamiento, se sube completo

Escenario: AC9 — El servidor no acepta mi versión
  Dado que el servidor mantuvo una versión más reciente de un registro que yo edité (LWW)
  Cuando se sincroniza
  Entonces mi dispositivo adopta la versión ganadora que devuelve el servidor
  Y no queda como pendiente ni diverge (07 §3)
```

**Notas:** no hay sincronización con la app cerrada (Q-04).

---

### RF-SYNC-02 — Recibir cambios hechos en otro dispositivo

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Should | Borrador | Usuario registrado | RN-SYNC-06, 07, 10 | ADR-0002 |

**Historia:** Como usuario registrado con más de un dispositivo, quiero ver en cada uno lo que registré en el otro, para tener un solo historial.

```gherkin
Escenario: AC1 — Entrenamiento hecho en otro dispositivo
  Dado que registré un entrenamiento en el dispositivo A y se sincronizó
  Cuando abro la app en el dispositivo B con conexión
  Entonces el entrenamiento aparece en el historial de B

Escenario: AC2 — Los datos derivados se recalculan
  Dado que en B llegó un entrenamiento nuevo desde A
  Cuando veo el próximo día y las sugerencias en B
  Entonces reflejan ese entrenamiento (RN-SYNC-10)

Escenario: AC3 — Sin conexión
  Dado que el dispositivo B no tiene conexión
  Cuando lo uso
  Entonces veo los últimos datos recibidos y puedo seguir entrenando
  Y los cambios de A llegan cuando B recupera la conexión
```

---

### RF-SYNC-03 — Restaurar los datos al iniciar sesión

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Usuario registrado | RN-SYNC-07, 10 | ADR-0002 |

**Historia:** Como usuario registrado que cambió de teléfono o reinstaló la app, quiero recuperar todo mi historial al iniciar sesión, para seguir entrenando donde lo dejé.

```gherkin
Escenario: AC1 — Restauración completa
  Dado que tengo una cuenta con rutinas y entrenamientos
  Cuando inicio sesión en un dispositivo sin datos
  Entonces veo "Restaurando tus datos…" con un indicador de progreso
  Y al terminar veo mi perfil, rutinas, historial y progreso como estaban

Escenario: AC2 — Restauración interrumpida
  Dado que la restauración está en curso
  Cuando se corta la conexión
  Entonces lo ya descargado se conserva y la app es usable
  Y veo el aviso de restauración incompleta (13 §9)
  Y la restauración continúa sola al recuperar la conexión, sin descargar de nuevo lo que ya tenía

Escenario: AC3 — Cuenta sin datos
  Dado que mi cuenta no tiene datos
  Cuando inicio sesión
  Entonces paso al onboarding solo si ni el perfil local ni el de la cuenta lo tienen completo (07 §4.2)
  Y si no, voy al inicio
```

**Notas:** orden de descarga: catálogo → perfil → rutinas → entrenamientos, para que la app sea usable lo antes posible. RF-SYNC-02 (Should) reutiliza el mismo pull de forma incremental.

---

### RF-SYNC-04 — Propagar ediciones y eliminaciones

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Usuario registrado | RN-SYNC-04, 10 | ADR-0002 |

**Historia:** Como usuario que se equivocó al registrar, quiero que la corrección llegue a todos mis dispositivos, para que mi historial y mis sugerencias sean correctos.

```gherkin
Escenario: AC1 — Edición
  Dado que edité el peso de una serie de un entrenamiento pasado en A
  Cuando A y B sincronizan
  Entonces B muestra la serie con el peso corregido

Escenario: AC2 — Eliminación
  Dado que eliminé un entrenamiento en A
  Cuando A y B sincronizan
  Entonces el entrenamiento desaparece de B
  Y no vuelve a aparecer en sincronizaciones posteriores

Escenario: AC3 — Recalcular después de corregir
  Dado que corregí una serie que afectaba la sugerencia de un ejercicio
  Cuando veo la próxima sugerencia de ese ejercicio
  Entonces está calculada con el dato corregido
```

**Notas:** las pantallas y reglas para **editar** una serie se definen en RF-ENT y RF-PROG. Acá solo se define la propagación.

---

### RF-SYNC-05 — Resolver conflictos de edición concurrente

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Motor de sincronización | RN-SYNC-03, 04, 05 | ADR-0002 |

**Historia:** Como usuario con dos dispositivos, quiero que si edité lo mismo en los dos sin conexión, ambos terminen mostrando lo mismo, para no tener historiales distintos.

```gherkin
Escenario: AC1 — Misma serie editada en dos dispositivos
  Dado que edité la misma serie en A (10:00) y en B (10:05), los dos sin conexión
  Cuando ambos sincronizan
  Entonces los dos muestran la versión de B (RN-SYNC-03)

Escenario: AC2 — Edición contra eliminación
  Dado que eliminé una serie en A y la edité en B, los dos sin conexión
  Cuando ambos sincronizan
  Entonces la serie queda eliminada en los dos (RN-SYNC-04)

Escenario: AC3 — Registros nuevos nunca chocan
  Dado que registré un entrenamiento en A y otro en B, los dos sin conexión
  Cuando ambos sincronizan
  Entonces los dos entrenamientos existen en A y en B

Escenario: AC4 — Convergencia
  Dado que A y B sincronizaron después del último cambio
  Cuando comparo sus datos
  Entonces son idénticos
```

---

### RF-SYNC-06 — Ver el estado de sincronización

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Usuario | RN-SYNC-08, 09, 11, 13, 14 | ADR-0002 |

**Historia:** Como usuario, quiero saber si mis datos están respaldados, para confiar en que no los voy a perder.

| Estado | Qué ve el usuario | Acción disponible |
|---|---|---|
| Sincronizado | "Respaldado · hace 2 min" | — |
| Sincronizando | "Respaldando…" | — |
| Pendiente sin conexión | "N cambios sin respaldar · sin conexión" | — |
| Pendiente con conexión | "N cambios por respaldar…" | — |
| Entrenamiento en curso | "Tu entrenamiento se respalda al finalizarlo." | — |
| Sesión vencida | "Tu sesión venció. Tus datos siguen en este teléfono." | "Volver a entrar" (solo la misma cuenta, RN-AUTH-07) |
| Error de red | "No pudimos respaldar. Lo intentamos de nuevo solos." | "Reintentar" |
| Conflicto | "N cambios no se pudieron respaldar" | "Ver" → S25 → D12 "Descartar este cambio" |
| Invitado | "Sin respaldo: tus datos solo están en este teléfono" | "Crear cuenta" |
| App desactualizada | "Actualizá la app para respaldar tus datos" | — |

```gherkin
Escenario: AC1 — Consultar el estado
  Dado que estoy autenticado
  Cuando abro la pantalla de perfil
  Entonces veo el estado de sincronización según la tabla

Escenario: AC2 — Indicador discreto
  Dado que tengo cambios pendientes
  Cuando navego por la app
  Entonces veo un indicador discreto de "pendiente", sin mensajes que interrumpan

Escenario: AC3 — Nada interrumpe el entrenamiento
  Dado que tengo un entrenamiento en curso
  Cuando la sincronización falla o se pierde la conexión
  Entonces no aparecen diálogos, toasts ni banners de error sobre la pantalla del entrenamiento

Escenario: AC4 — Resolver un cambio rechazado
  Dado que el servidor rechazó un cambio por validación (RN-SYNC-11)
  Cuando abro "Ver" en el estado de sync
  Entonces veo el registro afectado y el motivo
  Y puedo elegir "Descartar este cambio", que lo reemplaza por la versión del servidor
  O, si nunca se subió, lo borra junto con los registros que dependen de él, y D12 me dice cuántos son
  Y puedo elegir "Reintentar", por ejemplo después de actualizar la app

Escenario: AC5 — Reintentar
  Dado que la última sincronización falló por la red
  Cuando toco "Reintentar"
  Entonces se ejecuta una sincronización inmediata
```

---

### RF-SYNC-07 — Sincronizar manualmente

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Should | Borrador | Usuario registrado | RN-SYNC-06 | ADR-0002 |

**Historia:** Como usuario registrado, quiero forzar un respaldo, para quedarme tranquilo antes de cambiar de teléfono o después de un error.

```gherkin
Escenario: AC1 — Sincronizar ahora
  Dado que estoy autenticado y tengo conexión
  Cuando toco "Sincronizar ahora"
  Entonces se hace push y después pull
  Y el estado se actualiza al terminar

Escenario: AC2 — Sin conexión
  Dado que no tengo conexión
  Cuando toco "Sincronizar ahora"
  Entonces veo que se va a sincronizar cuando haya conexión
```
