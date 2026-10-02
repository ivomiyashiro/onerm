---
name: card
description: Planifica e implementa una card del tablero de OneRM con TDD, de punta a punta hasta el PR. Usar cuando el usuario dice "/card 22", "hacé la card 22", "seguí con la próxima card de F3" o pide implementar una fase o un issue del Project.
---

# Implementar una card

Argumento: un número de issue (`22`) o una fase (`F3`). Con una fase, tomar la card abierta de número más bajo de esa milestone que no esté bloqueada.

Una card = una rama = un PR. Para una fase entera, repetir el ciclo completo card por card, en orden, sin mezclar cards en un mismo PR.

## 1. Entender

1. `gh issue view <N> --comments`. Leer objetivo, alcance, "Listo cuando", referencias y dependencias.
2. Si una dependencia (`Depende de: #X`) sigue abierta, frenar y avisar.
3. Leer **las secciones de la especificación que la card enlaza**, completas: RF con sus Gherkin, RN, RNF, ADR, casos de referencia y textos de `13-textos.md` de las pantallas involucradas. Si es una card de UI, mirar el diseño de esas pantallas en Figma.
4. Leer `CLAUDE.md` y el código existente que se va a tocar. Si es una card posterior a F1, leer las notas de `docs/spikes/` relacionadas.

## 2. Planificar

Escribir el plan y publicarlo como comentario del issue (`gh issue comment <N> --body-file …`) con el título `## Plan de implementación`:

- **Enfoque** en 3–5 líneas: qué se construye y en qué capas.
- **Tareas en orden de TDD**, cada una chica (menos de medio día) y con su test primero:
  `- [ ] <tarea> — test: <qué verifica, con el ID del AC o caso>`
- **Archivos** que se crean o modifican.
- **Fuera de alcance** de esta card.
- **Preguntas abiertas o huecos de la especificación.**

Si hay preguntas que cambian el comportamiento definido en la especificación, **frenar y preguntar** antes de codificar. Si no, seguir. Si el usuario pidió revisar el plan antes de empezar, frenar acá.

Pasar la card a `En curso` en el Project.

## 3. Implementar

1. Rama desde `main` actualizado: `<tipo>/<N>-<descripción-corta>` (ver `docs/convenciones.md` §2).
2. Por cada tarea del plan:
   - **Rojo:** escribir el test y verlo fallar por la razón correcta.
   - **Verde:** el código mínimo para pasarlo.
   - **Refactor** con todo en verde.
   - Commit en Conventional Commits que referencie la card (`Refs #N`).
3. Respetar las reglas de capas y de textos de `CLAUDE.md`. No desactivar reglas de lint ni saltear tests para avanzar.

**Spikes (F1):** el objetivo es responder la pregunta, no código de producción. TDD solo donde ayude. El entregable es la nota en `docs/spikes/NN-nombre.md` con la plantilla de `docs/spikes/README.md`, y el ADR actualizado si la decisión cambia.

## 4. Verificar

- `bun run typecheck`, `bun run lint` y `bun run test` en verde.
- Repasar cada ítem de "Listo cuando" y del alcance. Lo que requiera prueba manual (emulador, modo avión, dispositivo físico), listarlo para el usuario con los pasos exactos: no darlo por hecho.
- Si cambió una decisión o un comportamiento, actualizar la especificación o el ADR en la misma rama.
- Si el cambio es visible para el usuario, agregarlo a `CHANGELOG.md`.

## 5. Cerrar

1. Marcar en el cuerpo del issue los ítems del alcance cumplidos.
2. Push y PR con la plantilla: título en Conventional Commits, `Closes #N`, cómo se probó y lo que queda de prueba manual.
3. Informar al usuario: qué se hizo, qué tests se agregaron, qué falta probar a mano y cualquier hueco detectado en la especificación. No mergear sin que el usuario lo pida.
