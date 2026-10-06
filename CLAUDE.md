# OneRM

Mobile app (React Native + Expo) that tells strength trainees what weight, sets and reps to do, and logs the workout at the gym, with or without signal. Project for the TPO of Desarrollo de Aplicaciones I (UADE). One person with AI assistance: **every line of code must be explainable at the defense**.

## Language

- **English:** code, identifiers, comments, JSDoc, test names, scripts, config, `README.md`, `CHANGELOG.md`, branch names, commits, PRs, this file and the skills.
- **Spanish:** cards (GitHub issues, their plans and comments), the specification and the rest of `docs/`, and the UI texts (the app is in Spanish; they live in `src/presentation/strings`, from `13-textos.md`).
- Identifiers use the glossary names (`docs/especificacion/01-glosario.md`).

## Sources of truth

| What | Where |
|---|---|
| What the app does (RF, RN, RNF) | `docs/especificacion/` — start with `README.md` |
| Technical decisions | `docs/especificacion/adr/` |
| Phases and exit criteria | `docs/plan-de-implementacion.md` |
| Branches, commits, PRs, board, Definition of Done | `docs/convenciones.md` |
| UI texts | `docs/especificacion/13-textos.md` |
| Design | Figma (link in `docs/especificacion/09-trazabilidad.md` §3) and `docs/diseno/marca.md` |
| Tasks and their status | GitHub Issues + Project «OneRM MVP» (`gh issue view N`) |

If the code contradicts the specification, **don't invent**: flag the gap and fix the specification first (or write a new ADR).

## Working a card

Use the `/card <number>` skill (or `/card F3` to take the next open card of a phase). Summary: read the card and the specification → post the plan on the issue → branch → TDD task by task → verify → PR with `Closes #N`. The board is updated with `tools/board.sh`.

**Auto-merge:** if the agent completed every verification (including the emulator test) and CI is green, the agent squash-merges the PR and moves on to the next card without stopping. When a phase ends, two judges review everything done and the fixes go in a separate PR. Details in the `/card` skill §5–§6.

## Project skills

In `.claude/skills/` (pinned in `skills-lock.json`; updated with `npx skills update -p`):

| Skill | Source | Purpose |
|---|---|---|
| `card` | own | End-to-end flow of a card |
| `pre-push` | own | Checks and the code and security reviewers before every push |
| `expo-router` | expo/skills | Expo Router routes, Stack, tabs and modals (F2, F5) |
| `expo-upgrade` | expo/skills | Upgrading the Expo SDK and fixing dependencies |
| `react-native-testing` | callstackincubator/agent-skills | Tests with Testing Library v14 (async render and userEvent) |

**Pre-push review:** every push by Claude goes through `/pre-push`. It runs the checks and read-only reviewers on Sonnet, defined in `.claude/agents/`: `code-reviewer` on every code change (standards, architecture and React, and correctness against the card and the specification) and `security-reviewer` only when sensitive paths change (secrets, RNF-07/08/09, RLS, dependencies, CI). After the first push, only the new commits are reviewed. The `.claude/hooks/require-pre-push.mjs` hook blocks a push whose `HEAD` wasn't approved; pushes made by hand aren't affected.

Discarded: the EAS ones (cloud builds and stores, paid and out of scope), `expo-dev-client` (assumes EAS; here we build locally with `expo run:android`), `expo-native-ui`/`expo-ui`/`expo-design-system` (the design comes from Figma and our own tokens), `react-navigation` (we use Expo Router) and `react-native-best-practices` (6 MB of images; the required performance is in the engine, which is pure TypeScript; may be added in F9).

- If an external skill conflicts with the specification, the Figma design or this file, **these win**. For example, `expo-router` pushes iOS patterns (Link previews, NativeTabs): use them only if the design asks for them.
- **Don't send feedback** to Expo (`submit-expo-feedback`) or any other service unless the user asks.

## Architecture (ADR-0011, 12-arquitectura)

```
app/                 Expo Router: screen composition only
src/domain/          Pure TypeScript: models, rules (engine), use cases, repository interfaces
src/data/            Drizzle/SQLite, supabase-js, repositories, mappers, sync
src/presentation/    components, ViewModels (useXViewModel), theme, strings
src/di/              composition root: creates the implementations and provides them via Context
```

- Dependencies point **towards the domain**. `domain` doesn't import React, Expo, Supabase or Drizzle. `presentation` doesn't import `data`. The lint enforces it (RNF-11): the rule is never disabled.
- The **ViewModel** is a hook that exposes `{ state, actions }`. The state is a discriminated union (`loading | content | empty | error | …`). It calls use cases, never repositories or SDKs.
- **SQLite is the source of truth** for the UI. Every write goes to the local database first (RN-SYNC-01). The UI observes the database; it never waits for the network.
- The **suggestion engine** is a pure function in `src/domain/rules/` (ADR-0009). No implicit dates: "now" is passed in as a parameter.
- UI texts come from `src/presentation/strings` (RNF-21). Never hard-coded in the component.

## TDD

1. **Red:** first write the failing test, derived from the AC or the reference case in the specification. Name the test with the ID (`RF-SUG-03.AC1`, `caso A`).
2. **Green:** the minimum code to make it pass.
3. **Refactor** with the tests green.

- Domain: unit tests with no network or database (RNF-12). The reference cases in `sugerencias.md` are literal tests (RNF-15).
- Data: integration tests (`*.int.test.ts`, next to the repository in `src/data/`) against a real SQLite database, never a mocked one (spike #11):
  - each test will open a fresh in-memory `better-sqlite3` database with `openTestDatabase()`, which applies the same `drizzle/` migrations and `foreign_keys = ON` as the app (WAL doesn't apply to an in-memory database: it is checked on the emulator);
  - repositories take `AppDatabase` (`BaseSQLiteDatabase<'sync', unknown>`), so the same code runs on `expo-sqlite` and `better-sqlite3`;
  - the change notifications behind `observe…()` don't exist in Jest: test the query and the re-run on a manual change event, and check the live wiring on the emulator;
  - Jest's SQLite (3.53) is newer than the device's (3.50): don't rely on newer SQL features;
  - `bun run test` will run the unit tests and `bun run test:int` the integration tests, both in CI. The script, its CI step and `openTestDatabase()` land in #27; until then neither exists.
- Server rules (RLS, LWW triggers) against local Supabase (spike #12), both run by `bun run test:supabase` and the `supabase` CI job (they land in #40):
  - **pgTAP** in `supabase/tests/*.sql` for the trigger and RLS rules, one transaction with `rollback` per file;
  - **Jest + supabase-js** in `*.supabase.test.ts` (with `jest.supabase.config.js`, plain Node: `jest-expo` replaces `fetch`) for what the client sees through PostgREST, with two real users;
  - start the stack first with `bunx supabase start` (Docker; project `onerm-mvp`, ports 553xx).
- ViewModels: always tested, with fake repositories injected, covering every state of the union.
- Screens: one Testing Library test per state (`loading`, `content`, `empty`, `error`…) checking what is shown and that actions call the ViewModel. Fine visual details are checked against Figma, not with tests.
- Tests live next to the file: `foo.ts` → `foo.test.ts`.
- **No tests in `app/`:** Expo Router treats every file in `app/` as a route. The screen lives in `src/presentation/features/<feature>/<x>-screen.tsx` (with its test next to it) and the `app/` file only re-exports it.
- No production code without a test that calls for it, except config and purely visual components.

## Commands

```bash
bun install
bun run typecheck
bun run lint           # ESLint, fails on any warning
bun run format         # Prettier (format:check in CI)
bun run test           # Jest (jest-expo); test:watch, test:coverage
bun run android        # development build on the emulator (expo run:android)
bun run start          # Metro only, with the app already installed
```

Don't start Metro with `CI=1`: it disables file watching and Fast Refresh.

## Rules

- Commits in Conventional Commits, in English (`feat(sug): …`). One commit per finished TDD step, not one giant commit at the end.
- Files in kebab-case (`log-set.ts`, `workout-screen.tsx`); symbols in PascalCase (types, components, use cases) or camelCase (functions, variables).
- "Session" never stands alone: in code it is `AuthSession` or `Workout`; in Spanish texts, "sesión de autenticación" or "entrenamiento" (glossary).
- Don't add dependencies without justifying them in the PR (what problem they solve, the simpler alternative). The stack's are in the plan §4.
- The Supabase `service_role` key never goes into the app (RNF-08).
- Don't edit `android/` or `ios/`: they are generated by prebuild.
