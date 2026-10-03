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

- `main` siempre compila y pasa la CI. No se hace push directo (la protección se configura en #8).
- Cada card se trabaja en una rama corta que sale de `main`:

  ```
  <tipo>/<número-de-issue>-<descripción-corta>
  feat/42-motor-doble-progresion
  spike/11-sqlite-drizzle
  fix/57-temporizador-pantalla-bloqueada
  ```

- La rama vive pocos días. Si crece, se parte la card.

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
- La descripción usa la plantilla y enlaza la card con `Closes #N`.
- **Squash and merge.** Se borra la rama después del merge.
- PR chicos (idealmente menos de 400 líneas sin contar las generadas).

## 5. Tablero: Kanban liviano

Sin sprints, sin story points y sin fechas intermedias. El único entregable es el MVP.

- **Columnas:** `Backlog` → `En curso` → `Hecho`.
- **El Backlog está ordenado:** se toma la card de más arriba cuyas dependencias (`Depende de:`) estén cerradas. El orden sigue las fases del [plan](plan-de-implementacion.md). `tools/board.sh next F3` lista las de una fase.
- **Máximo 2 cards en curso.** Primero se termina y después se empieza otra.
- **Una card es un slice que se puede demostrar.** Agrupa varios RF y lleva adentro una checklist de alcance y sus dependencias.
- **Las tareas finas viven en el plan de la card** (un comentario del issue), no en issues aparte ni en la checklist.
- **Una card, una rama, un PR.** El PR cierra la card con `Closes #N`. Si la card supera unas 400 líneas, se entrega en 2 o 3 PRs secuenciales: los intermedios con `Refs #N` y el último con `Closes #N`.
- **Los spikes no mergean código:** el código exploratorio queda en su rama y al `main` llega solo la nota de `docs/spikes/<N>-<nombre>.md` (N = número de issue) y el ADR si cambia.
- **Mover cards:** `tools/board.sh move <N> backlog|curso|hecho`. En *Workflows* del Project conviene activar «Item closed» y «Pull request merged» → Hecho, e «Item added to project» → Backlog.
- **Título de la card:** `F<n> <Fase> - <Qué se logra>`, por ejemplo `F3 Dominio - Motor: estructura, entradas y calibración`. El título del **PR** sigue Conventional Commits, porque es el mensaje del squash.
- **Plan por card, no por fase ni por tarea.** Al empezar una card se publica su plan de implementación como comentario del issue (tareas en orden de TDD). La fase ya tiene su plan en [plan-de-implementacion.md](plan-de-implementacion.md); una tarea suelta es demasiado chica para tener plan propio.
- La card enlaza los RF y AC de la especificación, **no los copia**: la especificación es la única fuente.

### Trabajo con agentes

El flujo de una card está en la skill del proyecto [`/card`](../.claude/skills/card/SKILL.md) y las reglas para el agente en [`CLAUDE.md`](../CLAUDE.md). Uso: `/card 22` implementa esa card; `/card F3` toma la próxima card abierta de la fase. El agente lee la card y la especificación, publica el plan en el issue, trabaja con TDD en una rama y abre el PR. Si el agente completó todas las verificaciones (incluida la prueba en el emulador) y la CI está en verde, mergea él mismo con squash; si queda algo que solo puede verificar una persona, frena y avisa. Al cerrar cada fase, dos jueces revisan todo lo hecho y las correcciones entran en un PR aparte.

### Plantillas de issue

`Card`, `Spike` y `Bug` (en `.github/ISSUE_TEMPLATE/`). Cada issue tiene una milestone (fase), un tipo, una épica y una prioridad.

### Etiquetas

| Grupo | Etiquetas |
|---|---|
| Tipo | `tipo: feat`, `tipo: fix`, `tipo: chore`, `tipo: spike`, `tipo: docs`, `tipo: test` |
| Épica | `épica: auth`, `épica: sync`, `épica: perf`, `épica: cat`, `épica: rut`, `épica: ent`, `épica: sug`, `épica: prog`, `épica: plataforma` |
| Prioridad (MoSCoW) | `prioridad: must`, `prioridad: should`, `prioridad: could` |
| Estado especial | `bloqueado` |

## 6. Definición de Hecho

Una card pasa a `Hecho` cuando:

- [ ] Cumple lo que dice su checklist y su "Listo cuando".
- [ ] Tiene tests: unitarios en el dominio y de integración en datos o sync, según la matriz de 09 §2.
- [ ] La CI pasa: typecheck, lint (incluidas las reglas de capas) y tests.
- [ ] Los textos de la UI salen de `presentation/strings` (RNF-21).
- [ ] Si cambió una decisión o un comportamiento, se actualizaron la especificación o el ADR.
- [ ] Si el cambio es visible para el usuario, está en `CHANGELOG.md`.
- [ ] El PR se mergeó con squash.

## 7. Decisiones de entorno

| Tema | Decisión |
|---|---|
| Gestor de paquetes | **bun** (soportado por Expo). Solo se commitea `bun.lock` |
| Node | 22 LTS |
| Estructura | La app en la raíz del repo, sin monorepo: `app/`, `src/`, `supabase/`, `tools/`, `docs/` (12 §5) |
| Nombre y bundle id | App **OneRM** · bundle id `com.training.onerm`, igual en Android (`applicationId`) e iOS (`bundleIdentifier`). Decidido el 2026-10-02 (#1) |
| Ramas de larga vida | Solo `main`, sin `dev`: no hay ambientes ni releases que separar. Los hitos (preentrega, entrega final) se marcan con tags SemVer sobre `main` (`v0.1.0`, `v1.0.0`) |
| Idioma | Código e identificadores en inglés (glosario 01). Documentación, commits e issues en español |
