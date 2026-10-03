---
name: card
description: Planifica e implementa una card del tablero de OneRM con TDD, de punta a punta hasta el PR. Usar cuando el usuario dice "/card 22", "hacé la card 22", "seguí con la próxima card de F3" o pide implementar una fase o un issue del Project.
---

# Implementar una card

Argumento: un número de issue (`22`) o una fase (`F3`).

- **Con una fase:** `tools/board.sh next F3` lista las cards del Backlog en el orden del tablero, sin las Could. Tomar la primera cuyas dependencias estén cerradas.
- **Una fase entera** ("hacé F3 completa"): repetir el ciclo completo card por card, **sin frenar** entre cards (ver «Merge automático» en §5). Cada card sale de `main` actualizado. Al terminar la fase, correr la revisión de fase (§6).

## 1. Entender

1. `gh issue view <N>` para leer la card, y `gh issue view <N> --comments` para ver si ya tiene un plan publicado.
2. **Dependencias:** cada número de la línea `Depende de:` tiene que estar cerrado (`gh issue view <X> --json state`). Si alguna sigue abierta, frenar y avisar. Tampoco empezar una fase si quedan abiertas cards Must de fases anteriores, salvo que el usuario lo pida.
3. **Límite de 2 cards en curso:** `tools/board.sh wip`. Si ya hay 2, avisar antes de empezar otra.
4. Leer **completas las secciones de la especificación que la card enlaza**: RF con sus Gherkin, RN, RNF, ADR, casos de referencia y los textos de `13-textos.md` de las pantallas involucradas.
5. **Cards de UI:** mirar el diseño de cada pantalla en Figma. Cargar antes la skill `figma:figma-design-to-code` y usar las herramientas del MCP de Figma sobre el archivo `73VZUZ69JtHsIzM4vgIlHZ`. Los frames se llaman por pantalla y estado (por ejemplo `S09 · Primera serie`).
6. Leer `CLAUDE.md`, el código que se va a tocar y, desde F2 en adelante, las notas de `docs/spikes/` relacionadas.

Las cards #1–#16 usan otro formato ("Criterios de aceptación", "Cómo se verifica"). Para el resto vale "Alcance" y "Listo cuando".

**Cards que no son de código:**
- Una **decisión humana** (por ejemplo #1): proponer 2–3 opciones con pros y contras y frenar.
- Una **configuración manual** (por ejemplo #8): dar los pasos o los comandos `gh api` y frenar. No llevan PR.

## 2. Planificar

Publicar el plan como comentario del issue con el título `## Plan de implementación` (`gh issue comment <N> --body-file <archivo>`). El plan es el único lugar de las tareas finas: no se copian a la checklist de la card.

- **Enfoque** en 3–5 líneas: qué se construye y en qué capas.
- **Tareas en orden de TDD**, cada una chica (menos de medio día) y con su test primero:
  `- [ ] <tarea> — test: <qué verifica, con el ID del AC o del caso>`
- **Archivos** que se crean o modifican.
- **PRs:** uno solo, salvo que la card supere unas 400 líneas. En ese caso, 2 o 3 PRs secuenciales, cada uno con `main` en verde. Los intermedios usan `Refs #N` y el último usa `Closes #N`.
- **Fuera de alcance** de esta card.
- **Preguntas abiertas o huecos de la especificación.**

Si hay preguntas que cambian lo que define la especificación, **frenar y preguntar** antes de codificar. Si no, seguir. Si el usuario pidió revisar el plan antes de empezar, frenar acá.

Mover la card: `tools/board.sh move <N> curso`.

## 3. Implementar

1. Rama desde `main` actualizado: `<tipo>/<N>-<descripción-corta>` (ver `docs/convenciones.md` §2).
2. Por cada tarea del plan:
   - **Rojo:** escribir el test y verlo fallar por la razón correcta.
   - **Verde:** el código mínimo para pasarlo.
   - **Refactor** con todo en verde.
   - Commit en Conventional Commits con `Refs #N`.
3. Respetar las reglas de capas, textos y tests de `CLAUDE.md`. No desactivar reglas de lint ni saltear tests para avanzar.

**Spikes (F1):** el objetivo es responder la pregunta, no escribir código de producción.
- El código exploratorio vive en la rama `spike/<N>-…` y **no se mergea**.
- El PR lleva solo la nota `docs/spikes/<N>-<nombre>.md` (N = número de issue, con la plantilla de `docs/spikes/README.md`), la fila del índice y el ADR actualizado si la decisión cambia.
- Lo que valga la pena conservar se reescribe con TDD en la card que corresponda.

## 4. Verificar

- `bun run typecheck`, `bun run lint` y `bun run test` en verde, y los scripts de integración que existan.
- Repasar cada ítem del alcance y de "Listo cuando". Lo que requiera prueba manual (emulador, modo avión, dispositivo físico), **hacerla el agente** si puede (emulador con `adb`, capturas con `adb exec-out screencap`). Solo lo que no pueda hacer (dispositivo físico, cuentas, decisiones), listarlo para el usuario con los pasos exactos. **No darlo por hecho.**
- Si cambió una decisión o un comportamiento, actualizar la especificación o el ADR en la misma rama.
- Si el cambio es visible para el usuario, agregarlo a `CHANGELOG.md`.

## 5. Cerrar

1. Marcar en el cuerpo del issue los ítems del alcance cumplidos (`gh issue edit <N> --body-file …`).
2. Push y PR con la plantilla: título en Conventional Commits, `Closes #N`, cómo se probó y qué queda de prueba manual.
3. Informar al usuario qué se hizo, qué tests se agregaron, qué falta probar a mano y si se detectó algún hueco en la especificación.
4. Cuando el PR se mergea: `tools/board.sh move <N> hecho`, salvo que el workflow del Project ya lo haya movido.

### Merge automático (regla del proyecto, 2026-10-02)

Si **todas** las verificaciones de la card están completas y las hizo el agente (typecheck, lint, tests, CI en verde cuando exista, y la prueba manual en el emulador), el agente **mergea el PR él mismo** con squash y borra la rama (`gh pr merge <N> --squash --delete-branch`), mueve la card a Hecho y sigue con la siguiente sin esperar.

No se mergea automáticamente si:
- queda alguna verificación que solo puede hacer una persona (dispositivo físico, cuenta externa, decisión);
- la CI falla o no terminó;
- la card cambia la especificación de forma no trivial o requiere un ADR nuevo.

En esos casos se frena y se avisa.

## 6. Revisión de fase

Al cerrar la última card de una fase, correr **dos jueces independientes** (`harness:judge-a` y `harness:judge-b`) sobre todo el diff de la fase contra la especificación, `CLAUDE.md` y `docs/convenciones.md`. Sintetizar sus hallazgos, descartar los que no se confirman y, si hay correcciones, hacerlas en **un PR aparte** (`fix/F<n>-correcciones-jueces` o `chore/…`) con `Refs` a las cards afectadas. Ese PR sigue la regla de merge automático.
