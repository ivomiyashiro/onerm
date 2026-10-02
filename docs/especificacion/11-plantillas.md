# 11 — Plantillas de rutina

> **Estado:** borrador para revisar.
> Cada decisión remite a un principio de [10-fundamentos-cientificos.md](10-fundamentos-cientificos.md) (`P-NN`). Lo que no tiene respaldo de evidencia se marca como **criterio de práctica**.

## 1. Criterios de diseño

| ID | Criterio | Fundamento |
|---|---|---|
| C-01 | Cada grupo muscular principal se estimula **≥ 2 veces por semana**. | P-01, P-02 |
| C-02 | **≈ 8–12 series fraccionales por semana** por grupo muscular principal (directas = 1, indirectas = 0,5), con 10 como referencia del ACSM. Por debajo de 10 se marca; por debajo de 8 se declara como concesión. | P-03 |
| C-03 | Los ejercicios tienen un **rol**: *principal* (multiarticular, va primero y descansa más) o *accesorio*. El rango de repeticiones, el esfuerzo y el descanso dependen del **objetivo** y del rol (§2). | P-04, P-07, P-08 |
| C-04 | **Nunca se prescribe ir al fallo.** Novatos: RIR objetivo 3 (2 en objetivo "músculo"). | P-05, P-06 |
| C-05 | Para novatos se prioriza **máquina, polea y mancuerna**. La barra queda para las plantillas intermedias. | P-09 |
| C-06 | **Sesiones de ≤ 60 min** estimados: 40 s por serie más el descanso, **sin** contar la entrada en calor ni los cambios de máquina (sumarían ~5–10 min). | P-01 (adherencia, criterio de práctica) |
| C-07 | Solo ejercicios con **carga externa**: el motor funciona completo. | ADR-0005 (criterio de práctica) |
| C-08 | Se cubren los **patrones de movimiento** básicos: empuje horizontal y vertical, tracción horizontal y vertical, dominante de rodilla y bisagra de cadera. | Criterio de práctica: equilibrio entre agonistas y antagonistas |
| C-09 | Se incluye al menos **un ejercicio unilateral** por plantilla, cuando aporta (por ejemplo, el remo a una mano, que permite apoyar el torso). | Criterio de práctica |
| C-10 | Con objetivo **fuerza**, como máximo **3 series por ejercicio** y sesión. Al parametrizar, los ejercicios con 4 series se reducen a 3. | P-03 (ACSM 2026: 2–3 series por ejercicio para fuerza) |

## 2. Parametrización por objetivo

Una plantilla define **estructura** (días, ejercicios, orden, series y rol). La **prescripción** (rango de repeticiones, RIR y descanso) se completa según el **objetivo** del perfil (RF-PERF-01) al adoptarla. El usuario puede editarla después, porque la rutina adoptada es una copia suya.

| Objetivo | Rol | Repeticiones | RIR objetivo (novato) | RIR objetivo (int./avanz.) | Descanso |
|---|---|---|---|---|---|
| **Salud general** | Principal | 8–12 | 3 | 2 | 2 min |
| | Accesorio | 10–15 | 3 | 2 | 90 s |
| **Músculo** (hipertrofia) | Principal | 6–10 | 2 | 1–2 (por defecto 2) | 2 min 30 s |
| | Accesorio | 10–15 | 2 | 1 | 90 s |
| **Fuerza** | Principal | 4–6 | 3 | 2 | 3 min |
| | Accesorio | 8–12 | 3 | 2 | 2 min |

**Justificación:**
- **Fuerza:** 4–6 repeticiones con RIR 2 equivale a 81–86 % del 1RM (Brzycki), en línea con el ≥ 80 % del ACSM 2026. En novatos, con RIR 3, da 78–83 %: una concesión deliberada por seguridad (P-04).
- **Músculo:** la hipertrofia no depende de la carga si el esfuerzo es suficiente (P-04). Se elige un rango de 6–15 que es eficiente en tiempo, y un poco más cerca del fallo porque ayuda modestamente a la hipertrofia (P-05).
- **Salud general:** 8–12, la recomendación del ACSM 2009 para novatos.
- **Descansos:** siempre > 60 s (P-07). Los principales descansan más, para sostener la carga.
- **Novato:** RIR 3 como margen mientras aprende la técnica (*criterio de práctica*, P-06). En "músculo" el RIR es 2, dentro del rango del ACSM 2026 (2–3).

## 3. Plantillas

### Resumen

| ID | Nombre | Días por semana | Nivel sugerido | Frecuencia por músculo |
|---|---|---|---|---|
| PLT-FB2 | Cuerpo completo — 2 días | 2 | Novato o cualquiera con poco tiempo | 2× |
| PLT-FB3 | Cuerpo completo A/B — 3 días | 3 | **Novato (recomendada)** | ~3× |
| PLT-TP4 | Torso / Pierna — 4 días | 4 | Intermedio | 2× |

**Rotación:** siempre por el próximo día (ADR-0006), no por día de la semana. En PLT-FB3 se alternan A y B: una semana A-B-A, la siguiente B-A-B.

---

### PLT-FB3 — Cuerpo completo A/B, 3 días (novato)

**Para quién:** novatos con 3 días. Es la plantilla recomendada por defecto.
**Por qué:**
- Frecuencia alta por músculo (~3×) con sesiones cortas (C-01, C-06).
- Muchas repeticiones de práctica de cada movimiento.
- Solo máquinas, poleas y mancuernas (C-05).

| # | Día A | Rol | Series | Músculos (D = directo, I = indirecto) |
|---|---|---|---|---|
| A1 | Prensa de piernas | Principal | 3 | D: cuádriceps · I: glúteos |
| A2 | Press de pecho en máquina | Principal | 3 | D: pecho · I: tríceps, hombros |
| A3 | Remo sentado en polea | Principal | 3 | D: espalda · I: bíceps |
| A4 | Peso muerto rumano con mancuernas | Principal | 3 | D: isquios, glúteos |
| A5 | Press de hombros con mancuernas (sentado) | Accesorio | 3 (2 en PLT-FB2) | D: hombros · I: tríceps |
| A6 | Curl de bíceps con mancuernas | Accesorio | 2 | D: bíceps |

| # | Día B | Rol | Series | Músculos |
|---|---|---|---|---|
| B1 | Sentadilla goblet con mancuerna | Principal | 3 | D: cuádriceps · I: glúteos |
| B2 | Jalón al pecho | Principal | 3 | D: espalda · I: bíceps |
| B3 | Press inclinado con mancuernas | Principal | 3 | D: pecho · I: tríceps, hombros |
| B4 | Curl femoral sentado | Accesorio | 3 | D: isquios |
| B5 | Remo con mancuerna a una mano (**unilateral**) | Accesorio | 2 | D: espalda · I: bíceps |
| B6 | Extensión de tríceps en polea | Accesorio | 2 | D: tríceps |

**Series por sesión:** A = 17, B = 16. **Duración estimada** (40 s por serie + descanso): salud ~43 min · músculo ~49 min · fuerza ~57 min.

**Volumen semanal:** promedio de 1,5 veces cada día por semana, método fraccional.

| Músculo | Directas | Indirectas × 0,5 | **Total por semana** | vs. C-02 |
|---|---|---|---|---|
| Pecho | 9 | — | **9** | ✅ |
| Espalda | 12 | — | **12** | ✅ |
| Hombros | 4,5 | 4,5 | **9** | ✅ (A5 pasó a 3 series) |
| Bíceps | 3 | 6 | **9** | ✅ |
| Tríceps | 3 | 6,75 | **9,75** | ✅ |
| Cuádriceps | 9 | — | **9** | ✅ |
| Isquios | 9 | — | **9** | ✅ |
| Glúteos | 4,5 | 4,5 | **9** | ✅ |

---

### PLT-FB2 — Cuerpo completo, 2 días

**Para quién:** quien solo puede entrenar 2 días. Es el mínimo de la OMS (P-01).
**Estructura:** los **mismos días A y B** que PLT-FB3, con **4 series en los principales** (A1–A4, B1–B3) para compensar la menor frecuencia. Los accesorios quedan como en la versión original, con **A5 en 2 series**, para no pasar de 60 min.

**Con objetivo fuerza** (C-10), los principales vuelven a **3 series**. El volumen semanal baja a unas 6–8 series por grupo, y se declara.

**Series por sesión:** A = 20, B = 19 (fuerza: A = 16, B = 16). **Duración estimada:** salud ~51 min · músculo ~59 min · fuerza ~55 min.

| Músculo | Total por semana | vs. C-02 |
|---|---|---|
| Pecho | 8 | ✅ |
| Espalda | 10 | ✅ |
| Hombros | 6 | ⚠️ bajo |
| Bíceps | 7 | ⚠️ |
| Tríceps | 7 | ⚠️ |
| Cuádriceps | 8 | ✅ |
| Isquios | 7 | ⚠️ |
| Glúteos | 8 | ✅ |

> **Se declara como una concesión:** por tiempo, la plantilla queda por debajo de 10 en varios grupos. Igual produce mejoras significativas, porque la mayor parte del beneficio está en pasar de no entrenar a entrenar (P-01). Además, el volumen tiene rendimientos decrecientes (P-03).

---

### PLT-TP4 — Torso / Pierna, 4 días (intermedio)

**Para quién:** intermedios con 4 días. Es la opción que se recomienda a un intermedio o avanzado con 4 o más días.
**Por qué:**
- 2× por músculo con más volumen por sesión (C-01, C-02).
- Incluye barra (hip thrust) y un unilateral exigente (sentadilla búlgara), que tienen una curva técnica mayor.

**Rotación:** Torso A → Pierna A → Torso B → Pierna B.

| # | Torso A | Rol | Series | Músculos |
|---|---|---|---|---|
| TA1 | Press de banca con mancuernas | Principal | 3 | D: pecho · I: tríceps, hombros |
| TA2 | Remo sentado en polea | Principal | 3 | D: espalda · I: bíceps |
| TA3 | Press de hombros con mancuernas (sentado) | Principal | 3 | D: hombros · I: tríceps |
| TA4 | Jalón al pecho | Principal | 3 | D: espalda · I: bíceps |
| TA5 | Curl de bíceps con mancuernas | Accesorio | 2 | D: bíceps |
| TA6 | Extensión de tríceps en polea | Accesorio | 2 | D: tríceps |

| # | Pierna A | Rol | Series | Músculos |
|---|---|---|---|---|
| PA1 | Prensa de piernas | Principal | 3 | D: cuádriceps · I: glúteos |
| PA2 | Peso muerto rumano con mancuernas | Principal | 3 | D: isquios, glúteos |
| PA3 | Sentadilla búlgara con mancuernas (**unilateral**) | Accesorio | 2 | D: cuádriceps, glúteos |
| PA4 | Curl femoral sentado | Accesorio | 3 | D: isquios |
| PA5 | Elevación de talones de pie | Accesorio | 3 | D: gemelos |

| # | Torso B | Rol | Series | Músculos |
|---|---|---|---|---|
| TB1 | Press inclinado con mancuernas | Principal | 3 | D: pecho · I: tríceps, hombros |
| TB2 | Remo con mancuerna a una mano (**unilateral**) | Principal | 3 | D: espalda · I: bíceps |
| TB3 | Press de pecho en máquina | Principal | 3 | D: pecho · I: tríceps, hombros |
| TB4 | Elevaciones laterales con mancuernas | Accesorio | 3 | D: hombros |
| TB5 | Curl martillo con mancuernas | Accesorio | 2 | D: bíceps |
| TB6 | Extensión de tríceps sobre la cabeza en polea | Accesorio | 2 | D: tríceps |

| # | Pierna B | Rol | Series | Músculos |
|---|---|---|---|---|
| PB1 | Sentadilla goblet con mancuerna | Principal | 3 | D: cuádriceps · I: glúteos |
| PB2 | Hip thrust con barra | Principal | 3 | D: glúteos · I: isquios |
| PB3 | Extensión de cuádriceps | Accesorio | 3 | D: cuádriceps |
| PB4 | Curl femoral tumbado | Accesorio | 2 | D: isquios |
| PB5 | Elevación de talones sentado | Accesorio | 3 | D: gemelos |

**Series por sesión:** Torso = 16, Pierna = 14. **Duración estimada:** salud ~41 min · músculo ~47 min · fuerza ~55 min (torso).

| Músculo | Directas | Indirectas × 0,5 | **Total por semana** | vs. C-02 |
|---|---|---|---|---|
| Pecho | 9 | — | **9** | ✅ |
| Espalda | 9 | — | **9** | ✅ |
| Hombros | 6 | 4,5 | **10,5** | ✅ |
| Bíceps | 4 | 4,5 | **8,5** | ✅ |
| Tríceps | 4 | 6 | **10** | ✅ |
| Cuádriceps | 11 | — | **11** | ✅ |
| Glúteos | 8 | 3 | **11** | ✅ |
| Isquios | 8 | 1,5 | **9,5** | ✅ |
| Gemelos | 6 | — | **6** | Grupo secundario, sin objetivo |

---

## 4. Recomendación de plantilla (onboarding)

Ver RN-PERF-01. Resumen:

| Nivel | 2 días | 3 días | 4 o más días |
|---|---|---|---|
| Novato | PLT-FB2 | **PLT-FB3** | **PLT-FB3**, con el mensaje "3 días alcanzan para progresar". Se ofrece PLT-TP4 como alternativa |
| Intermedio / avanzado | PLT-FB2 | PLT-FB3 | PLT-TP4 |

**Por qué no más días para el novato:** con el volumen igualado, más frecuencia no mejora la hipertrofia (P-02), y el novato progresa con volúmenes moderados (P-01, P-03). Recomendar menos días reduce el abandono, que es el riesgo principal. Esto último es un **criterio de práctica**, alineado con P-01.

## 5. Entrada en calor

**Criterio de práctica:** antes del primer ejercicio principal, 1–2 series livianas del mismo movimiento. La app lo muestra como texto de ayuda (13 §9), y esas series se pueden marcar como calentamiento para que no cuenten (RF-ENT-14, Should).

## 6. Validación pendiente

- [ ] Revisar la carga de ejercicios con el catálogo real, una vez que exista el seed (ADR-0004): nombres, equipamiento y disponibilidad en wger.
- [ ] *Opcional, recomendado para la defensa:* que un profesional (profesor de educación física o kinesiólogo) revise las plantillas. Queda registrado como validación externa.
- [x] Accesorios de hombros en PLT-FB3: pasan a 3 series (Q-10 resuelta).

## 7. Limitaciones declaradas

- **Fuerza sin barra:** con objetivo fuerza, las plantillas siguen usando máquinas y mancuernas (C-05). La fuerza medida en los básicos con barra mejora más entrenándolos (especificidad, P-09). Se avisa en S06 y S14 (13 §5), y el usuario puede armar su rutina con barra. Una plantilla de fuerza con barra queda para después del MVP.
- **Saltos grandes en ejercicios livianos:** con mancuernas de 2 en 2 kg, subir desde cargas chicas puede superar el 10 %. El motor lo compensa pidiendo repeticiones extra antes de subir (RN-SUG-02, `EXTEND_REPS`).
