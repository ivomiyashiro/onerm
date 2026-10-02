# 09 — Trazabilidad

## 1. Los 4 RF de la preentrega (formato del TPO §4.6)

La especificación tiene más de 60 RF finos. Para la preentrega se agrupan en **4 RF macro**, con el formato de la cátedra: ID, usuario, descripción y criterio de aceptación.

### RF01 — Elegir o crear una rutina

- **Usuario involucrado:** novato (elige una plantilla recomendada) e intermedio o avanzado (crea la suya).
- **Descripción:** el usuario obtiene una rutina de entrenamiento de alguna de estas formas:
  - Adopta una plantilla recomendada según su nivel, objetivo y días disponibles, con su fundamento científico visible.
  - Crea la suya eligiendo ejercicios del catálogo, con series, rango de repeticiones, descanso y orden.
- **Criterio de aceptación:** al confirmar, la rutina queda guardada en el dispositivo y disponible como rutina activa **aun sin conexión**, y el inicio muestra su próximo día.
- **Agrupa:** RF-PERF-01..06, RF-RUT-01..09, RF-CAT-01..03.

### RF02 — Registrar un entrenamiento

- **Usuario involucrado:** cualquier persona que entrena, en el gimnasio y entre series.
- **Descripción:** el usuario inicia el día que le toca, o elige otro, y confirma cada serie con un toque o la ajusta. Registra el esfuerzo, por lado si el ejercicio es unilateral. Usa un temporizador de descanso que avisa con la pantalla bloqueada. Puede saltear o sustituir ejercicios, y finalizar o descartar el entrenamiento.
- **Criterio de aceptación:** cada serie confirmada queda guardada de inmediato y **persiste aunque no haya conexión o la app se cierre**. Al reabrir la app, el entrenamiento se retoma en el mismo punto.
- **Agrupa:** RF-ENT-01..16.

### RF03 — Recibir sugerencias de carga

- **Usuario involucrado:** principalmente el novato; también los usuarios intermedios y avanzados.
- **Descripción:** para cada ejercicio, la app sugiere carga y repeticiones con reglas deterministas basadas en evidencia:
  - calibración inicial;
  - doble progresión;
  - ajuste por esfuerzo;
  - descarga ante un estancamiento;
  - reentrada después de una pausa.

  Cada sugerencia explica su motivo.
- **Criterio de aceptación:** si en la última exposición el usuario completó el tope del rango en todas las series, la sugerencia siguiente sube la carga según la regla y vuelve al piso del rango (por ejemplo, 60 kg × 12 × 3 → 62,5 kg × 8). La sugerencia se calcula **sin conexión**.
- **Agrupa:** RF-SUG-01..10.

### RF04 — Ver el progreso

- **Usuario involucrado:** cualquier usuario.
- **Descripción:** el usuario consulta su historial, corrige entrenamientos pasados y ve por ejercicio la evolución del 1RM estimado, sus récords y su volumen semanal por músculo.
- **Criterio de aceptación:** el historial y el progreso **incluyen lo registrado sin conexión**, y una corrección de un entrenamiento pasado se refleja de inmediato en el progreso y en las sugerencias.
- **Agrupa:** RF-PROG-01..07.

### Soporte (no son RF del TPO, entran en Offline First, persistencia y arquitectura)

- **RF-AUTH-01..09:** cuenta opcional.
- **RF-SYNC-01..07:** respaldo y multidispositivo.
- **RF-CAT-04..06:** mantenimiento del catálogo.

## 2. Matriz de trazabilidad (Must y Should)

Verificación: **U** = test unitario (dominio) · **I** = test de integración (datos, sync, Supabase) · **M** = prueba manual o demo.

| RF | Prioridad | OBJ | Reglas / ADR | Pantalla | Verif. | RF TPO |
|---|---|---|---|---|---|---|
| RF-AUTH-01 | Must | 04 | ADR-0003 | S01, S21 | M | Soporte |
| RF-AUTH-02 | Must | 04 | RN-AUTH-01, 03 | S03 | I, M | Soporte |
| RF-AUTH-03 | Must | 04 | RN-AUTH-02 | S02 | I, M | Soporte |
| RF-AUTH-04 | Should | 04 | RN-AUTH-03, ADR-0001 R10, ADR-0012 | S02, S03 | M | Soporte |
| RF-AUTH-05 | Must | 04 | RN-AUTH-04 | S02, S03 | I | Soporte |
| RF-AUTH-06 | Must | 04 | RN-SYNC-01, RN-AUTH-07 | S21, S02 | I, M | Soporte |
| RF-AUTH-07 | Must | 04 | RN-SYNC-08 | S21 | I, M | Soporte |
| RF-AUTH-08 | Should | 04 | RN-AUTH-01, 02 | S04 | M | Soporte |
| RF-SYNC-01 | Must | 04 | RN-SYNC-01, 06, 07, 09 | S21 | I | Soporte |
| RF-SYNC-02 | Should | 04 | RN-SYNC-07, 10 | S07, S18 | I | Soporte |
| RF-SYNC-03 | Must | 04 | RN-SYNC-07 | S07 | I, M | Soporte |
| RF-SYNC-04 | Must | 04 | RN-SYNC-04, 10 | S19 | I | Soporte |
| RF-SYNC-05 | Must | 04 | RN-SYNC-03, 04, 05 | — | I | Soporte |
| RF-SYNC-06 | Must | 04 | RN-SYNC-08, 09, 11, 13, 14 | S21, S25, D12 | M, I | Soporte |
| RF-SYNC-07 | Should | 04 | RN-SYNC-06 | S21 | M | Soporte |
| RF-PERF-01 | Must | 01 | RN-PERF-02, 04 | S05 | M | RF01 |
| RF-PERF-02 | Must | 01 | RN-PERF-01, 03 | S06 | U, M | RF01 |
| RF-PERF-03 | Must | 01 | RN-PERF-03 | S21 | U, M | RF01 |
| RF-PERF-04 | Must | 01 | RN-PERF-05 | S21 | U | RF01 |
| RF-PERF-05 | Must | 01 | RN-PERF-04, RN-ENT-03 | S21 | U | RF01 |
| RF-PERF-06 | Should | 01 | RN-PERF-06 | S21 | U | RF01 |
| RF-CAT-01 | Must | 01 | RN-CAT-02, 03 | S16 | U, M | RF01 |
| RF-CAT-02 | Must | 01 | RN-CAT-03 | S17 | M | RF01 |
| RF-CAT-03 | Must | 01 | RN-CAT-04, ADR-0004 | S16 | M | RF01 |
| RF-CAT-04 | Should | 01 | RN-CAT-01, 04 | — | I | Soporte |
| RF-CAT-05 | Must | — | ADR-0004 | S22 | M | Soporte |
| RF-RUT-01 | Must | 01, 03 | 11-plantillas | S13, S14 | M | RF01 |
| RF-RUT-02 | Must | 01 | RN-RUT-01, 03, RN-PERF-03 | S14 | U, M | RF01 |
| RF-RUT-03 | Must | 01 | RN-RUT-04, 05 | S15 | U, M | RF01 |
| RF-RUT-04 | Must | 01 | RN-RUT-04..07 | S15 | U | RF01 |
| RF-RUT-05 | Must | 01 | RN-RUT-06, I-10 | S15 | U, M | RF01 |
| RF-RUT-06 | Should | 01 | — | S15, S09 | M | RF01 |
| RF-RUT-07 | Must | 01 | RN-RUT-02, I-01 | S13 | U | RF01 |
| RF-RUT-08 | Must | 01 | RN-RUT-07 | S13 | U | RF01 |
| RF-ENT-01 | Must | 01, 02 | RN-RUT-01, RN-ENT-01, 08 | S07, S08 | U, M | RF02 |
| RF-ENT-02 | Must | 02 | RN-ENT-02..04 | S09 | U, M | RF02 |
| RF-ENT-03 | Must | 02 | RN-ENT-05, 06, ADR-0008 | S09 | U, M | RF02 |
| RF-ENT-04 | Must | 02 | RN-ENT-02 | S09 | U | RF02 |
| RF-ENT-05 | Should | 02 | RN-ENT-02 | S09 | M | RF02 |
| RF-ENT-06 | Must | 02 | RN-ENT-07 | S09 | U, M | RF02 |
| RF-ENT-07 | Must | 02 | — | S09 | M | RF02 |
| RF-ENT-08 | Must | 02 | RN-ENT-09 | S09 | U | RF02 |
| RF-ENT-09 | Should | 02 | RN-ENT-10 | S11 | U, M | RF02 |
| RF-ENT-11 | Must | 02 | RN-ENT-09, RN-RUT-01 | S12 | U, M | RF02 |
| RF-ENT-12 | Must | 02 | RN-SYNC-04 | S09 | U | RF02 |
| RF-ENT-13 | Must | 02 | RN-ENT-07, 11 | S09, D02 | M | RF02 |
| RF-ENT-14 | Should | 02 | RN-ENT-12 | S09 | U, M | RF02 |
| RF-SUG-01 | Must | 01 | RN-SUG-01, 02, 09, 15 | S07, S09 | U (caso K) | RF03 |
| RF-SUG-02 | Must | 01 | RN-SUG-02, 06..08 | S09 | U (casos E, L, R) | RF03 |
| RF-SUG-03 | Must | 01 | RN-SUG-01, 02, 09, RN-PERF-08 | S09 | U (casos A, F, G, I, N, Q) | RF03 |
| RF-SUG-04 | Must | 01, 03 | RN-SUG-03 | S09 | U (casos B, C, J) | RF03 |
| RF-SUG-05 | Must | 01 | RN-SUG-04 | S09 | U (casos A, P) | RF03 |
| RF-SUG-06 | Must | 01 | RN-SUG-05, 17 | S09 | U (casos D, O) | RF03 |
| RF-SUG-07 | Must | 03 | RN-SUG-11 | S10 | U, M | RF03 |
| RF-SUG-08 | Must | 01 | RN-SUG-10 | S09 | U | RF03 |
| RF-SUG-09 | Must | 01 | RN-SUG-12 | S09 | U (caso M) | RF03 |
| RF-SUG-10 | Must | 01 | RN-SUG-14, 08 | S09, D06 | U (caso H) | RF03 |
| RF-PROG-01 | Must | 04, 05 | RN-SYNC-10 | S18 | M | RF04 |
| RF-PROG-02 | Must | 05 | — | S19 | M | RF04 |
| RF-PROG-03 | Must | 04, 05 | RN-SYNC-04, 10 | S19 | U, I | RF04 |
| RF-PROG-04 | Must | 05 | RN-SUG-07, RN-PROG-01, 02 | S20 | U, M | RF04 |
| RF-PROG-05 | Must | 05 | RN-PROG-03 | S20, S12 | U | RF04 |
| RF-PROG-06 | Should | 05 | RN-PROG-04 | S18 | U | RF04 |

## 3. Entregables de la preentrega (§5) → dónde está cada uno

| # | Entregable | Fuente en la especificación |
|---|---|---|
| 1 | Nombre provisorio | **OneRM** · bundle id `com.training.onerm` (docs/convenciones.md §7) |
| 2 | Descripción del problema | 00 §2 |
| 3 | Usuarios principales | 00 §3, 02 |
| 4 | Contexto de uso | 00 §3 |
| 5 | Propuesta de solución | 00 §5, propuesta.md |
| 6 | Por qué móvil | 00 §2 |
| 7 | Propuesta de valor | propuesta.md |
| 8 | Alcance y fuera de alcance | 00 §5–6 |
| 9 | 3–4 RF | 09 §1 |
| 10 | RNF | 05 |
| 11 | Diseño en Figma | [OneRM — Prototipo](https://www.figma.com/design/73VZUZ69JtHsIzM4vgIlHZ): fundamentos, componentes, las 25 pantallas en sus estados, los diálogos y el prototipo navegable (página `09 Prototipo`, 5 flujos). Checklist de 08 §7 completo; decisiones en diseno/marca.md |
| 12 | Flujo de pantallas | 08 §3–4 |
| 13 | Diagramas de arquitectura | 12 §2 (flujo de datos) y §3 (topología) |
| 14 | Offline First | 07 §5 |
| 15 | Tecnologías y justificación | ADR-0001, 0004, 0007, 0010, 0011, 0012 |
| 16 | Repositorio | **Pendiente**: crear el repo, la estrategia de ramas y la convención de commits |
| 17 | Integrantes y roles | **Pendiente** (ver la advertencia sobre el equipo en propuesta.md) |
