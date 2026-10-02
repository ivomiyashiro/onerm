# RF-PERF — Onboarding y perfil

**Objetivo:** OBJ-01.
**Reglas:** RN-PERF-*.
**Fundamentos:** [10](../10-fundamentos-cientificos.md), [11](../11-plantillas.md).

## Resumen

| ID | Título | Prioridad |
|---|---|---|
| RF-PERF-01 | Completar el onboarding | Must |
| RF-PERF-02 | Recibir una recomendación de plantilla | Must |
| RF-PERF-03 | Editar el perfil | Must |
| RF-PERF-04 | Cambiar la unidad de peso | Must |
| RF-PERF-05 | Elegir el modo de esfuerzo | Must |
| RF-PERF-06 | Configurar los incrementos mínimos por equipamiento | Should |

---

### RF-PERF-01 — Completar el onboarding

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-PERF-02, RN-PERF-04 |

**Historia:** Como persona que empieza a usar la app, quiero responder unas pocas preguntas sobre mí, para que la app me proponga qué entrenar.

**Preguntas, en orden:**
1. **Nivel:** novato (menos de 6 meses entrenando, o volviendo después de mucho tiempo), intermedio o avanzado.
2. **Objetivo:** salud general, músculo o fuerza.
3. **Días por semana:** 2 a 6.

```gherkin
Escenario: AC1 — Onboarding completo
  Dado que abro la app por primera vez
  Cuando respondo nivel, objetivo y días por semana
  Entonces mi perfil queda guardado con esas respuestas
  Y paso a la recomendación de plantilla (RF-PERF-02)

Escenario: AC2 — Sin conexión
  Dado que no tengo conexión
  Cuando hago el onboarding
  Entonces puedo completarlo igual

Escenario: AC3 — Volver atrás
  Dado que estoy en la pregunta 2 o 3
  Cuando toco "Atrás"
  Entonces vuelvo a la pregunta anterior con mi respuesta conservada

Escenario: AC4 — Saltear
  Dado que estoy en cualquier paso del onboarding
  Cuando toco "Saltear"
  Entonces las respuestas que ya di se conservan
  Y las que faltan se completan con los valores por defecto (RN-PERF-02)
  Y paso a la recomendación de plantilla

Escenario: AC5 — Lenguaje para novatos
  Dado que estoy eligiendo el nivel
  Cuando veo las opciones
  Entonces cada una tiene una descripción en lenguaje llano, sin jerga (sin "RIR" ni "1RM")

Escenario: AC6 — Interrupción
  Dado que respondí la pregunta 1
  Cuando cierro la app y la vuelvo a abrir
  Entonces retomo el onboarding desde la pregunta 2
```

---

### RF-PERF-02 — Recibir una recomendación de plantilla

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-PERF-01, RN-PERF-03, RN-RUT-03 |

**Historia:** Como novato, quiero que la app me recomiende una rutina según mis respuestas, para no tener que armarla yo.

```gherkin
Escenario: AC1 — Recomendación
  Dado que completé el onboarding como novato, con objetivo "músculo" y 3 días
  Cuando veo la recomendación
  Entonces se me recomienda "Cuerpo completo A/B — 3 días" (RN-PERF-01)
  Y veo por qué se recomienda, en una o dos oraciones

Escenario: AC2 — Aceptar
  Dado que veo la recomendación
  Cuando toco "Empezar con esta rutina"
  Entonces la plantilla se adopta como mi rutina activa (RF-RUT-02)
  Y su prescripción se ajusta a mi objetivo y nivel (RN-PERF-03)
  Y llego al inicio con el próximo día listo para entrenar

Escenario: AC3 — Elegir otra
  Dado que veo la recomendación
  Cuando toco "Ver otras rutinas"
  Entonces veo todas las plantillas (RF-RUT-01)
  Y la opción "Crear mi propia rutina", que para el novato se muestra como secundaria

Escenario: AC4 — Novato con muchos días
  Dado que soy novato y elegí 5 días
  Cuando veo la recomendación
  Entonces se me recomienda la plantilla de 3 días con el mensaje "3 días alcanzan para progresar"
  Y se me ofrece la de 4 días como alternativa

Escenario: AC5 — No elegir ninguna
  Dado que veo la recomendación
  Cuando toco "Ahora no"
  Entonces llego al inicio sin rutina activa
  Y el inicio muestra el estado vacío con acciones para elegir o crear una rutina

Escenario: AC6 — Objetivo fuerza
  Dado que mi objetivo es "fuerza"
  Cuando veo la recomendación
  Entonces veo el aviso de que las plantillas usan máquinas y mancuernas, y que puedo armar una rutina con barra (13 §5)
```

---

### RF-PERF-03 — Editar el perfil

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-PERF-03 |

**Historia:** Como usuario, quiero cambiar mi nivel, objetivo o días, para que la app se adapte cuando cambian mis circunstancias.

```gherkin
Escenario: AC1 — Editar
  Dado que estoy en mi perfil
  Cuando cambio mi objetivo de "salud general" a "fuerza"
  Entonces el cambio se guarda localmente de inmediato
  Y se sincroniza si tengo cuenta (RF-SYNC-01)

Escenario: AC2 — No modifica mi rutina
  Dado que tengo una rutina activa, adoptada o propia
  Cuando cambio mi objetivo o mi nivel
  Entonces mi rutina actual no se modifica
  Y se me ofrece el diálogo D06 "¿Ajustamos tu rutina?"
  Y si acepto, se recalculan rangos, RIR objetivo y descansos según RN-PERF-03, sin tocar ejercicios, orden ni notas
  Y la próxima sugerencia de cada ejercicio se recalcula para el nuevo rango (RF-SUG-10)

Escenario: AC3 — Validación
  Dado que edito los días por semana
  Cuando ingreso un valor fuera de 2 a 6
  Entonces no se permite guardarlo
```

**Notas:** "ajustar la rutina" solo reescribe la prescripción. Los ejercicios, el orden y las notas no se tocan.

---

### RF-PERF-04 — Cambiar la unidad de peso

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-PERF-05 |

**Historia:** Como usuario que entrena con discos en libras, quiero ver y cargar los pesos en lb, para no convertir a mano.

```gherkin
Escenario: AC1 — Por defecto
  Dado que es mi primer uso
  Cuando veo cualquier peso
  Entonces está en kg

Escenario: AC2 — Cambio a lb
  Dado que tengo series registradas en kg
  Cuando cambio la unidad a lb
  Entonces todos los pesos (historial, sugerencias, progreso) se muestran en lb
  Y los datos guardados no cambian (RN-PERF-05)

Escenario: AC3 — Ida y vuelta sin pérdida
  Dado que mi unidad es lb y registro una serie con 135 lb
  Cuando cambio a kg y después vuelvo a lb
  Entonces la serie sigue mostrando 135 lb
```

---

### RF-PERF-05 — Elegir el modo de esfuerzo

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-PERF-04, RN-ENT-03 |

**Historia:** Como usuario avanzado, quiero informar el esfuerzo en RIR numérico, y como novato, con opciones simples, para registrar el esfuerzo de la forma que entiendo.

```gherkin
Escenario: AC1 — Por defecto según el nivel
  Dado que completé el onboarding como novato
  Cuando registro una serie
  Entonces el esfuerzo se pide con la escala simple (RN-ENT-03)

Escenario: AC2 — Cambio manual
  Dado que soy novato
  Cuando elijo el modo "RIR numérico" en ajustes
  Entonces a partir de ese momento el esfuerzo se pide como RIR de 0 a 5+
  Y cambiar después mi nivel no revierte esta elección
```

---

### RF-PERF-06 — Configurar los incrementos mínimos por equipamiento

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Should | Borrador | Usuario | RN-PERF-06 |

**Historia:** Como usuario cuyo gimnasio tiene mancuernas de 2 en 2 kg, quiero configurar los saltos de peso disponibles, para que las sugerencias sean pesos que realmente existen.

```gherkin
Escenario: AC1 — Valores por defecto
  Dado que no configuré incrementos
  Cuando el motor redondea una sugerencia
  Entonces usa los incrementos por defecto de RN-PERF-06

Escenario: AC2 — Personalizar
  Dado que cambio el incremento de mancuernas a 2,5 kg
  Cuando recibo una sugerencia para un ejercicio con mancuernas
  Entonces la carga sugerida es múltiplo de 2,5 kg

Escenario: AC3 — Por unidad
  Dado que configuré 2 kg para mancuernas y cambio la unidad a lb
  Cuando recibo una sugerencia con mancuernas
  Entonces se usa el incremento configurado en lb (por defecto 5 lb), no la conversión de 2 kg (RN-PERF-06)
```
