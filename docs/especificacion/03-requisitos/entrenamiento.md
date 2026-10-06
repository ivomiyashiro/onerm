# RF-ENT — Entrenamiento

**Objetivo:** OBJ-02. Este es el **núcleo de la experiencia**.
**ADR:** [ADR-0006](../adr/0006-rotacion-de-dias.md), [ADR-0008](../adr/0008-registro-unilateral.md).
**Reglas:** RN-ENT-*, RN-RUT-01.

**Contexto de diseño:** en el gimnasio, entre series, con una sola mano, poca atención disponible y posiblemente sin señal. Cada interacción frecuente tiene que resolverse en **1–2 toques** y **nunca depender de la red** (RNF-01).

## Resumen

| ID | Título | Prioridad |
|---|---|---|
| RF-ENT-01 | Iniciar el entrenamiento del próximo día (o elegir otro) | Must |
| RF-ENT-02 | Registrar una serie | Must |
| RF-ENT-03 | Registrar una serie unilateral | Must |
| RF-ENT-04 | Editar o eliminar una serie del entrenamiento en curso | Must |
| RF-ENT-05 | Agregar una serie extra | Should |
| RF-ENT-06 | Usar el temporizador de descanso | Must |
| RF-ENT-07 | Mantener la pantalla encendida | Must |
| RF-ENT-08 | Saltear un ejercicio | Must |
| RF-ENT-09 | Sustituir un ejercicio | Should |
| RF-ENT-10 | Agregar un ejercicio no planificado | Could |
| RF-ENT-11 | Finalizar el entrenamiento | Must |
| RF-ENT-12 | Descartar el entrenamiento | Must |
| RF-ENT-13 | Retomar un entrenamiento interrumpido | Must |
| RF-ENT-14 | Marcar series de calentamiento | Should |
| RF-ENT-15 | Registrar un entrenamiento pasado | Could |
| RF-ENT-16 | Agregar notas al entrenamiento | Could |

---

### RF-ENT-01 — Iniciar el entrenamiento del próximo día (o elegir otro)

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-RUT-01, RN-ENT-01, RN-ENT-08 |

**Historia:** Como usuario en el gimnasio, quiero ver qué me toca hoy y empezar con un toque, para no perder tiempo decidiendo.

```gherkin
Escenario: AC1 — Próximo día
  Dado que tengo una rutina activa
  Cuando abro la app
  Entonces el inicio muestra el próximo día (RN-RUT-01) con sus ejercicios y la carga sugerida de cada uno
  Y la acción principal es "Empezar" (botón central de la barra de pestañas, 08 §2)

Escenario: AC2 — Empezar
  Dado que veo el próximo día
  Cuando toco "Empezar"
  Entonces se crea un entrenamiento en curso con una copia de la prescripción de ese día (RN-ENT-08)
  Y veo el primer ejercicio con su primera serie precargada

Escenario: AC3 — Elegir otro día
  Dado que veo el próximo día
  Cuando toco "Cambiar día"
  Entonces veo todos los días de la rutina, cada uno con "hecho hace N días" o "nunca hecho"
  Y el día que toca aparece destacado como recomendado
  Y puedo empezar cualquiera de ellos

Escenario: AC4 — Ya hay uno en curso
  Dado que tengo un entrenamiento en curso
  Cuando abro la app
  Entonces la acción principal es "Continuar" con el tiempo del entrenamiento (RN-ENT-01)

Escenario: AC5 — Sin rutina activa
  Dado que no tengo rutina activa
  Cuando abro la app
  Entonces el inicio muestra el estado vacío con "Elegí una plantilla" y "Crear rutina"

Escenario: AC6 — Sin conexión
  Dado que no tengo conexión
  Cuando inicio un entrenamiento
  Entonces todo funciona igual

Escenario: AC7 — Desde cualquier pestaña
  Dado que estoy en Rutinas, Progreso o Perfil
  Cuando toco el botón central de la barra de pestañas
  Entonces empiezo el próximo día, o vuelvo al entrenamiento en curso si hay uno
  Y sin rutina activa el botón está deshabilitado
```

---

### RF-ENT-02 — Registrar una serie

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-ENT-02, RN-ENT-03, RN-ENT-04, RN-SYNC-01 |

**Historia:** Como usuario entre series, quiero confirmar lo que hice con un toque cuando coincide con lo sugerido, y ajustarlo rápido cuando no, para registrar sin dejar de entrenar.

```gherkin
Escenario: AC1 — Confirmar la sugerencia
  Dado que la serie actual muestra la sugerencia precargada: 60 kg × 8
  Cuando toco "Hecho"
  Entonces la serie se guarda localmente con 60 kg × 8
  Y recibo respuesta visual en menos de 100 ms (RNF-03) y una vibración breve
  Y arranca el temporizador de descanso (RF-ENT-06)

Escenario: AC2 — Ajustar antes de confirmar
  Dado que hice 7 repeticiones en lugar de 8
  Cuando toco "−" en repeticiones y después "Hecho"
  Entonces la serie se guarda con 60 kg × 7

Escenario: AC3 — Ajustar la carga
  Dado que la serie actual tiene 60 kg precargados
  Cuando toco "+" en carga
  Entonces sube al siguiente múltiplo del incremento del equipamiento (RN-PERF-06)
  Y también puedo tocar el valor para escribirlo con el teclado numérico

Escenario: AC4 — Informar el esfuerzo
  Dado que confirmé una serie
  Cuando aparecen las opciones de esfuerzo según mi modo (RN-ENT-03)
  Entonces puedo elegir una con un toque
  Y las opciones siguen visibles en la fila de esa serie hasta que elijo una o confirmo la serie siguiente
  Y si no elijo ninguna, la serie queda guardada sin esfuerzo y puedo informarlo después tocando la serie
  Pero no se me bloquea el avance a la siguiente serie (salvo en la calibración, RF-SUG-02 AC4)

Escenario: AC5 — Valores fuera de rango
  Dado que escribo una carga o unas repeticiones fuera de RN-ENT-02
  Cuando intento confirmar
  Entonces veo el error y la serie no se guarda

Escenario: AC6 — Persistencia inmediata
  Dado que confirmé una serie
  Cuando la app se cierra o se mata el proceso un instante después
  Entonces al reabrirla la serie está registrada (RNF-02)

Escenario: AC7 — Avance automático
  Dado que confirmé la última serie prescripta de un ejercicio
  Cuando termina de guardarse
  Entonces la vista pasa al siguiente ejercicio no completado
```

---

### RF-ENT-03 — Registrar una serie unilateral

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-ENT-05, RN-ENT-06 |

**Historia:** Como usuario que hace un ejercicio a una mano o a una pierna, quiero registrar repeticiones y esfuerzo por lado cuando difieren, para que mi historial refleje la realidad y el motor no sobreestime mi lado débil.

```gherkin
Escenario: AC1 — Ambos lados iguales (caso común)
  Dado que el ejercicio es unilateral y la sugerencia es 20 kg × 10 por lado
  Cuando toco "Hecho"
  Entonces se guarda una serie con 20 kg, 10 repeticiones en el lado izquierdo y 10 en el derecho

Escenario: AC2 — Lados distintos
  Dado que hice 10 repeticiones con el derecho y 8 con el izquierdo
  Cuando toco "Distinto por lado" y cargo 10 y 8
  Y toco "Hecho"
  Entonces se guarda una serie con 10 repeticiones en el lado derecho y 8 en el izquierdo
  Y aparecen dos filas de opciones de esfuerzo, "Izq" y "Der"

Escenario: AC3 — La carga es por lado
  Dado que el ejercicio es unilateral o con mancuernas
  Cuando veo o cargo la carga
  Entonces la etiqueta indica "por mancuerna" o "por lado" (RN-ENT-05)

Escenario: AC4 — Lado limitante
  Dado que registré 10 en el lado derecho y 8 en el izquierdo
  Cuando el motor calcula la próxima sugerencia
  Entonces usa el lado limitante: izquierdo, 8 repeticiones (RN-ENT-06)
  Y el motivo de la sugerencia lo menciona

Escenario: AC5 — El descanso empieza después de ambos lados
  Dado que el ejercicio es unilateral
  Cuando confirmo la serie
  Entonces el temporizador arranca una sola vez, después de confirmar la serie completa (ambos lados)
```

---

### RF-ENT-04 — Editar o eliminar una serie del entrenamiento en curso

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-ENT-02, RN-SYNC-04 |

```gherkin
Escenario: AC1 — Editar
  Dado que confirmé una serie con un error
  Cuando la toco y corrijo la carga, las repeticiones o el esfuerzo
  Entonces la serie se actualiza localmente de inmediato

Escenario: AC2 — Eliminar
  Dado que registré una serie por error
  Cuando la elimino
  Entonces desaparece del entrenamiento
  Y puedo deshacer la acción durante 5 segundos
```

**Notas:** editar series de entrenamientos **finalizados** es parte de RF-PROG (iteración 4). La propagación está en RF-SYNC-04.

---

### RF-ENT-05 — Agregar una serie extra

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Should | Borrador | Usuario | RN-ENT-02 |

```gherkin
Escenario: AC1 — Serie extra
  Dado que completé las series prescriptas de un ejercicio
  Cuando toco "Agregar serie"
  Entonces aparece una serie nueva precargada con los valores de la última
  Y la prescripción de la rutina no cambia
```

---

### RF-ENT-06 — Usar el temporizador de descanso

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario, sistema operativo (Android / iOS) | RN-ENT-07 |

**Historia:** Como usuario, quiero que el descanso se cuente solo y me avise cuando termina, aunque tenga el teléfono bloqueado en el bolsillo, para no mirar el reloj ni descansar de más.

```gherkin
Escenario: AC1 — Arranque automático
  Dado que confirmé una serie
  Entonces arranca el temporizador con el descanso prescripto de ese ejercicio

Escenario: AC2 — Sumar tiempo
  Dado que el temporizador está corriendo
  Cuando toco "+15 s"
  Entonces el tiempo restante aumenta 15 segundos

Escenario: AC3 — Reiniciar
  Dado que el temporizador está corriendo
  Cuando toco "Reiniciar"
  Entonces vuelve al descanso prescripto completo

Escenario: AC4 — Saltear
  Dado que el temporizador está corriendo
  Cuando toco "Saltear"
  Entonces se detiene y no se emite ningún aviso

Escenario: AC5 — Aviso con la pantalla bloqueada
  Dado que el temporizador está corriendo, la pantalla está bloqueada y di permiso de notificaciones y de alarmas exactas
  Cuando el descanso termina
  Entonces recibo una notificación con vibración que dice que es hora de la siguiente serie
  Y llega con un retraso de 5 s como máximo (RNF-23)

Escenario: AC6 — Aviso con la app abierta
  Dado que la app está en primer plano
  Cuando el descanso termina
  Entonces el teléfono vibra y la pantalla lo indica

Escenario: AC7 — Permiso de notificaciones rechazado
  Dado que rechacé el permiso de notificaciones
  Cuando el descanso termina con la app en primer plano
  Entonces el teléfono vibra y la pantalla lo indica
  Y en la pantalla de entrenamiento veo un aviso discreto: "Activá las notificaciones para que te avisemos con la pantalla bloqueada", con la acción "Activar"

Escenario: AC8 — Precisión en segundo plano
  Dado que el temporizador marcaba 2:00 y la app pasó a segundo plano
  Cuando vuelvo a la app 1:30 después
  Entonces el temporizador muestra 0:30 (RN-ENT-07)

Escenario: AC9 — Pedido del permiso en contexto
  Dado que nunca se me pidió el permiso de notificaciones
  Cuando confirmo mi primera serie
  Entonces se me explica para qué se usa y se me pide el permiso
  Y si lo doy y el sistema no permite alarmas exactas, se me explica por qué hacen falta y puedo abrir los ajustes del teléfono para permitirlas (D17)
  Y el entrenamiento sigue igual si rechazo cualquiera de los dos

Escenario: AC10 — Alarmas exactas no permitidas
  Dado que di permiso de notificaciones pero no de alarmas exactas
  Cuando arranca el temporizador
  Entonces no se programa el aviso con la pantalla bloqueada (RN-ENT-07)
  Y si el descanso termina con la app en primer plano, el teléfono vibra y la pantalla lo indica
  Y en la pantalla de entrenamiento veo un aviso discreto: "Permití las alarmas para que te avisemos a tiempo con la pantalla bloqueada", con la acción "Permitir"
```

---

### RF-ENT-07 — Mantener la pantalla encendida

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario, SO Android | — |

```gherkin
Escenario: AC1 — Durante el entrenamiento
  Dado que tengo un entrenamiento en curso y la pantalla de entrenamiento abierta
  Cuando pasan varios minutos sin tocar el teléfono
  Entonces la pantalla no se apaga

Escenario: AC2 — Fuera del entrenamiento
  Dado que finalicé o descarté el entrenamiento, o salí de esa pantalla
  Entonces la pantalla vuelve a apagarse según la configuración del sistema
```

**Notas:** *Could:* un ajuste para desactivarlo, por batería.

---

### RF-ENT-08 — Saltear un ejercicio

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-ENT-09 |

```gherkin
Escenario: AC1 — Saltear
  Dado que estoy en un ejercicio
  Cuando toco "Saltear ejercicio"
  Entonces el ejercicio queda marcado como salteado y paso al siguiente

Escenario: AC2 — No penaliza la progresión
  Dado que salteé un ejercicio
  Cuando el motor calcula la próxima sugerencia de ese ejercicio
  Entonces el salteo no cuenta como fallo ni como realización (RN-ENT-09)

Escenario: AC3 — Volver a un salteado
  Dado que salteé un ejercicio
  Cuando vuelvo a él antes de finalizar
  Entonces puedo registrar sus series normalmente
```

---

### RF-ENT-09 — Sustituir un ejercicio

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Should | Borrador | Usuario | RN-ENT-10 |

**Historia:** Como usuario en un gimnasio lleno, quiero reemplazar un ejercicio por otro equivalente cuando la máquina está ocupada, para no cortar el entrenamiento.

```gherkin
Escenario: AC1 — Sugerencias de reemplazo
  Dado que estoy en "Jalón al pecho"
  Cuando toco "Sustituir"
  Entonces veo primero los ejercicios del catálogo con el mismo músculo principal
  Y puedo buscar cualquier otro

Escenario: AC2 — Solo para este entrenamiento
  Dado que sustituí un ejercicio
  Cuando finalizo el entrenamiento
  Entonces la rutina no cambió (RN-ENT-10)

Escenario: AC3 — Sugerencia del sustituto
  Dado que elegí el sustituto
  Entonces se usa la prescripción del ejercicio original
  Y la carga se calcula con el historial del sustituto en cualquier contexto (RN-SUG-15)
  Pero si no tiene ningún historial, se ofrece la calibración (RF-SUG-02)

Escenario: AC4 — Sustituir después de empezar
  Dado que ya registré 1 serie de "Jalón al pecho"
  Cuando lo sustituyo por otro ejercicio
  Entonces la serie de jalón se conserva en su propio ejercicio (hecho)
  Y el sustituto aparece como un ejercicio nuevo a continuación (RN-ENT-10)

Escenario: AC5 — Marcado en el historial
  Dado que finalicé un entrenamiento con una sustitución
  Cuando veo su detalle (RF-PROG-02)
  Entonces el sustituto figura como "en lugar de Jalón al pecho"
```

---

### RF-ENT-10 — Agregar un ejercicio no planificado

**Could.** Agrega un ejercicio del catálogo al entrenamiento en curso, sin modificar la rutina.

---

### RF-ENT-11 — Finalizar el entrenamiento

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-ENT-09, RN-RUT-01 |

```gherkin
Escenario: AC1 — Finalizar completo
  Dado que registré todas las series
  Cuando toco "Finalizar"
  Entonces el entrenamiento queda finalizado con su duración
  Y veo un resumen: duración, series, ejercicios y los récords destacados según RN-PROG-03
  Y el próximo día avanza (RN-RUT-01)

Escenario: AC2 — Finalizar con ejercicios pendientes
  Dado que me faltan 2 ejercicios sin series
  Cuando toco "Finalizar"
  Entonces se me pregunta "Te faltan 2 ejercicios. ¿Finalizar igual?"
  Y si confirmo, esos ejercicios quedan como salteados (RN-ENT-09)

Escenario: AC3 — Sin conexión
  Dado que no tengo conexión
  Cuando finalizo
  Entonces todo funciona igual y el entrenamiento queda pendiente de sincronizar

Escenario: AC4 — Invitado
  Dado que soy invitado y es mi primer entrenamiento finalizado
  Cuando veo el resumen
  Entonces se me sugiere crear una cuenta (RF-AUTH-01, AC5)
```

---

### RF-ENT-12 — Descartar el entrenamiento

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-SYNC-04 |

```gherkin
Escenario: AC1 — Descartar
  Dado que tengo un entrenamiento en curso
  Cuando toco "Descartar" y confirmo en D09
  Entonces el entrenamiento y sus series se eliminan: se borran físicamente, porque nunca se subieron (RN-SYNC-13)
  Y no afectan el próximo día ni las sugerencias
```

---

### RF-ENT-13 — Retomar un entrenamiento interrumpido

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-ENT-01, RN-ENT-07, RN-ENT-11 |

**Historia:** Como usuario al que se le cerró la app, o que atendió una llamada, quiero volver exactamente donde estaba, para no perder nada.

```gherkin
Escenario: AC1 — Retomar
  Dado que tenía un entrenamiento en curso y la app se cerró
  Cuando la vuelvo a abrir
  Entonces vuelvo a la pantalla de entrenamiento, en el ejercicio donde estaba y con todas las series registradas
  Y si el descanso no terminó, el temporizador muestra el tiempo restante real (RN-ENT-07)

Escenario: AC2 — Entrenamiento abandonado
  Dado que tengo un entrenamiento en curso iniciado hace más de 12 horas (RN-ENT-11)
  Cuando abro la app
  Entonces veo el diálogo D02: continuar, finalizar o descartar
  Y si lo finalizo, su hora de fin es la de la última serie registrada (RN-ENT-11)
```

---

### RF-ENT-14 — Marcar series de calentamiento

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Should | Borrador | Usuario | RN-ENT-12 |

**Historia:** Como usuario que hace series livianas antes de las efectivas, quiero marcarlas como calentamiento, para que no afecten mis sugerencias ni mi progreso.

```gherkin
Escenario: AC1 — Marcar
  Dado que estoy por registrar una serie
  Cuando activo "Calentamiento" y toco "Hecho"
  Entonces la serie se guarda como calentamiento, atenuada en la lista
  Y no arranca el temporizador de descanso

Escenario: AC2 — No cuenta
  Dado que registré series de calentamiento
  Cuando se calculan sugerencias, e1RM, récords o volumen
  Entonces esas series se ignoran (RN-ENT-12)

Escenario: AC3 — Corregir
  Dado que me olvidé de marcar un calentamiento
  Cuando edito la serie (RF-ENT-04 o RF-PROG-03) y activo "Calentamiento"
  Entonces pasa a no contar
```

### RF-ENT-15 — Registrar un entrenamiento pasado

**Could.** Registrar un entrenamiento con una fecha anterior, por ejemplo si ayer el usuario se olvidó. Afecta al próximo día y a las sugerencias como cualquier otro, porque son datos derivados.

### RF-ENT-16 — Agregar notas al entrenamiento

**Could.** Una nota libre por entrenamiento, por ejemplo "dormí mal".
