# RF-CAT — Catálogo de ejercicios

**Objetivo:** OBJ-01.
**ADR:** [ADR-0004](../adr/0004-catalogo-canonico-y-seed-multifuente.md), [ADR-0005](../adr/0005-tipos-de-carga.md), [ADR-0008](../adr/0008-registro-unilateral.md).
**Reglas:** RN-CAT-*.

El catálogo lo mantiene el equipo con el seed (ADR-0004) y es de **solo lectura** para el usuario. Viene **incluido en la app**, así que está disponible sin conexión desde la instalación.

## Resumen

| ID | Título | Prioridad |
|---|---|---|
| RF-CAT-01 | Buscar y filtrar ejercicios | Must |
| RF-CAT-02 | Ver el detalle de un ejercicio | Must |
| RF-CAT-03 | Tener el catálogo disponible sin conexión desde la instalación | Must |
| RF-CAT-04 | Recibir actualizaciones del catálogo | Should |
| RF-CAT-05 | Ver los créditos de las fuentes | Must |
| RF-CAT-06 | Crear ejercicios propios | Could |

---

### RF-CAT-01 — Buscar y filtrar ejercicios

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-CAT-02, RN-CAT-03 |

**Historia:** Como usuario que arma o modifica una rutina, quiero encontrar un ejercicio por nombre, músculo o equipamiento, para agregarlo en pocos segundos.

```gherkin
Escenario: AC1 — Búsqueda por texto
  Dado que estoy en el buscador de ejercicios
  Cuando escribo "press banca"
  Entonces veo los ejercicios cuyo nombre o alias contienen esas palabras
  Y los resultados se actualizan mientras escribo, en menos de 200 ms

Escenario: AC2 — Búsqueda sin tildes ni mayúsculas
  Dado que estoy en el buscador
  Cuando escribo "PRESION" o "extension triceps"
  Entonces la búsqueda ignora tildes y mayúsculas (RN-CAT-02)

Escenario: AC3 — Filtros
  Dado que estoy en el buscador
  Cuando filtro por músculo "espalda" y equipamiento "polea"
  Entonces solo veo ejercicios que cumplen ambos filtros
  Y puedo combinar los filtros con la búsqueda por texto

Escenario: AC4 — Sin resultados
  Dado que mi búsqueda no coincide con ningún ejercicio
  Cuando veo los resultados
  Entonces veo "No encontramos ejercicios" y la acción "Limpiar filtros"

Escenario: AC5 — Obsoletos ocultos
  Dado que un ejercicio está marcado como obsoleto (RN-CAT-01)
  Cuando busco
  Entonces no aparece en los resultados

Escenario: AC6 — Sin conexión
  Dado que no tengo conexión
  Cuando busco o filtro
  Entonces funciona igual que con conexión
```

---

### RF-CAT-02 — Ver el detalle de un ejercicio

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | RN-CAT-03 |

**Historia:** Como novato, quiero ver qué músculos trabaja un ejercicio y cómo se hace, para saber si lo estoy haciendo bien.

```gherkin
Escenario: AC1 — Contenido
  Dado que abro un ejercicio
  Entonces veo el nombre, los músculos principales y secundarios, el equipamiento
  Y si es unilateral, y la descripción cuando la fuente la provee
  Y la atribución de la fuente

Escenario: AC2 — Mi historial del ejercicio
  Dado que ya registré series de este ejercicio
  Cuando abro su detalle
  Entonces veo un acceso a mi progreso en ese ejercicio (RF-PROG)

Escenario: AC3 — Sin descripción
  Dado que la fuente no provee una descripción
  Cuando abro el detalle
  Entonces la sección de descripción no se muestra, en lugar de mostrarse vacía
```

---

### RF-CAT-03 — Tener el catálogo disponible sin conexión desde la instalación

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Sistema | RN-CAT-04 |

```gherkin
Escenario: AC1 — Primer uso sin red
  Dado que instalé la app y nunca tuve conexión
  Cuando abro el buscador de ejercicios
  Entonces veo el catálogo completo incluido en la app
```

---

### RF-CAT-04 — Recibir actualizaciones del catálogo

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Should | Borrador | Sistema | RN-CAT-01, RN-CAT-04 |

```gherkin
Escenario: AC1 — Actualización incremental
  Dado que el equipo publicó ejercicios nuevos
  Cuando la app sincroniza con conexión, sea invitado o usuario registrado
  Entonces descarga solo los ejercicios nuevos o modificados

Escenario: AC2 — Ejercicio obsoleto en mi rutina
  Dado que un ejercicio de mi rutina fue marcado como obsoleto
  Cuando veo mi rutina o mi historial
  Entonces el ejercicio sigue apareciendo con su historial
  Y se indica "Ya no está en el catálogo", con la opción de reemplazarlo
```

---

### RF-CAT-05 — Ver los créditos de las fuentes

| Prioridad | Estado | Actor | Reglas |
|---|---|---|---|
| Must | Borrador | Usuario | — |

**Historia:** Como equipo, necesitamos atribuir los datos de terceros para cumplir sus licencias (ADR-0004 R1).

```gherkin
Escenario: AC1 — Créditos
  Dado que estoy en "Acerca de"
  Cuando abro "Créditos"
  Entonces veo cada fuente del catálogo con su licencia y un enlace
```

---

### RF-CAT-06 — Crear ejercicios propios

**Could.** Si se implementa: ejercicios **del usuario**, sincronizables, con el mismo modelo canónico y separados del catálogo (ADR-0004, "Cuándo revisar").
