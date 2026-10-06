---
name: card
description: Plans and implements a OneRM board card with TDD, end to end up to the PR. Use when the user says "/card 22", "hacé la card 22", "seguí con la próxima card de F3" or asks to implement a phase or an issue from the Project.
---

# Implement a card

Argument: an issue number (`22`) or a phase (`F3`).

- **With a phase:** `tools/board.sh next F3` lists the Backlog cards in board order, without the Could ones. Take the first one whose dependencies are closed.
- **A whole phase** ("hacé F3 completa"): repeat the full cycle card by card, **without stopping** between cards (see «Auto-merge» in §5). Each card starts from an up-to-date `main`. When the phase ends, run the phase review (§6).

**Language** (`CLAUDE.md`): code, comments, tests, branches, commits and PRs in English. The issue, its plan and its comments in Spanish, like the specification.

## 1. Understand

1. `gh issue view <N>` to read the card, and `gh issue view <N> --comments` to see whether it already has a published plan.
2. **Dependencies:** every number on the `Depende de:` line must be closed (`gh issue view <X> --json state`). If any is still open, stop and tell the user. Also don't start a phase while Must cards from earlier phases are open, unless the user asks.
3. **Limit of 2 cards in progress:** `tools/board.sh wip`. If there are already 2, warn before starting another.
4. Read **in full the specification sections the card links to**: RFs with their Gherkin, RN, RNF, ADRs, reference cases and the `13-textos.md` texts of the screens involved.
5. **UI cards:** look at each screen's design in Figma. First load the `figma:figma-design-to-code` skill and use the Figma MCP tools on file `73VZUZ69JtHsIzM4vgIlHZ`. Frames are named by screen and state (for example `S09 · Primera serie`).
6. Read `CLAUDE.md`, the code to be touched and, from F2 onwards, the related notes in `docs/spikes/`.

Cards #1–#16 use another format ("Criterios de aceptación", "Cómo se verifica"). The rest use "Alcance" and "Listo cuando".

**Non-code cards:**
- A **human decision** (for example #1): propose 2–3 options with pros and cons, and stop.
- A **manual setup** (for example #8): give the steps or the `gh api` commands, and stop. They have no PR.

## 2. Plan

Post the plan as a comment on the issue, in Spanish, titled `## Plan de implementación` (`gh issue comment <N> --body-file <file>`). The plan is the only place for the fine-grained tasks: they are not copied into the card's checklist.

- **Approach** in 3–5 lines: what gets built and in which layers.
- **Tasks in TDD order**, each one small (under half a day) and with its test first:
  `- [ ] <task> — test: <what it checks, with the AC or case ID>`
- **Files** created or modified.
- **PRs:** a single one, unless the card exceeds about 400 lines. In that case, 2 or 3 sequential PRs, each keeping `main` green. The intermediate ones use `Refs #N` and the last one `Closes #N`.
- **Out of scope** for this card.
- **Open questions or specification gaps.**

If there are questions that change what the specification defines, **stop and ask** before coding. Otherwise, continue. If the user asked to review the plan before starting, stop here.

Move the card: `tools/board.sh move <N> progress`.

## 3. Implement

1. Branch from an up-to-date `main`: `<type>/<N>-<short-description>`, in English (see `docs/convenciones.md` §2).
2. For each task in the plan:
   - **Red:** write the test and watch it fail for the right reason.
   - **Green:** the minimum code to make it pass.
   - **Refactor** with everything green.
   - Commit in Conventional Commits, in English, with `Refs #N`.
3. Follow the layer, text and test rules in `CLAUDE.md`. Don't disable lint rules or skip tests to move faster.

**Spikes (F1):** the goal is to answer the question, not to write production code.
- The exploratory code lives on the `spike/<N>-…` branch and **is not merged**.
- The PR only carries the note `docs/spikes/<N>-<name>.md` (N = issue number, using the template in `docs/spikes/README.md`, in Spanish), the index row, and the updated ADR and specification if the decision changes them.
- Whatever is worth keeping is rewritten with TDD in the corresponding card.

## 4. Verify

- `bun run typecheck`, `bun run lint` and `bun run test` green, plus any integration scripts that exist.
- Go through each item of the scope and of "Listo cuando". Whatever needs a manual test (emulator, airplane mode, physical device), **the agent does it** if it can (emulator via `adb`, screenshots with `adb exec-out screencap`). Only what it can't do (physical device, accounts, decisions) is listed for the user with the exact steps. **Don't assume it is done.**
- If a decision or a behavior changed, update the specification or the ADR on the same branch.
- If the change is user-visible, add it to `CHANGELOG.md`.

## 5. Close

1. Tick the scope items met in the issue body (`gh issue edit <N> --body-file …`).
2. Push through the `/pre-push` skill (checks plus the code and security reviewers; a hook blocks any push that skips it). Then open the PR with the template: title in Conventional Commits, `Closes #N`, how it was tested and what manual testing remains.
3. Tell the user what was done, which tests were added, what remains to be tested by hand and whether a specification gap was found.
4. When the PR is merged: `tools/board.sh move <N> done`, unless the Project workflow already moved it.

### Auto-merge (project rule, 2026-10-02)

If **all** of the card's verifications are complete and were done by the agent (typecheck, lint, tests, the `/pre-push` review without open blockers, green CI when it exists, and the manual emulator test), the agent **merges the PR itself** with squash and deletes the branch (`gh pr merge <N> --squash --delete-branch`), moves the card to Done and continues with the next one without waiting.

Don't auto-merge if:
- a verification remains that only a person can do (physical device, external account, decision);
- CI fails or hasn't finished;
- the card changes the specification in a non-trivial way or needs a new ADR.

In those cases, stop and tell the user.

## 6. Phase review

After closing the last card of a phase, launch the **`phase-judge`** agent (`.claude/agents/phase-judge.md`, on Opus, read-only), with the phase, its cards and the range `<first commit of the phase>^..main`. It checks the cards together against the specification, `CLAUDE.md` and `docs/convenciones.md`, and returns findings with evidence plus, for every specification gap or decision, options with a recommendation.

If the agent type isn't available yet (it loads when a session starts), launch `general-purpose` with `model: opus` and ask it to read `.claude/agents/phase-judge.md` and follow its body.

Then:
1. **Reproduce each finding** before fixing it, with a test first when it is a bug. Findings that don't reproduce are discarded.
2. Make the fixes in **a separate PR** (`fix/F<n>-judge-fixes`), through `/pre-push`, with `Refs` to the affected cards and a table of what isn't fixed and why. That PR follows the auto-merge rule.
3. Specification gaps and decisions aren't resolved unilaterally: show the user the judge's options and recommendation for each one, and stop until they decide.
