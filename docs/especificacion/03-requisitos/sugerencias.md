# RF-SUG — Motor de sugerencias

**Objetivos:** OBJ-01, OBJ-03. Este es el **diferencial** de la app.
**ADR:** [ADR-0009](../adr/0009-motor-como-funcion-pura.md), [ADR-0005](../adr/0005-tipos-de-carga.md), [ADR-0006](../adr/0006-rotacion-de-dias.md), [ADR-0008](../adr/0008-registro-unilateral.md).
**Reglas:** [RN-SUG-*](../04-reglas-de-negocio.md#sug--motor-de-sugerencias). Allí está el **orden de decisión** y los parámetros.
**Textos:** [13-textos.md § Motivos](../13-textos.md#4-motivos-de-sugerencia).
**Fundamentos:** P-05, P-06, P-10 a P-13.

## Cómo decide el motor (resumen)

| Prioridad | Situación | Qué sugiere |
|---|---|---|
| 1 | El ejercicio de rutina no tiene historial propio | Estimación desde el e1RM del ejercicio, su última carga o calibración (+ reentrada si hubo una pausa) |
| 2 | Cambió el rango o el RIR objetivo | Volver a estimar desde el e1RM (+ reentrada si hubo una pausa) |
| 3 | Desde la última vez hubo una pausa de más de 21 o 42 días sin entrenar | Bajar 10 % o 20 % |
| 4 | 3 exposiciones seguidas sin mejorar | Descarga: bajar 10 % |
| 5 | Llegaste al tope, pero con mucho esfuerzo (sostenido) | Consolidar **una vez**: misma carga, tope |
| 6 | Te sobraban muchas repeticiones (sostenido) | Subir antes (5 %) o subir más (10 %) |
| 7 | Llegaste al tope en todas las series | Subir 5 % y volver al piso. Si el salto mínimo supera el 10 %, primero llegar a tope + 2 |
| 8 | Estás dentro del rango | Misma carga, +1 repetición (o completar las series que faltan) |
| 9 | Quedaste por debajo del rango | Repetir carga y piso |

## Resumen de requisitos

| ID | Título | Prioridad |
|---|---|---|
| RF-SUG-01 | Ver la sugerencia de cada ejercicio | Must |
| RF-SUG-02 | Calibrar un ejercicio sin historial | Must |
| RF-SUG-03 | Progresar con la doble progresión | Must |
| RF-SUG-04 | Ajustar según el esfuerzo informado | Must |
| RF-SUG-05 | Aplicar una descarga ante un estancamiento | Must |
| RF-SUG-06 | Retomar después de una pausa | Must |
| RF-SUG-07 | Ver por qué se sugiere una carga | Must |
| RF-SUG-08 | Sobrescribir la sugerencia | Must |
| RF-SUG-09 | Progresar en ejercicios de peso corporal | Must |
| RF-SUG-10 | Reajustar al cambiar la prescripción | Must |

---

### RF-SUG-01 — Ver la sugerencia de cada ejercicio

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario, Motor de sugerencias | RN-SUG-01, 02, 09, 15, RN-ENT-04 |

**Historia:** Como novato, quiero que la app me diga con qué peso y cuántas repeticiones hacer cada ejercicio hoy, para no tener que decidirlo.

```gherkin
Escenario: AC1 — Siempre hay una indicación
  Dado que tengo una rutina activa
  Cuando veo el próximo día o un ejercicio del entrenamiento
  Entonces cada ejercicio muestra una sugerencia de carga y repeticiones
  O una instrucción de calibración si el ejercicio no tiene ningún historial (RF-SUG-02)

Escenario: AC2 — Precargada
  Dado que llego a un ejercicio en el entrenamiento
  Entonces sus series muestran precargada la sugerencia (RN-ENT-04)

Escenario: AC3 — Pesos que existen
  Dado que el incremento de mancuernas es 2 kg
  Cuando se sugiere cualquier carga para un ejercicio con mancuernas, incluso si antes registré 11 kg a mano
  Entonces la carga sugerida es múltiplo de 2 kg (RN-SUG-09)

Escenario: AC4 — Sin conexión y rápido
  Dado que no tengo conexión
  Cuando se calcula la sugerencia de un ejercicio
  Entonces se calcula en el dispositivo en menos de 50 ms (RNF-13)

Escenario: AC5 — Refleja correcciones
  Dado que corregí una serie de un entrenamiento pasado (RF-PROG-03)
  Cuando veo la próxima sugerencia de ese ejercicio
  Entonces está calculada con el dato corregido (RN-SYNC-10)

Escenario: AC6 — Sustituto o ejercicio no planificado
  Dado que sustituyo un ejercicio o agrego uno no planificado
  Cuando veo su sugerencia
  Entonces se calcula con el historial de ese ejercicio en cualquier contexto (RN-SUG-15, caso K)
```

---

### RF-SUG-02 — Calibrar un ejercicio sin historial

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-SUG-02, 06, 07, 08, RN-ENT-04 |

**Historia:** Como novato que nunca hizo este ejercicio, quiero que la app me guíe para encontrar mi peso, para no arrancar ni demasiado liviano ni demasiado pesado.

```gherkin
Escenario: AC1 — Estimación desde otro contexto
  Dado que este ejercicio de rutina no tiene exposiciones propias
  Pero hice el mismo ejercicio en otra rutina o como sustituto, con un e1RM calculable
  Cuando veo la sugerencia
  Entonces se estima la carga a partir de ese e1RM (RN-SUG-08)
  Y el motivo lo indica

Escenario: AC2 — Historial sin e1RM
  Dado que hice este ejercicio antes, pero ninguna serie permite calcular el e1RM
  Cuando veo la sugerencia
  Entonces se sugiere la última carga de trabajo con el piso del rango (FROM_EXERCISE_HISTORY)
  Y no se pide calibrar de nuevo

Escenario: AC3 — Primera serie de calibración
  Dado que el ejercicio no tiene ningún historial
  Cuando llego a él
  Entonces veo "Elegí un peso con el que puedas hacer entre 8 y 12 repeticiones con buena técnica"
  Y el campo de carga muestra "—" (RN-ENT-04)

Escenario: AC4 — El esfuerzo es obligatorio en la calibración
  Dado que estoy en una serie de calibración
  Cuando confirmo la serie
  Entonces las opciones de esfuerzo quedan abiertas y resaltadas
  Y la siguiente serie se habilita recién cuando elijo una

Escenario: AC5 — La siguiente serie se ajusta
  Dado que hice la serie de calibración con 35 kg × 11 y "2 o 3" de esfuerzo
  Cuando paso a la siguiente serie
  Entonces se me sugiere 37,5 kg × 8 (caso E)

Escenario: AC6 — Demasiado liviano
  Dado que hice la serie de calibración con 30 kg × 12 y "4 o más"
  Cuando paso a la siguiente serie
  Entonces se me sugiere 35 kg y sigo calibrando (caso E)

Escenario: AC7 — Siempre avanza
  Dado que en una máquina con incremento de 5 kg hice 10 kg × 20 con "4 o más"
  Cuando paso a la siguiente serie
  Entonces se me sugiere 15 kg, al menos un incremento más (caso L)

Escenario: AC8 — Demasiado pesado
  Dado que en la serie de calibración con 40 kg no pude completar ninguna repetición
  Cuando paso a la siguiente serie
  Entonces no se me pide el esfuerzo
  Y se me sugiere 30 kg (40 × 0,8 = 32, hacia abajo en la grilla de 2,5), con el motivo CALIBRATION_STEP_DOWN (caso R)

Escenario: AC9 — Sin calentamiento en la calibración
  Dado que estoy calibrando un ejercicio
  Entonces el interruptor "Calentamiento" no está disponible (RN-ENT-12)
```

---

### RF-SUG-03 — Progresar con la doble progresión

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Motor de sugerencias | RN-SUG-01, 02, 09 |

**Historia:** Como usuario, quiero que la app me indique cuándo sumar repeticiones y cuándo subir el peso, para progresar de forma constante y segura.

```gherkin
Escenario: AC1 — Dentro del rango: +1 repetición
  Dado que mi prescripción es 3 × 8–12
  Y la última vez hice 60 kg × 10, 9, 9
  Cuando veo la sugerencia
  Entonces es 60 kg × 10

Escenario: AC2 — Tope alcanzado: subir la carga
  Dado que mi prescripción es 3 × 8–12 con incremento de 2,5 kg
  Y la última vez hice 60 kg × 12, 12, 12 con el esfuerzo objetivo
  Cuando veo la sugerencia
  Entonces es 62,5 kg × 8

Escenario: AC3 — Por debajo del rango: repetir
  Dado que la última vez hice 62,5 kg × 8, 8, 7
  Cuando veo la sugerencia
  Entonces es 62,5 kg × 8

Escenario: AC4 — Salto grande: primero repeticiones
  Dado que la carga de trabajo es 12 kg en mancuernas con incremento de 2 kg (el salto a 14 kg es +16,7 %)
  Y alcancé el tope de 8–12
  Cuando veo la sugerencia
  Entonces es 12 kg × 13 (EXTEND_REPS, caso G)
  Y recién cuando hago 14, 14, 14 se sugiere 14 kg × 8

Escenario: AC5 — Unilateral
  Dado que en un ejercicio unilateral hice 20 kg × (D 12 / I 10) en todas las series, con 8–12
  Cuando veo la sugerencia
  Entonces no sube la carga, porque el lado limitante no llegó al tope (RN-ENT-06)
  Y es 20 kg × 11 (caso F)

Escenario: AC6 — Una serie más liviana no cambia la referencia
  Dado que hice 60 × 10, 60 × 9 y 55 × 10
  Cuando veo la sugerencia
  Entonces la carga de trabajo es 60 kg, la más usada, y la sugerencia es 60 × 10 (caso I)

Escenario: AC7 — Los calentamientos no cuentan
  Dado que registré 2 series marcadas como calentamiento antes de las efectivas
  Cuando se calcula la sugerencia
  Entonces esas series se ignoran (RN-ENT-12)

Escenario: AC8 — Menos series que las prescriptas
  Dado que mi prescripción es 3 × 8–12 y solo hice 2 series de 60 kg × 12
  Cuando veo la sugerencia
  Entonces es 60 kg × 12 para completar las 3 series (COMPLETE_SETS, caso Q)
  Y esa exposición no suma al estancamiento

Escenario: AC9 — Carga mínima
  Dado que una bajada daría menos de 20 kg en un ejercicio con barra
  Cuando veo la sugerencia
  Entonces es 20 kg (RN-PERF-08)
```

---

### RF-SUG-04 — Ajustar según el esfuerzo informado

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Motor de sugerencias | RN-SUG-03 |

**Historia:** Como usuario, quiero que la app tenga en cuenta cuánto me costaron las series, para no subir de peso cuando voy al límite y no quedarme estancado cuando me sobra.

```gherkin
Escenario: AC1 — Consolidar una vez
  Dado que mi RIR objetivo es 2
  Y en las 2 últimas exposiciones, con la misma carga, mi RIR medio fue 0
  Y en la última alcancé el tope del rango
  Cuando veo la sugerencia
  Entonces se mantiene la carga con el tope del rango como objetivo (caso B)

Escenario: AC2 — Después de consolidar, se sube
  Dado que la sugerencia anterior fue consolidar
  Y volví a alcanzar el tope con RIR 0
  Cuando veo la sugerencia
  Entonces se sube la carga (caso B, exposición 3)
  Y esa exposición no suma al conteo de estancamiento

Escenario: AC3 — Novato con la escala simple: subida anticipada
  Dado que soy novato, mi RIR objetivo es 3 y uso la escala simple
  Y en las 2 últimas exposiciones elegí "4 o más", dentro del rango, sin llegar al tope
  Cuando veo la sugerencia
  Entonces se sube la carga un 5 % y el objetivo vuelve al piso (caso J2)

Escenario: AC4 — Novato con la escala simple: consolidar
  Dado que soy novato con RIR objetivo 3
  Y en las 2 últimas exposiciones elegí "1" y en la última alcancé el tope
  Cuando veo la sugerencia
  Entonces se consolida una vez (caso J1)

Escenario: AC5 — Subida mayor
  Dado que en las 2 últimas exposiciones mi RIR medio fue 4 o más, con objetivo 2
  Y en la última alcancé el tope con 60 kg
  Cuando veo la sugerencia
  Entonces se sube un 10 %: 65 kg × piso (caso C)

Escenario: AC6 — Una sola señal no alcanza
  Dado que solo en la última exposición el RIR medio se alejó del objetivo
  Cuando veo la sugerencia
  Entonces se aplica la doble progresión normal (P-06)

Escenario: AC7 — Sin esfuerzo informado
  Dado que no informé el esfuerzo en alguna de las 2 últimas exposiciones
  Cuando veo la sugerencia
  Entonces se aplica la doble progresión normal
```

---

### RF-SUG-05 — Aplicar una descarga ante un estancamiento

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Motor de sugerencias | RN-SUG-04 |

**Historia:** Como usuario estancado, quiero que la app me baje un poco la carga para recuperarme y volver a progresar, en lugar de repetir lo mismo sin fin.

```gherkin
Escenario: AC1 — Descarga
  Dado que en 3 exposiciones seguidas no superé mi mejor marca desde el último reinicio
  Cuando veo la sugerencia
  Entonces la carga baja un 10 %, redondeada (caso A: 62,5 → 57,5 kg), con el piso del rango

Escenario: AC2 — Después de la descarga
  Dado que hice la exposición de descarga
  Cuando veo la siguiente sugerencia
  Entonces se aplica la doble progresión desde esa carga y el conteo vuelve a cero

Escenario: AC3 — Saltear no es estancarse
  Dado que salteé ese ejercicio en 3 entrenamientos
  Cuando veo la sugerencia
  Entonces no hay descarga (RN-ENT-09)

Escenario: AC4 — Llegar al tope no es estancarse
  Dado que alcancé el tope pero la marca no superó la anterior (por ejemplo, después de consolidar)
  Cuando se evalúa el estancamiento
  Entonces esa exposición no suma al conteo

Escenario: AC5 — Bajar la carga por mi cuenta no es estancarse
  Dado que mi mejor marca era 62,5 kg y decidí bajar a 57,5 kg por mi cuenta
  Y en las 3 exposiciones siguientes sumo repeticiones
  Cuando veo la sugerencia
  Entonces no hay descarga: la marca se reinició al bajar la carga (caso P)
```

---

### RF-SUG-06 — Retomar después de una pausa

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Motor de sugerencias | RN-SUG-05, RN-GEN-01 |

```gherkin
Escenario: AC1 — Pausa media
  Dado que mi último entrenamiento finalizado, de cualquier rutina, fue hace 25 días
  Y la carga de trabajo de este ejercicio era 62,5 kg
  Cuando veo la sugerencia
  Entonces es 57,5 kg con el piso del rango (caso D)

Escenario: AC2 — Pausa larga
  Dado que pasaron 45 días sin entrenar
  Cuando veo la sugerencia
  Entonces es 50 kg con el piso del rango (caso D)

Escenario: AC3 — Rotaciones largas no son pausas
  Dado que entreno 2 veces por semana con una rutina de 4 días
  Y el día que toca lo hice por última vez hace 16 días
  Pero mi último entrenamiento fue hace 3 días
  Cuando veo la sugerencia
  Entonces no se aplica la reentrada

Escenario: AC4 — Tiene prioridad sobre la progresión
  Dado que pasaron más de 21 días sin entrenar
  Cuando se evalúan las reglas
  Entonces se aplica la reentrada y no la descarga ni la subida

Escenario: AC5 — Protege cada ejercicio la primera vez que vuelve
  Dado que no entrené durante 30 días y ya hice el Torso A al volver
  Cuando dos días después hago la Pierna A
  Entonces la prensa también recibe la reentrada, porque desde su última vez hubo una pausa de 30 días (caso O)

Escenario: AC6 — También sin historial en la rutina
  Dado que volví después de 45 días y adopté una plantilla nueva
  Y el ejercicio tiene un e1RM de antes de la pausa
  Cuando veo la sugerencia
  Entonces la estimación desde el e1RM se reduce un 20 % y el motivo lo indica
```

---

### RF-SUG-07 — Ver por qué se sugiere una carga

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-SUG-11, RN-SUG-16 |

**Historia:** Como usuario, quiero entender por qué la app me sugiere un peso, para confiar en la sugerencia y aprender a entrenar.

```gherkin
Escenario: AC1 — Motivo breve
  Dado que veo una sugerencia
  Entonces debajo aparece el motivo en una línea, en lenguaje llano, según 13-textos

Escenario: AC2 — Detalle
  Dado que toco "¿Por qué?"
  Entonces veo la regla aplicada y los datos usados (última exposición, esfuerzo, días)
  Y si soy intermedio o avanzado, además el cálculo (porcentaje, redondeo, e1RM)
  Y un enlace "En qué nos basamos" con el resumen en lenguaje llano del principio (13-textos)

Escenario: AC3 — Determinismo
  Dado que el historial no cambió y es el mismo día
  Cuando consulto la sugerencia varias veces
  Entonces siempre es la misma, con el mismo motivo (RN-SUG-16)

Escenario: AC4 — Lado limitante
  Dado que el ejercicio es unilateral
  Cuando veo el motivo
  Entonces menciona el lado limitante, por ejemplo "Tomamos tu lado izquierdo, que hizo 10"
```

---

### RF-SUG-08 — Sobrescribir la sugerencia

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-SUG-10, RN-ENT-04 |

```gherkin
Escenario: AC1 — Libertad total
  Dado que la sugerencia es 62,5 kg × 8
  Cuando registro 60 kg × 10
  Entonces se guarda lo que hice, sin advertencias que bloqueen

Escenario: AC2 — El motor aprende de lo real
  Dado que registré valores distintos a la sugerencia
  Cuando se calcula la siguiente sugerencia
  Entonces se basa en lo que hice, no en lo que se había sugerido
```

---

### RF-SUG-09 — Progresar en ejercicios de peso corporal

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Motor de sugerencias | RN-SUG-12 |

```gherkin
Escenario: AC1 — Sumar repeticiones
  Dado que en flexiones (3 × 8–15) hice 15, 14, 13
  Cuando veo la sugerencia
  Entonces es 14 repeticiones por serie

Escenario: AC2 — Listo para progresar
  Dado que hice 15, 15, 15
  Cuando veo la sugerencia
  Entonces el objetivo sigue siendo 15
  Y el motivo sugiere probar una variante más difícil

Escenario: AC3 — Series de menos
  Dado que hice solo 2 series al tope con una prescripción de 3
  Cuando veo la sugerencia
  Entonces no se considera "listo para progresar"

Escenario: AC4 — Calibración
  Dado que nunca hice el ejercicio
  Cuando llego a él
  Entonces veo "Hacé las que puedas con buena técnica y frená cuando te queden 1 o 2"
  Y las series siguientes precargan las repeticiones de la primera

Escenario: AC5 — Nunca por debajo del piso
  Dado que en flexiones (3 × 8–15) hice 5, 5, 4
  Cuando veo la sugerencia
  Entonces es 8 repeticiones por serie (el piso) (caso M)

Escenario: AC6 — Sin campo de carga
  Dado que el ejercicio es de peso corporal
  Cuando registro una serie
  Entonces solo cargo repeticiones y esfuerzo
```

---

### RF-SUG-10 — Reajustar al cambiar la prescripción

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Motor de sugerencias | RN-SUG-14, RN-SUG-08 |

**Historia:** Como usuario que cambió de objetivo o editó los rangos de su rutina, quiero que la próxima carga se recalcule para el nuevo rango, para no recibir pesos imposibles.

```gherkin
Escenario: AC1 — Cambio de objetivo
  Dado que hice 100 kg × 6, 6, 6 con un rango de 4–6 y RIR 2
  Y ajusté mi rutina al objetivo "salud general" (8–12, RIR 3)
  Cuando veo la sugerencia
  Entonces es 87,5 kg × 8 (caso H)
  Y el motivo dice que se recalculó por el cambio de rango

Escenario: AC2 — Solo cambian las series
  Dado que cambié de 3 a 4 series sin tocar el rango ni el RIR
  Cuando veo la sugerencia
  Entonces se aplican las reglas normales

Escenario: AC3 — Sin e1RM
  Dado que cambié el rango y ninguna exposición tiene e1RM calculable
  Cuando veo la sugerencia
  Entonces se mantiene la carga de trabajo con el piso del nuevo rango
```

---

## Casos de referencia

Se convierten **directamente en tests unitarios** del motor (ADR-0009, RNF-15). Salvo que se indique otra cosa: 3 × 8–12 · RIR objetivo 2 · incremento 2,5 kg · último entrenamiento del usuario hace menos de 14 días.

### Caso A — Doble progresión, estancamiento y descarga

Press de banca con barra. RIR 2 en todas las series.

Marca = (W, repeticiones medias por serie con W).

| Exp. | Registrado (kg × reps) | W | Marca | Mejor marca | Conteo | **Sugerencia siguiente** | Código |
|---|---|---|---|---|---|---|---|
| 1 | 60 × 10, 9, 9 | 60 | (60; 9,33) | (60; 9,33) | 0 | **60 × 10** | ADD_REP |
| 2 | 60 × 11, 10, 10 | 60 | (60; 10,33) | (60; 10,33) | 0 | **60 × 11** | ADD_REP |
| 3 | 60 × 12, 12, 12 | 60 | (60; 12) | tope | 0 | **62,5 × 8** (máx(62,5; 63) = 63 → 62,5; +4,2 %) | INCREASE_LOAD |
| 4 | 62,5 × 8, 8, 7 | 62,5 | (62,5; 7,67) | (62,5; 7,67) | 0 | **62,5 × 8** | REPEAT |
| 5 | 62,5 × 8, 8, 7 | 62,5 | = | = | 1 | **62,5 × 8** | REPEAT |
| 6 | 62,5 × 8, 8, 7 | 62,5 | = | = | 2 | **62,5 × 8** | REPEAT |
| 7 | 62,5 × 8, 8, 7 | 62,5 | = | = | **3** | **57,5 × 8** (mín(60; 56,25) = 56,25 → 57,5) | DELOAD |
| 8 | 57,5 × 11, 10, 10 | 57,5 | (57,5; 10,33) | reinicio | 0 | **57,5 × 11** | ADD_REP |

### Caso B — Consolidar una vez y después subir

| Exp. | Registrado | RIR | **Sugerencia siguiente** | Código |
|---|---|---|---|---|
| 1 | 60 × 11, 11, 10 | 0, 0, 0 | 60 × 11 | ADD_REP (hay una sola señal) |
| 2 | 60 × 12, 12, 12 | 0, 0, 0 | **60 × 12** | CONSOLIDATE (2 señales + tope) |
| 3 | 60 × 12, 12, 12 | 0, 0, 0 | **62,5 × 8** | INCREASE_LOAD (ya se consolidó una vez; no suma al conteo) |

### Caso C — Subida anticipada y subida mayor

- Exp. 1: 60 × 10, 10, 10 con RIR 4 → Exp. 2: 60 × 11, 11, 11 con RIR 4. Umbral mín(2 + 2, 4) = 4 ✓, dentro del rango → **62,5 × 8** (EARLY_INCREASE).
- Variante: Exp. 2 = 60 × 12, 12, 12 con RIR 4 → **65 × 8** (máx(62,5; 66) = 66 → 65, HIGH_INCREASE).

### Caso D — Reentrada (inactividad general)

W = 62,5 kg.
- Último entrenamiento del usuario hace 25 días → **57,5 × 8** (mín(60; 56,25) → 57,5, REENTRY).
- Hace 45 días → **50 × 8** (mín(60; 50) = 50).
- Hace 15 días → reglas normales (15 ≤ 21).

### Caso E — Calibración (novato)

Remo sentado en polea · RIR objetivo 3 · sin ninguna EE.

| Serie | Registrado | RTF | Cálculo | Sugerencia de la siguiente |
|---|---|---|---|---|
| 1 | 30 × 12, "4 o más" (RIR 4) | 16 > 15 | máx(32,5; abajo(36) = 35) | **35 × 8** (CALIBRATION_STEP) |
| 2 | 35 × 11, "2 o 3" (RIR 2) | 13 | e1RM = 35 × 36 / 24 = **52,5** → 52,5 × 26/36 = 37,9 → abajo | **37,5 × 8** |
| 3 | 37,5 × 9, RIR 2 | — | Fin del entrenamiento | — |

Siguiente entrenamiento: W = 37,5 (empate en "más usada" → la mayor); series con W = [9], menos de N → dentro del rango → **37,5 × 10** (ADD_REP; la exposición reinicia la marca).

### Caso F — Unilateral

Remo con mancuerna a una mano · incremento 2 kg. 20 kg × (D 12 / I 10), (D 12 / I 10), (D 12 / I 11) → lado limitante: 10, 10, 11 → **20 × 11** (ADD_REP).

### Caso G — Salto mínimo mayor al 10 %: primero repeticiones

Curl con mancuernas · 12 kg · incremento 2 kg. subida(12) = 14 kg, que es +16,7 % > 10 % → rige `REP_OVERSHOOT` (tope + 2 = 14).

| Exp. | Registrado | **Sugerencia siguiente** | Código |
|---|---|---|---|
| 1 | 12 × 12, 12, 12 | **12 × 13** (mín(14, 12 + 1)) | EXTEND_REPS |
| 2 | 12 × 13, 13, 13 | **12 × 14** | EXTEND_REPS |
| 3 | 12 × 14, 14, 14 | **14 × 8** | INCREASE_LOAD |

### Caso H — Cambio de prescripción

Última ERR: 100 × 6, 6, 6 con RIR 2 y rango 4–6. Nueva prescripción: 8–12 con RIR 3.
e1RM = 100 × 36 / (37 − 8) = 124,1 → carga = 124,1 × (37 − 11) / 36 = 89,7 → abajo → **87,5 × 8** (PRESCRIPTION_CHANGED).

### Caso I — W es la carga más usada

60 × 10, 60 × 9, 55 × 10 (RIR 2) → W = 60, series con W = [10, 9] → menos de N al tope, todas ≥ piso → **60 × 10** (ADD_REP).

### Caso J — Novato con la escala simple (RIR objetivo 3)

- **J1:** Exp. 1: 40 × 11, 11, 11 con "1" → Exp. 2: 40 × 12, 12, 12 con "1". Umbral máx(3 − 2, 0) = 1 ✓, y hay tope → **40 × 12** (CONSOLIDATE). Exp. 3: 40 × 12, 12, 12 con "Ninguna" → **42,5 × 8** (INCREASE_LOAD).
- **J2:** Exp. 1: 40 × 10, 10, 10 con "4 o más" → Exp. 2: 40 × 11, 11, 11 con "4 o más". Umbral mín(5, 4) = 4 ✓ y 4 > 3 → **42,5 × 8** (EARLY_INCREASE).

### Caso K — Sustituto con historial

En lugar del jalón (8–12, RIR 2) se hace un remo en máquina (incremento 5 kg). La última EE del remo es 50 × 10 con RIR 2: RTF 12 (aproximado), e1RM = 50 × 36 / 25 = 72 → carga = 72 × 27/36 = 54 → abajo → **50 × 8** (ESTIMATED_FROM_E1RM).

### Caso L — La calibración siempre avanza

Máquina · incremento 5 kg. Serie 1: 10 × 20 con "4 o más" → RTF 24 > 15 → máx(15; abajo(12) = 10) = **15** (CALIBRATION_STEP).

### Caso M — Peso corporal

Flexiones · 3 × 8–15.
- 15, 14, 13 → **14** (BODYWEIGHT_ADD_REP).
- 15, 15, 15 → **15** (BODYWEIGHT_READY).
- 5, 5, 4 → **8** (máx(piso, mín(15, 4 + 1))).
- 15, 15 (solo 2 series) → **15**, pero BODYWEIGHT_ADD_REP: faltan series para estar "listo".

### Caso N — Carga mínima con barra

Sentadilla con barra · W = 22,5 kg · pausa de 45 días → bajada(22,5; 20 %) = redondear(mín(20; 18)) = 17,5 → queda **debajo de 20 kg** → **20 × piso** (RN-PERF-08).

### Caso O — Reentrada por ejercicio en una rotación

PLT-TP4. El usuario no entrena entre el día 0 y el día 30.
- Día 30, Torso A: la última ERR es de antes del día 0, con un hueco de 30 días → −10 % (REENTRY).
- Día 32, Pierna A (prensa, W = 100 kg): el último entrenamiento fue hace 2 días, **pero** desde la última ERR de la prensa hubo un hueco de 30 días → **90 × piso** (REENTRY).
- Día 39, Pierna A otra vez: la última ERR es del día 32 y desde ahí no hubo huecos → reglas normales.
- Sin pausas, con 2 entrenamientos por semana: una rotación de 14 días entre exposiciones de la prensa **no** dispara la reentrada, porque el mayor hueco entre entrenamientos es de 3 o 4 días.

### Caso P — Bajar la carga por cuenta propia reinicia la marca

Mejor marca (62,5; 8). El usuario registra 57,5 × 9, 9, 9 (bajó por su cuenta) → reinicio, mejor marca (57,5; 9), conteo 0. Después 57,5 × 10, 10, 10 → mejora. **Nunca llega a DELOAD** mientras suma repeticiones.

### Caso Q — Menos series que las prescriptas

3 × 8–12. 60 × 12, 12 (2 series) → hay tope en todas, pero menos de N → **60 × 12** (COMPLETE_SETS). No suma al estancamiento. La exposición siguiente con 60 × 12, 12, 12 → **62,5 × 8**.

### Caso R — Calibración demasiado pesada

Barra · incremento 2,5 kg. Serie 1: 40 kg × 0 → redondeo hacia abajo de 40 × 0,8 = 32 → **30 × 8** (CALIBRATION_STEP_DOWN), sin pedir esfuerzo.

### Caso S — Historial sin e1RM

Prensa en una rutina recién adoptada · máquina con incremento de 5 kg · sin ERR. La única EE es de otra rutina: 42 kg (escrito a mano) × 20, 20 con "4 o más" → RTF 24 > 15, ninguna serie permite calcular el e1RM → W = 42, al múltiplo más cercano de 5 (la mitad va hacia abajo, RN-SUG-09) → **40 × 8** (FROM_EXERCISE_HISTORY, RF-SUG-02 AC2).

### Caso T — Calibración en peso corporal

Fondos · 3 × 8–15 · sin ninguna EE → sin carga, con la instrucción "Hacé las que puedas con buena técnica y frená cuando te queden 1 o 2" (BODYWEIGHT_CALIBRATION, RN-SUG-12).
