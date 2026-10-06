---
name: pre-push
description: Review before every push in OneRM. Runs typecheck, lint and tests, then three read-only Sonnet reviewers (standards, security, correctness) on the commits to push, and pushes only without blockers. Use whenever Claude is about to push, when the user says "pusheá", "subí los cambios" or asks for a review before a push. A hook blocks any `git push` by Claude whose HEAD didn't pass here.
---

# Pre-push review

`.claude/hooks/require-pre-push.mjs` blocks every `git push` that Claude runs if `HEAD` wasn't approved by this skill. Pushes made by hand in a terminal aren't affected.

## 0. Prepare

1. `git status --porcelain`. Uncommitted changes aren't pushed: inside `/card`, commit them if they belong to the current TDD step; otherwise ask the user.
2. The range to push:
   - `git fetch origin` (if the network fails, continue with what is local and say so);
   - base = `@{u}` if the branch has an upstream, else `origin/main`;
   - `git log --oneline <base>..HEAD`. If it is empty, there is nothing to push: say so and stop.
3. `git diff --stat <base>...HEAD` to see which areas changed.

## 1. Automatic checks

`bun run typecheck`, `bun run lint`, `bun run format:check` and `bun run test`, plus `bun run test:int` and `bun run test:supabase` when they exist and the diff touches `src/data/` or `supabase/`. If any fails, fix it before reviewing: the reviewers don't run on red code.

## 2. Reviewers

Launch them **in parallel, in one message**, with the `Agent` tool and these `subagent_type`s (all run on Sonnet and are read-only):

| Agent | When |
|---|---|
| `standards-reviewer` | Always. |
| `correctness-reviewer` | When the diff touches `src/`, `app/`, `supabase/` or `tools/`. |
| `security-reviewer` | When the diff touches `src/data/`, `src/di/`, `app/`, `app.config.ts`, `supabase/`, `.github/`, `.claude/`, `package.json`, `bun.lock`, any `.env*` file, or adds a URL, key or token anywhere. Otherwise write "not applicable". |

The prompt of each one: the range (`<base>...HEAD`), the card number if there is one, and "Follow your instructions and return the report."

Agent types load when a session starts. If they aren't available yet (the session predates `.claude/agents/`), launch `general-purpose` with `model: sonnet` and ask it to read `.claude/agents/<name>.md` and follow its body.

## 3. Triage

1. **Reproduce each blocker** before acting on it (run the command or read the cited line). Discard the ones that don't hold up, and say why in the report.
2. Fix the confirmed blockers on the same branch, with their test first when they are bugs. Commit in Conventional Commits.
3. Then run this skill again from step 0. After two rounds with blockers still open, stop and tell the user.
4. **A specification gap** or a decision that is the user's (a new dependency, a security trade-off) is never fixed unilaterally: stop and ask.
5. Suggestions are optional: apply the cheap ones that clearly improve the code, and list the rest in the PR body under "Not done".

## 4. Report

In Spanish, to the user:

```
# Pre-push: <N> commits → origin/<branch>

| Revisión | Resultado |
|---|---|
| Typecheck, lint, tests | ✅ / ❌ |
| Estándares | N bloqueantes, M sugerencias |
| Correctitud | N bloqueantes, M sugerencias / no aplica |
| Seguridad | N bloqueantes, M sugerencias / no aplica |

Bloqueantes corregidos: …
Descartados (no se reprodujeron): …
Veredicto: LISTO PARA PUSHEAR / CORREGIR ANTES
```

## 5. Approve and push

With no open blockers:

1. Record the approval of the reviewed HEAD:
   `git rev-parse HEAD > "$(git rev-parse --git-dir)/claude-pre-push-approved"`
2. `git push` (with `-u origin <branch>` if the branch has no upstream).

- **Inside `/card`** the push goes ahead without asking, like the auto-merge (`/card` §5).
- **Invoked by the user** outside `/card`, show the report and push only after an explicit yes.
- Never write the approval file without completing steps 1 to 4. Any new commit changes `HEAD` and needs a new review.
