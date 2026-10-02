# Convenciones de trabajo

**Estado:** Vigente · **Fecha:** 2026-10-02
Responde al entregable 16 de la preentrega (repositorio, estrategia de ramas y criterio de commits) y al §7.4 de la Etapa 2.

## 1. Dónde vive cada cosa

| Qué | Dónde | Regla |
|---|---|---|
| Qué hace la app y por qué (RF, RN, RNF) | [`docs/especificacion/`](especificacion/README.md) | Es la fuente de verdad. Si el código revela un hueco, primero se corrige la especificación |
| Decisiones de arquitectura | [`docs/especificacion/adr/`](especificacion/adr/README.md) | Una decisión nueva o un cambio de decisión es un ADR nuevo, nunca una edición silenciosa |
| Plan por fases y criterios de salida | [`docs/plan-de-implementacion.md`](plan-de-implementacion.md) | No registra el estado de las tareas |
| Resultado de un spike | [`docs/spikes/`](spikes/README.md) | Una nota por spike, con la plantilla |
| Tareas, bugs y su estado | GitHub Issues + [Project «OneRM MVP»](https://github.com/users/ivomiyashiro/projects/2) | **Única** fuente del estado del trabajo |
| Fases | GitHub Milestones (F0…F9) | Una milestone por fase del plan |
| Cambios por versión | [`CHANGELOG.md`](../CHANGELOG.md) | Formato Keep a Changelog |
| Cómo ejecutar el proyecto | `README.md` | Se completa a medida que avanza (§7.4) |

## 2. Ramas: GitHub Flow

- `main` siempre compila y pasa la CI. Está protegida: no se hace push directo.
- Cada issue se trabaja en una rama corta que sale de `main`:

  ```
  <tipo>/<número-de-issue>-<descripción-corta>
  feat/42-motor-doble-progresion
  spike/12-sqlite-drizzle
  fix/57-temporizador-pantalla-bloqueada
  ```

- La rama vive pocos días. Si crece, se parte el issue.

## 3. Commits: Conventional Commits

```
<tipo>(<ámbito>): <descripción en imperativo y en minúscula>

[cuerpo opcional: el porqué, no el qué]

[pie: Refs #12 · Closes #12 · BREAKING CHANGE: …]
```

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva para el usuario |
| `fix` | Corrección de un bug |
| `test` | Tests nuevos o corregidos, sin cambiar código de producción |
| `refactor` | Cambio interno sin cambio de comportamiento |
| `docs` | Solo documentación |
| `chore` | Configuración, dependencias, herramientas |
| `ci` | Pipelines de CI |
| `spike` | Código exploratorio de F1 |

**Ámbitos:** los códigos de épica de la especificación en minúscula (`auth`, `sync`, `perf`, `cat`, `rut`, `ent`, `sug`, `prog`), más `app`, `db`, `ui`, `infra` y `docs`.

Ejemplo: `feat(sug): aplicar doble progresión al completar el tope del rango`.

## 4. Pull requests

- Todo cambio entra por PR, aunque el equipo sea una persona: deja registro y corre la CI.
- El título sigue Conventional Commits, porque se usa como mensaje del squash.
- La descripción usa la plantilla y enlaza el issue con `Closes #N`.
- **Squash and merge.** Se borra la rama después del merge.
- PR chicos (idealmente menos de 400 líneas sin contar las generadas).

## 5. Issues

- **Plantillas:** `Tarea`, `Spike` y `Bug` (en `.github/ISSUE_TEMPLATE/`).
- Cada issue tiene una milestone (fase), un tipo, una épica y una prioridad.
- Cada tarea cita los RF, RN o AC que cubre (por ejemplo `RF-SUG-03.AC2`, `RN-SUG-02`).

### Etiquetas

| Grupo | Etiquetas |
|---|---|
| Tipo | `tipo: feat`, `tipo: fix`, `tipo: chore`, `tipo: spike`, `tipo: docs`, `tipo: test` |
| Épica | `épica: auth`, `épica: sync`, `épica: perf`, `épica: cat`, `épica: rut`, `épica: ent`, `épica: sug`, `épica: prog`, `épica: plataforma` |
| Prioridad (MoSCoW) | `prioridad: must`, `prioridad: should`, `prioridad: could` |
| Estado especial | `bloqueado` |

### Columnas del Project

`Backlog` → `Por hacer` → `En curso` → `En revisión` → `Hecho`.

## 6. Definiciones

**Definición de Listo (DoR) de un issue:**
- [ ] Tiene un objetivo claro y criterios de aceptación verificables.
- [ ] Cita los RF, RN o ADR de la especificación que aplican.
- [ ] Tiene milestone, tipo, épica y prioridad.
- [ ] No depende de otro issue abierto, o la dependencia está indicada.

**Definición de Hecho (DoD):**
- [ ] Cumple los criterios de aceptación del issue.
- [ ] Tiene tests: unitarios en el dominio y de integración en datos o sync, según la matriz de 09 §2.
- [ ] La CI pasa: typecheck, lint (incluidas las reglas de capas) y tests.
- [ ] Los textos de la UI salen de `presentation/strings` (RNF-21).
- [ ] Si cambió una decisión o un comportamiento, se actualizaron la especificación o el ADR.
- [ ] El PR fue revisado y mergeado con squash.

## 7. Decisiones de entorno

| Tema | Decisión |
|---|---|
| Gestor de paquetes | **bun** (soportado por Expo). Solo se commitea `bun.lock` |
| Node | 22 LTS |
| Estructura | La app en la raíz del repo, sin monorepo: `app/`, `src/`, `supabase/`, `tools/`, `docs/` (12 §5) |
| Nombre y bundle id | **TODO:** se define antes del primer development build (issue en F0). Por ahora, `onerm` |
| Idioma | Código e identificadores en inglés (glosario 01). Documentación, commits e issues en español |
