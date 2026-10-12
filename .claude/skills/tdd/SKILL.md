---
name: tdd
description: How OneRM writes tests with TDD, and which tests are worth having. Use whenever you write, review or delete a test, start a red-green-refactor step, fix a bug, decide at which layer a behaviour is tested, a test goes red after a refactor, or the user asks whether a test is worth it, wants fewer or better tests, or asks to prune or audit the suite. Complements react-native-testing (the RNTL API and query priority); this skill decides what to test, that one how.
---

# TDD in OneRM

Every test is code that has to be maintained, run in CI and **explained at the defense**. A smaller suite where every test protects something beats a big one nobody trusts. `CLAUDE.md` § TDD has the short rules; this skill has the detail.

## 1. The value rule

Keep or write a test only if **both** are true:

1. **It protects something nameable:** an AC (`RF-CAT-01.AC3`), a rule (`RN-SUG-04`), a reference case (`caso A`), an RNF invariant (RNF-16/17/18) or a bug that happened. If you can't name it, don't write it.
2. **It survives a harmless refactor:** renaming a private helper, splitting a component or restyling without breaking a stated invariant leaves it green.

Before committing a test: did I see it fail for the right reason, and is this behaviour already proven at a lower layer (§3)?

## 2. Red, green, refactor

1. **Test list.** From the card's ACs, rules and reference cases, list the behaviours before coding. Take the smallest one first.
2. **Red.** Write one test, named with its ID, and **watch it fail for the right reason** (an assertion, not an import error).
3. **Green.** The minimum code that passes. Add a second example to force the general solution when one example could be faked (triangulate).
4. **Refactor** code *and tests*: remove duplication, and delete a test that a better one now fully covers.

- The expected value comes from the specification or a hand calculation, never copied from what the code printed.
- **A bug starts with a red test** that reproduces it, at the lowest layer that shows it; then the fix.

## 3. Each layer proves what it adds

The combinatorics live at the bottom. Upper layers may name the same AC, but only for what *they* add: the ViewModel for the state transition, the screen for the gesture and what the user sees.

| Layer | Its tests own | Not repeated there |
|---|---|---|
| `domain/rules` | All the cases: every AC, edge case and reference case (RNF-15). Most of the suite. | — |
| `domain/usecases` | What the use case adds: combining sources, error and unsubscribe handling. | The rule's cases. |
| `data` (`*.int.test.ts`) | Query and mapping on real SQLite: filters, order, nulls, constraints, re-run on change. | Domain rules. |
| Server (`supabase/tests`, `*.supabase.test.ts`) | RLS and triggers with two real users. | Client logic. |
| Wiring and seed (`*.int.test.tsx`, the catalog snapshot) | The composition root reaches SQLite; seed data meets the vocabularies. | Screen states. |
| ViewModels | Every state of the union and one test per action's transition. | The combinations of each AC. |
| Screens | One test per state, and one gesture per AC that reaches the ViewModel or the navigation. | Combinations already proven below. |
| Components | Behaviour: role, name and state, callbacks, conditional parts, and **style that is a requirement** (touch target ≥ 48/56 dp RNF-16, hidden from the screen reader RNF-18, a color that encodes a state the spec defines). | Colors, radii, fonts and sizes that only restate Figma. |
| `app/`, tokens, strings | Only real invariants: contrast ≥ 4.5:1 (RNF-17), every string clean, a 13-textos sentence with parameters. | Copies of constants. |

Example from #31 (RF-CAT-01): `searchExercises` has 15 cases; the search ViewModel has one test per transition (type, toggle a filter, clear), not their combinations; S16 has one gesture per AC and one test per state.

## 4. Tests not to write

| Don't | Instead |
|---|---|
| Style asserts that restate the design (`backgroundColor`, `borderRadius: 20`, icon `width: 24`). Figma is the check. | Nothing. A style that *is* a requirement (§3, Components) stays, with its RNF in the name. |
| A constant compared with itself (`radius.md === 12`, the hex table). | Nothing, or the invariant behind it. |
| "Renders its text" for a purely visual component (`Notice`, `Badge`, `Card`). | The screen tests that use it. |
| An `it.each` that restates a table of the code (every icon is 24 dp, every variant is a button). | One case. An `it.each` that checks an **invariant** over every member (contrast pairs, clean strings, valid catalog) is fine. |
| The same *cases* of an AC at several layers. | §3: each layer once, for what it adds. |
| Asserting that a fake received what the test itself passed in, or call order inside our own code. | Assert the visible result or the state. A callback the unit must call (`onBack`, `onOpenExercise`) is its output: assert it. |
| Private helpers tested directly. | Test through the public function. |
| Snapshots. | Explicit assertions. |
| Library behaviour (Drizzle, RNTL, Expo Router). | Our query, our wiring. |
| `jest.mock` of our own modules. | Fakes through the constructor or the provider (`someUseCases()`). |

## 5. Shape of a good test

- Name: the ID and the behaviour in plain words: `RF-CAT-02.AC3: without a description the section is hidden`. Infrastructure without an AC names its RNF or what it guards.
- One behaviour, arrange-act-assert. Builders (`anExercise`, `aWorkout` in `src/domain/testing/builders.ts`, `someUseCases()` in `src/presentation/use-cases/testing.ts`) set only what the test cares about.
- Queries: follow the priority of the `react-native-testing` skill (role and name first).
- Fakes decide what a repository emits and when. "Now" is a parameter, never `Date.now()` inside the code under test.

## 6. Pruning

- Prune only in a test file you are already editing for the card, or in a dedicated `test:` PR. List each removed test in the PR body with its §4 reason and **the test that still covers the behaviour**.
- Never delete a test because it is red: it is a bug or a spec change until proven otherwise.
- **Never prune:** the only test of an AC or an RN rule, a reference case or reason code (RNF-15), an accessibility invariant (RNF-16/17/18), a ViewModel union state, a server or wiring test.
