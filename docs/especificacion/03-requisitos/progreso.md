# RF-PROG — Progreso e historial

**Objetivos:** OBJ-04, OBJ-05.
**Reglas:** RN-PROG-*, RN-SUG-07, RN-SYNC-10.
**Fundamentos:** P-03, P-10.

Todo lo que se muestra acá es un **dato derivado** del historial local (RN-SYNC-10). Funciona sin conexión e incluye lo registrado sin conexión.

## Resumen

| ID | Título | Prioridad |
|---|---|---|
| RF-PROG-01 | Ver el historial de entrenamientos | Must |
| RF-PROG-02 | Ver el detalle de un entrenamiento | Must |
| RF-PROG-03 | Editar un entrenamiento pasado | Must |
| RF-PROG-04 | Ver el progreso de un ejercicio | Must |
| RF-PROG-05 | Ver los récords personales | Must |
| RF-PROG-06 | Ver el volumen semanal por músculo | Should |
| RF-PROG-07 | Ver la asimetría en ejercicios unilaterales | Could |

---

### RF-PROG-01 — Ver el historial de entrenamientos

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-SYNC-10 |

```gherkin
Escenario: AC1 — Lista
  Dado que finalicé entrenamientos
  Cuando abro "Historial"
  Entonces veo los entrenamientos finalizados del más reciente al más antiguo, cada uno con fecha, rutina y día, duración y cantidad de series
  Y el entrenamiento en curso, si hay, no aparece en el historial

Escenario: AC2 — Incluye lo registrado sin conexión
  Dado que finalicé un entrenamiento sin conexión
  Cuando abro "Historial"
  Entonces aparece igual que los demás
  Y si soy usuario registrado y todavía no se respaldó, tiene un indicador discreto de "pendiente"

Escenario: AC3 — Vacío
  Dado que todavía no finalicé ningún entrenamiento
  Cuando abro "Historial"
  Entonces veo "Todavía no hay entrenamientos" y la acción "Empezar el próximo"

Escenario: AC4 — Historial largo
  Dado que tengo más de 100 entrenamientos
  Cuando me desplazo por la lista
  Entonces se cargan de forma progresiva, sin trabarse (RNF-14)
```

---

### RF-PROG-02 — Ver el detalle de un entrenamiento

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-ENT-05, RN-ENT-06 |

```gherkin
Escenario: AC1 — Detalle
  Dado que abro un entrenamiento del historial
  Entonces veo cada ejercicio con sus series (carga, repeticiones y esfuerzo; por lado si es unilateral)
  Y los ejercicios salteados o sustituidos, marcados como tales
  Y los récords logrados en ese entrenamiento
```

---

### RF-PROG-03 — Editar un entrenamiento pasado

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-ENT-02, RN-SYNC-04, RN-SYNC-10 |

**Historia:** Como usuario que se equivocó al registrar, quiero corregir un entrenamiento pasado, para que mi historial y mis sugerencias sean correctos.

```gherkin
Escenario: AC1 — Editar una serie
  Dado que abro un entrenamiento pasado
  Cuando edito la carga, las repeticiones o el esfuerzo de una serie y guardo
  Entonces el cambio se guarda localmente de inmediato
  Y se sincroniza si tengo cuenta (RF-SYNC-04)

Escenario: AC2 — Eliminar una serie
  Dado que abro un entrenamiento pasado
  Cuando elimino una serie y confirmo en D16
  Entonces la serie desaparece

Escenario: AC3 — Agregar una serie olvidada
  Dado que abro un entrenamiento pasado
  Cuando agrego una serie a uno de sus ejercicios
  Entonces queda registrada en ese entrenamiento

Escenario: AC4 — Eliminar el entrenamiento
  Dado que abro un entrenamiento pasado
  Cuando lo elimino y confirmo en D16
  Entonces desaparece del historial

Escenario: AC5 — Todo se recalcula
  Dado que edité, agregué o eliminé datos de un entrenamiento pasado
  Cuando veo sugerencias, progreso, récords o el próximo día
  Entonces reflejan el cambio (RN-SYNC-10)

Escenario: AC6 — Validación
  Dado que edito una serie con valores fuera de RN-ENT-02
  Cuando intento guardar
  Entonces veo el error y no se guarda
```

**Notas:** en el MVP **no** se editan la fecha ni la duración de un entrenamiento.

---

### RF-PROG-04 — Ver el progreso de un ejercicio

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-SUG-07, RN-PROG-01, RN-PROG-02 |

**Historia:** Como usuario, quiero ver cómo evoluciona mi fuerza en cada ejercicio, para saber si estoy progresando.

```gherkin
Escenario: AC1 — Gráfico de e1RM
  Dado que tengo varias exposiciones de un ejercicio de carga externa
  Cuando abro su progreso
  Entonces veo un gráfico con el e1RM de cada exposición en el tiempo (RN-PROG-02)
  Y los puntos de precisión aproximada se distinguen visualmente de los de precisión alta (RN-SUG-07)

Escenario: AC2 — Mejor serie
  Dado que abro el progreso de un ejercicio
  Entonces también veo la mejor serie de cada exposición (carga × repeticiones)

Escenario: AC3 — Período
  Dado que veo el gráfico
  Cuando elijo "4 semanas", "3 meses" o "Todo"
  Entonces el gráfico se limita a ese período

Escenario: AC4 — Pocos datos
  Dado que tengo una sola exposición con e1RM
  Cuando abro su progreso
  Entonces veo ese punto y el mensaje "Entrená este ejercicio un par de veces más para ver tu evolución"
  Y con 2 o más puntos se dibuja la línea (RN-PROG-02)

Escenario: AC5 — Sin e1RM
  Dado que ninguna serie del ejercicio permite estimar el e1RM (más de 15 repeticiones hasta el fallo)
  Cuando abro su progreso
  Entonces veo solo la evolución de la mejor serie, con una nota que explica por qué

Escenario: AC6 — Peso corporal
  Dado que el ejercicio es de peso corporal
  Cuando abro su progreso
  Entonces veo las máximas repeticiones y las repeticiones totales por exposición, sin e1RM (ADR-0005)

Escenario: AC7 — Unidades
  Dado que mi unidad es lb
  Cuando veo el progreso
  Entonces todos los valores están en lb (RN-PERF-05)
```

**Notas:** el progreso es por **ejercicio**, no por ejercicio de rutina: junta todas sus exposiciones, sin importar en qué rutina o día se hicieron.

---

### RF-PROG-05 — Ver los récords personales

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-PROG-03 |

```gherkin
Escenario: AC1 — Récords por ejercicio
  Dado que abro el progreso de un ejercicio
  Entonces veo sus récords (RN-PROG-03), cada uno con su fecha

Escenario: AC2 — Récord nuevo al finalizar
  Dado que en el entrenamiento superé mi mayor e1RM o mi mayor carga en un ejercicio que ya había hecho antes
  Cuando finalizo
  Entonces el resumen lo destaca (RF-ENT-11)
  Pero la primera vez que hago un ejercicio y los récords de "más repeticiones con una carga" no se destacan en el resumen (RN-PROG-03)

Escenario: AC3 — Récord corregido
  Dado que el récord venía de una serie que después corregí o eliminé
  Cuando veo los récords
  Entonces se recalculan con los datos actuales
```

---

### RF-PROG-06 — Ver el volumen semanal por músculo

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Should | Borrador | Usuario | RN-PROG-04 |

**Historia:** Como usuario intermedio, quiero ver cuántas series hago por semana para cada músculo, para saber si entreno lo suficiente cada grupo.

```gherkin
Escenario: AC1 — Semana actual
  Dado que abro "Volumen semanal"
  Entonces veo, para cada grupo muscular, las series fraccionales de la semana actual (RN-PROG-04)
  Y una línea de referencia en 10 series, con el enlace a su fundamento (P-03)

Escenario: AC2 — Semanas anteriores
  Dado que estoy en "Volumen semanal"
  Cuando navego a semanas anteriores
  Entonces veo sus valores
```

---

### RF-PROG-07 — Ver la asimetría en ejercicios unilaterales

**Could.** Muestra la diferencia de repeticiones entre los lados a lo largo del tiempo (ADR-0008).
