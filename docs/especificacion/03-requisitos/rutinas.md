# RF-RUT — Rutinas

**Objetivo:** OBJ-01.
**ADR:** [ADR-0006](../adr/0006-rotacion-de-dias.md).
**Reglas:** RN-RUT-*.
**Contenido:** [11-plantillas.md](../11-plantillas.md).

## Resumen

| ID | Título | Prioridad |
|---|---|---|
| RF-RUT-01 | Ver las plantillas y su fundamento | Must |
| RF-RUT-02 | Adoptar una plantilla | Must |
| RF-RUT-03 | Crear una rutina | Must |
| RF-RUT-04 | Editar una rutina | Must |
| RF-RUT-05 | Reordenar ejercicios y días | Must |
| RF-RUT-06 | Agregar notas a un ejercicio de rutina | Should |
| RF-RUT-07 | Activar una rutina | Must |
| RF-RUT-08 | Eliminar una rutina | Must |
| RF-RUT-09 | Duplicar una rutina | Could |

---

### RF-RUT-01 — Ver las plantillas y su fundamento

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | — |

**Historia:** Como novato, quiero ver las rutinas predefinidas y por qué están armadas así, para elegir con confianza.

```gherkin
Escenario: AC1 — Lista
  Dado que abro "Plantillas"
  Entonces veo cada plantilla con su nombre, días por semana, nivel sugerido y duración estimada por sesión

Escenario: AC2 — Detalle
  Dado que abro una plantilla
  Entonces veo sus días, ejercicios, series y la prescripción calculada para mi objetivo (RN-PERF-03)

Escenario: AC3 — Por qué esta rutina
  Dado que estoy en el detalle de una plantilla
  Cuando toco "¿Por qué esta rutina?"
  Entonces veo, en lenguaje llano, los criterios con los que está armada y sus fuentes científicas
```

**Notas:** el AC3 lleva a la app el objetivo OBJ-03 (explicable) y es material directo para la defensa.

---

### RF-RUT-02 — Adoptar una plantilla

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-RUT-03, RN-PERF-03, RN-RUT-01 |

**Historia:** Como novato, quiero empezar a usar una plantilla con un toque, para entrenar hoy mismo.

```gherkin
Escenario: AC1 — Adoptar sin rutina activa
  Dado que no tengo rutina activa
  Cuando adopto una plantilla
  Entonces se crea una copia como mi rutina (RN-RUT-03), con la prescripción según mi objetivo y nivel
  Y queda como rutina activa
  Y el inicio muestra su primer día como próximo día

Escenario: AC2 — Adoptar con rutina activa
  Dado que tengo otra rutina activa
  Cuando adopto una plantilla
  Entonces veo D07, que me pregunta si la nueva reemplaza a la activa
  Y si confirmo, la anterior queda guardada en "Mis rutinas" con su historial intacto

Escenario: AC3 — La copia es independiente
  Dado que adopté una plantilla y la edité
  Cuando el equipo actualiza esa plantilla en el catálogo
  Entonces mi rutina no cambia

Escenario: AC4 — Con un entrenamiento en curso
  Dado que tengo un entrenamiento en curso
  Cuando intento adoptar una plantilla como rutina activa
  Entonces veo D14 y tengo que finalizar o descartar el entrenamiento antes (RN-RUT-09)
```

---

### RF-RUT-03 — Crear una rutina

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario (perfil intermedio o avanzado) | RN-RUT-04, RN-RUT-05 |

**Historia:** Como usuario intermedio, quiero armar mi propia rutina con mis ejercicios, series y rangos, para seguir mi plan y aprovechar las sugerencias.

**Qué se configura:**
- **Rutina:** nombre.
- **Días:** de 1 a 7, cada uno con un nombre.
- **Por ejercicio:** ejercicio del catálogo, series, rango de repeticiones, descanso y RIR objetivo, más notas (RF-RUT-06).

```gherkin
Escenario: AC1 — Crear
  Dado que estoy en "Crear rutina"
  Cuando le pongo nombre, agrego al menos un día con al menos un ejercicio
  Y guardo
  Entonces la rutina queda en "Mis rutinas"
  Y veo D15, que me pregunta si quiero activarla

Escenario: AC2 — Valores por defecto al agregar un ejercicio
  Dado que agrego un ejercicio a un día
  Entonces su rol se completa según el tipo de ejercicio (multiarticular → principal, aislamiento → accesorio)
  Y sus series (3 para un principal, 2 para un accesorio) y su prescripción, según mi objetivo (RN-PERF-03)
  Y puedo modificar todo

Escenario: AC3 — Validación
  Dado que edito una prescripción
  Cuando el piso del rango es mayor que el tope, o algún valor sale de los límites de RN-RUT-04
  Entonces veo el error junto al campo y no puedo guardar

Escenario: AC4 — Rutina incompleta
  Dado que tengo un día sin ejercicios
  Cuando intento guardar
  Entonces veo qué día está vacío y no se guarda (RN-RUT-05)

Escenario: AC5 — Salir sin guardar
  Dado que hice cambios sin guardar
  Cuando intento salir
  Entonces se me pregunta si descartar los cambios

Escenario: AC6 — Sin conexión
  Dado que no tengo conexión
  Cuando creo una rutina
  Entonces se guarda localmente y se sincroniza después (RF-SYNC-01)

Escenario: AC7 — Advertencia de RIR 0
  Dado que pongo RIR objetivo 0 en un ejercicio
  Entonces veo junto al campo la advertencia de ir al fallo (13 §9), sin que se bloquee el guardado
```

**Notas:** la opción está disponible para todos los niveles. Para el novato no es la acción principal: se ofrece después de las plantillas.

---

### RF-RUT-04 — Editar una rutina

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-RUT-04, 05, 06, 07 |

**Historia:** Como usuario, quiero modificar mi rutina (agregar o quitar ejercicios y días, cambiar la prescripción), para adaptarla a mí.

```gherkin
Escenario: AC1 — Editar
  Dado que edito mi rutina activa
  Cuando agrego, quito o cambio ejercicios, días o prescripciones y guardo
  Entonces los cambios aplican desde el próximo entrenamiento

Escenario: AC2 — Con un entrenamiento en curso
  Dado que tengo un entrenamiento en curso
  Cuando edito la rutina y guardo
  Entonces el entrenamiento en curso no cambia (RN-RUT-06)
  Y veo "Los cambios aplican desde tu próximo entrenamiento"

Escenario: AC3 — Quitar un ejercicio con historial
  Dado que quito de mi rutina un ejercicio que ya registré
  Cuando guardo
  Entonces su historial se conserva y sigue visible en progreso (RN-RUT-07)

Escenario: AC4 — Quitar el día que tocaba
  Dado que tengo los días A, B, C y D, hice B por última vez y el próximo era C
  Cuando elimino el Día C y guardo
  Entonces el próximo día es D (RN-RUT-01)

Escenario: AC5 — Quitar el último día hecho
  Dado que tengo los días A, B, C y D y lo último que hice fue B
  Cuando elimino el Día B y guardo
  Entonces el próximo día sigue siendo C, porque se usa la posición del día borrado (RN-RUT-01)

Escenario: AC6 — Cambiar el ejercicio de un ejercicio de rutina
  Dado que en mi rutina reemplazo "Jalón al pecho" por "Remo en máquina"
  Cuando guardo
  Entonces el historial de jalón sigue perteneciendo al jalón (RN-RUT-08)
  Y la primera sugerencia de remo se calcula con el historial del remo, o con calibración si no hay (RN-SUG-02)

Escenario: AC7 — Cambiar el rango o el RIR objetivo
  Dado que cambio el rango de repeticiones de un ejercicio
  Cuando guardo
  Entonces la próxima sugerencia se recalcula para el nuevo rango (RF-SUG-10)
```

---

### RF-RUT-05 — Reordenar ejercicios y días

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-RUT-06 |

**Historia:** Como usuario, quiero cambiar el orden de los ejercicios de un día y el orden de los días, para hacerlos en la secuencia que me conviene.

```gherkin
Escenario: AC1 — Arrastrar
  Dado que edito un día de mi rutina
  Cuando arrastro un ejercicio a otra posición
  Entonces el ejercicio queda en esa posición, y así se ve en el próximo entrenamiento

Escenario: AC2 — Alternativa accesible
  Dado que no puedo o no quiero arrastrar
  Cuando uso las acciones "Subir" y "Bajar" de un ejercicio
  Entonces se mueve una posición en esa dirección

Escenario: AC3 — Reordenar días
  Dado que edito mi rutina
  Cuando cambio el orden de los días
  Entonces la rotación sigue el nuevo orden desde el último día hecho (RN-RUT-01)

Escenario: AC4 — Aviso de orden (informativo)
  Dado que muevo un ejercicio accesorio antes que uno principal
  Cuando guardo
  Entonces se permite, sin bloquear
  Y se muestra una ayuda: "Los ejercicios principales suelen ir primero para rendir más en fuerza"
```

**Notas:** el AC4 aplica P-08: el orden afecta a la fuerza pero no a la hipertrofia, así que se informa y no se impone.

---

### RF-RUT-06 — Agregar notas a un ejercicio de rutina

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Should | Borrador | Usuario | — |

**Historia:** Como usuario, quiero anotar detalles de un ejercicio (por ejemplo, "asiento en posición 4" o "agarre cerrado"), para no tener que recordarlos.

```gherkin
Escenario: AC1 — Agregar
  Dado que edito un ejercicio de mi rutina
  Cuando escribo una nota (máx. 280 caracteres) y guardo
  Entonces la nota queda asociada a ese ejercicio de esa rutina

Escenario: AC2 — Ver durante el entrenamiento
  Dado que el ejercicio tiene una nota
  Cuando llego a ese ejercicio en un entrenamiento
  Entonces veo la nota sin tener que tocar nada
```

---

### RF-RUT-07 — Activar una rutina

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-RUT-02, RN-RUT-01 |

```gherkin
Escenario: AC1 — Activar
  Dado que tengo varias rutinas guardadas
  Cuando activo una
  Entonces pasa a ser la única rutina activa (RN-RUT-02)
  Y el inicio muestra su próximo día

Escenario: AC2 — Con un entrenamiento en curso
  Dado que tengo un entrenamiento en curso
  Cuando intento activar otra rutina
  Entonces veo D14 y tengo que finalizar o descartar el entrenamiento antes (RN-RUT-09)
```

---

### RF-RUT-08 — Eliminar una rutina

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-RUT-07, RN-SYNC-04 |

```gherkin
Escenario: AC1 — Eliminar
  Dado que elimino una rutina
  Cuando confirmo en D11
  Entonces la rutina desaparece de "Mis rutinas"
  Y los entrenamientos hechos con ella siguen en mi historial (RN-RUT-07)

Escenario: AC2 — Eliminar la activa
  Dado que elimino mi rutina activa
  Cuando confirmo
  Entonces quedo sin rutina activa
  Y el inicio muestra el estado vacío con "Elegir una rutina" y "Crear rutina"

Escenario: AC3 — Eliminar la activa con un entrenamiento en curso
  Dado que tengo un entrenamiento en curso
  Cuando intento eliminar la rutina activa
  Entonces veo D14 (RN-RUT-09)
```

---

### RF-RUT-09 — Duplicar una rutina

**Could.** Crea una copia editable con el nombre "<nombre> (copia)".
