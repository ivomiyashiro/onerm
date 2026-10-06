---
name: pre-push
description: Review before every push in OneRM. Runs typecheck, lint and tests, then the read-only Sonnet reviewers (code-reviewer always, security-reviewer for sensitive paths) on the commits not reviewed yet, and pushes only without blockers. Use whenever Claude is about to push, when the user says "pusheá", "subí los cambios" or asks for a review before a push. A hook blocks any `git push` by Claude whose HEAD didn't pass here.
---

# Pre-push review

`.claude/hooks/require-pre-push.mjs` blocks every `git push` that Claude runs if `HEAD` wasn't approved by this skill. Pushes made by hand in a terminal aren't affected.

**Token budget:** at most one `code-reviewer` per push, plus `security-reviewer` only when it applies, and only on commits nobody has reviewed yet.

## 0. Prepare

1. `git status --porcelain`. Uncommitted changes aren't pushed: inside `/card`, commit them if they belong to the current TDD step; otherwise ask the user.
2. `git fetch origin` (if the network fails, continue with what is local and say so).
3. **The range to review:**
   - `approved` = the content of `$(git rev-parse --git-dir)/claude-pre-push-approved`, if it exists.
   - If `approved` is an ancestor of `HEAD` and not on `origin/main` (`git merge-base --is-ancestor $approved HEAD` and not `git merge-base --is-ancestor $approved origin/main`), the range is **incremental**: `$approved..HEAD`.
   - Otherwise the range is the whole branch: `origin/main...HEAD`.
   - `git log --oneline <range>`. If it is empty, `HEAD` is already approved: push (§5) without reviewing again.
4. `git diff --stat <range>` to see which areas changed.

## 1. Automatic checks

`bun run typecheck`, `bun run lint`, `bun run format:check` and `bun run test`, plus `bun run test:int` and `bun run test:supabase` when they exist and the diff touches `src/data/` or `supabase/`. If any fails, fix it before reviewing: the reviewers don't run on red code.

## 2. Reviewers

Launch the ones that apply **in parallel, in one message**, with the `Agent` tool:

| Agent | When |
|---|---|
| `code-reviewer` | When the range touches code: `src/`, `app/`, `tools/`, `supabase/` or the root config (`package.json`, `app.config.ts`, `eslint.config.js`…). Standards, architecture and React, and correctness in one pass. |
| `security-reviewer` | When the range touches `src/data/`, `src/di/`, adds or renames a route in `app/` (a new deep link), `app.config.ts`, `supabase/`, `.github/`, `.claude/`, `package.json`, `bun.lock` or any `.env*` file, or adds a URL, key or token anywhere. |

If neither applies (a range of `docs/`, `CHANGELOG.md` or other Markdown only), the checks of §1 are enough.

The prompt of each one: the range, the card number if there is one, and "Follow your instructions and return the report."

Agent types load when a session starts. If they aren't available yet (the session predates `.claude/agents/`), launch `general-purpose` with `model: sonnet` and ask it to read `.claude/agents/<name>.md` and follow its body.

## 3. Triage (one round)

1. **Reproduce each blocker** before acting on it (run the command or read the cited line). Discard the ones that don't hold up, and say why in the report.
2. Fix the confirmed blockers on the same branch, with a test first when they are bugs, and commit.
3. **No second round of `code-reviewer`:** the fix is verified by its test and the checks of §1. `security-reviewer` re-checks, on the range of the fix commits, a security blocker and any fix or applied suggestion that touches its paths.
4. **A specification gap** or a decision that is the user's (a new dependency, a security trade-off) is never fixed unilaterally: stop and ask.
5. Suggestions are optional: apply the cheap ones that clearly improve the code, without another review, and list the rest in the PR body under "Not done".

## 4. Report

In Spanish, to the user:

```
# Pre-push: <N> commits → origin/<branch> (rango completo / incremental desde <sha>)

| Revisión | Resultado |
|---|---|
| Typecheck, lint, tests | ✅ / ❌ |
| Código (estándares, arquitectura, correctitud) | N bloqueantes, M sugerencias / no aplica |
| Seguridad | N bloqueantes, M sugerencias / no aplica |

Bloqueantes corregidos: …
Descartados (no se reprodujeron): …
Veredicto: LISTO PARA PUSHEAR / CORREGIR ANTES
```

## 5. Approve and push

With no open blockers:

1. Record the approval of the current HEAD (the fixes and applied suggestions of §3 are covered by their tests and the checks):
   `git rev-parse HEAD > "$(git rev-parse --git-dir)/claude-pre-push-approved"`
2. `git push` (with `-u origin <branch>` if the branch has no upstream).

- **Inside `/card`** the push goes ahead without asking, like the auto-merge (`/card` §5).
- **Invoked by the user** outside `/card`, show the report and push only after an explicit yes.
- Never write the approval file without completing steps 1 to 4. Any later commit changes `HEAD` and goes through this skill again, reviewing only the new commits.
