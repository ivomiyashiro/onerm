# ADR-0004 — Catálogo con modelo canónico y seed multifuente

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** RF-CAT (pendiente), RN-CAT, RNF-08, RNF-11, ADR-0005

## Contexto

La app necesita un catálogo de ejercicios. wger es una buena fuente inicial, pero:

- **No queremos casarnos con una sola API.** Tiene que poder sumarse o reemplazarse la fuente sin tocar la app.
- El modelo de wger (taxonomías, idiomas, estructura) **no es el nuestro**. El dominio no debe adaptarse a la API, sino al revés.
- El catálogo tiene que estar **disponible sin conexión desde el primer uso**, así que la app no puede depender de una API externa en tiempo de ejecución.

## Decisión

### 1. Modelo canónico propio

Un `CanonicalExercise` definido por nosotros. Los campos exactos se fijan en `06-modelo-de-dominio.md`. Propuesta inicial:

| Campo | Tipo | Nota |
|---|---|---|
| `id` | UUID | **Nuestro**, estable y nunca derivado de la fuente |
| `slug` | string | Único y legible (`sentadilla-barra`) |
| `name` | string (es) | Obligatorio en español |
| `aliases` | string[] | Para la búsqueda ("squat", "sentadilla trasera") |
| `loadType` | enum | `external` o `bodyweight` (ADR-0005) |
| `primaryMuscles` / `secondaryMuscles` | enum[] | **Vocabulario controlado propio** |
| `primaryEquipment` | enum | Equipamiento principal; define el incremento (RN-PERF-06, RN-CAT-03) |
| `equipment` | enum[] | Vocabulario controlado propio, para los filtros (barra, mancuerna, máquina, polea, peso corporal, kettlebell) |
| `mechanic` | enum | `compound` o `isolation` (útil para los incrementos y el motor) |
| `isUnilateral` | bool | |
| `sources` | `{ source, externalId, license, attribution }[]` | Procedencia y atribución |
| `deprecatedAt` | timestamp? | Nunca se elimina (ver 5) |

### 2. Adaptadores por fuente (capa anticorrupción)

Cada fuente implementa un puerto común. El núcleo del seed no sabe nada de wger:

```ts
interface ExerciseSourceAdapter {
  readonly sourceId: string;                      // 'wger', 'manual', ...
  extract(): AsyncIterable<unknown>;              // lee la fuente (API, archivo…)
  map(raw: unknown): MapResult;                   // → candidato canónico o rechazo con motivo
}
type MapResult =
  | { ok: true; candidate: CanonicalExerciseCandidate }
  | { ok: false; externalId: string; reason: string };
```

Sumar una fuente = escribir un adaptador nuevo. El pipeline, el modelo y la app no cambian.

Una fuente **`manual`** (archivo versionado en el repo) permite cargar ejercicios propios sin ninguna API.

### 3. Pipeline del seed

```
extract → map → normalize → validate → curate → dedupe → load → export
```

| Etapa | Qué hace |
|---|---|
| extract | El adaptador lee la fuente |
| map | El adaptador traduce al modelo canónico. **Los valores de taxonomía sin mapeo se rechazan con un motivo; nunca se descartan en silencio.** |
| normalize | Nombres, mayúsculas, espacios, slug |
| validate | Esquema estricto (por ejemplo, con zod). Lo inválido va a un reporte |
| curate | Aplica la **curaduría versionada**: lista de ejercicios incluidos (evita el ruido de wger) y overrides (nombre en español, músculos, incremento) |
| dedupe | Busca coincidencias por `(source, externalId)` y después por slug o nombre normalizado. **Los posibles duplicados entre fuentes se reportan para revisión manual**, no se fusionan solos |
| load | **Upsert idempotente** en Supabase (`exercises`, `exercise_source_refs` con clave única `(source, external_id)`). Correrlo dos veces con la misma entrada no cambia nada |
| export | Genera el **snapshot** que se incluye en la app, para tener el catálogo sin conexión desde la instalación |

### 4. Dónde corre

- Es una **herramienta de desarrollo** (CLI en el repo, por ejemplo `tools/catalog-seed/`), ejecutada por el mantenedor con la `service_role` en su entorno local (RNF-08).
- **Nunca en la app ni en tiempo de ejecución.** La app recibe el catálogo por el snapshot incluido, más actualizaciones incrementales desde la tabla `exercises` de Supabase, que tiene lectura pública con RLS.

### 5. Estabilidad

- Los ejercicios **nunca se eliminan**: se marcan con `deprecatedAt`. Las rutinas y el historial que los referencian siguen siendo válidos.
- El `id` es nuestro. Si una fuente cambia su ID o desaparece, nuestro catálogo no se rompe.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| **Modelo canónico + adaptadores + seed** (elegida) | Independiente de la fuente, offline, curado y explicable | Hay que construir el pipeline |
| Consumir wger desde la app | Sin seed | Dependencia en tiempo de ejecución, no funciona sin conexión en el primer uso, modelo ajeno filtrado al dominio, ruido |
| Catálogo 100 % manual | Control total | No escala; se pierde el trabajo de wger (queda disponible igual como fuente `manual`) |

## Consecuencias

- ✅ Aplica a los datos el mismo principio de Clean Architecture que al resto de la app: el dominio define el modelo y las fuentes se adaptan.
- ✅ Es un buen ejemplo para la defensa: el patrón puerto y adaptador y la capa anticorrupción se ven con claridad.
- ⚠️ Mantener los vocabularios controlados y la curaduría es trabajo manual.

## Riesgos y mitigaciones

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | **Licencia:** wger publica sus datos bajo licencias Creative Commons que **exigen atribución** (y en algunos casos compartir igual). | Guardar la licencia y la atribución por ejercicio (`sources`). Pantalla de "Créditos" en la app. Verificar la licencia de cada fuente antes de sumarla. |
| R2 | Traducciones al español incompletas o de mala calidad en wger. | El nombre en español es obligatorio; si falta, se toma de un override o el ejercicio se rechaza. |
| R3 | Ruido: variantes raras, duplicados, ejercicios sin datos. | Lista de incluidos: solo entra lo seleccionado. |
| R4 | Cambios en la API de la fuente rompen el adaptador. | El adaptador está aislado; el fallo aparece en el reporte del seed, no en la app. El snapshot anterior sigue funcionando. |
| R5 | Ejercicios que el motor del MVP no soporta (lastre, asistidos, por tiempo). | El mapeo los rechaza por su `loadType` (ADR-0005). |

## Cuándo revisar esta decisión

- Si los usuarios necesitan crear ejercicios propios (Q-06). Serían ejercicios **del usuario**, sincronizables y separados del catálogo, con el mismo modelo canónico.
