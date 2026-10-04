# OneRM

[![CI](https://github.com/ivomiyashiro/onerm/actions/workflows/ci.yml/badge.svg)](https://github.com/ivomiyashiro/onerm/actions/workflows/ci.yml)

Mobile app (React Native + Expo) that tells strength trainees what weight, sets and reps to do, and logs the workout at the gym, with or without signal.

TPO for Desarrollo de Aplicaciones I (UADE). The app's UI and the specification are in Spanish; the code and this README are in English.

## Problem and value proposition

People who strength-train at the gym **don't know what weight, sets and reps to use** on each exercise to keep progressing without getting hurt, and beginners don't even know which routine to follow. Today they guess, keep notes on their phone or pay a personal trainer.

OneRM tells them **what to do today** on each exercise, with the reason behind each suggestion, and logs the workout with one tap per set, **even without signal** (basements, dead zones). With an account, the history is backed up and restored on another device.

Details: [vision and scope](docs/especificacion/00-vision-y-alcance.md) (Spanish).

## Implemented features

> Under construction. The project currently has the technical foundation (F0): an empty Expo app, a development build, lint with layer rules, tests and CI.

## Functional requirements met

> Under construction. The TPO's functional requirements (RF01–RF04) are completed in phase F5 of the [plan](docs/plan-de-implementacion.md).

## Architecture

MVVM + Clean Architecture ([12-arquitectura](docs/especificacion/12-arquitectura.md), [ADR-0011](docs/especificacion/adr/0011-mvvm-clean-en-react-native.md)):

```
app/                 Expo Router: screen composition only
src/domain/          Pure TypeScript: models, rules (suggestion engine), use cases, interfaces
src/data/            SQLite (Drizzle), Supabase, repositories, sync
src/presentation/    screens, components, ViewModels (hooks), texts
src/di/              composition root: creates the implementations and provides them via Context
```

Dependencies point towards the domain. The lint enforces it (`eslint-plugin-boundaries`): for example, an import from `domain` to `data` makes `bun run lint` and CI fail.

> The final diagram and the implemented data flow are added when F2 closes.

## Technologies

| Area | Choice | Why |
|---|---|---|
| Framework | React Native 0.86 + Expo SDK 57, development build, Expo Router | [ADR-0007](docs/especificacion/adr/0007-react-native-con-expo.md) |
| Language | TypeScript `strict` | — |
| Package manager | bun | [Conventions §7](docs/convenciones.md) |
| Tests | Jest (`jest-expo`) + Testing Library | RNF-12, RNF-15 |
| Quality | ESLint + Prettier + `eslint-plugin-boundaries` | RNF-11 |
| CI | GitHub Actions: typecheck, lint and tests on every PR | — |
| Local database, backend, state | SQLite + Drizzle, Supabase, Zustand | Under construction (F1–F4). [Plan §4](docs/plan-de-implementacion.md) |

## Offline strategy and persistence

> Under construction. The decision is in [ADR-0002](docs/especificacion/adr/0002-estrategia-de-sincronizacion.md) and [07-datos-y-sincronizacion](docs/especificacion/07-datos-y-sincronizacion.md): SQLite is the source of truth and sync with Supabase runs separately.

## Running the project

### Requirements

- [bun](https://bun.sh) 1.3 or later and Node 22 LTS.
- JDK 17 or later (`JAVA_HOME` pointing to it).
- Android SDK (Android Studio's) with `ANDROID_HOME` set and `platform-tools` on the `PATH`.
- An Android 10+ emulator, or a device with USB debugging.

- Docker, only for the tests against local Supabase (`bunx supabase start`; the CLI comes as a dev dependency from #40).

### Install

```bash
git clone https://github.com/ivomiyashiro/onerm.git
cd onerm
bun install
```

### Build and run on Android

The app uses its own **development build**, not Expo Go ([ADR-0007](docs/especificacion/adr/0007-react-native-con-expo.md)).

```bash
bun run android          # = bunx expo run:android
```

The first run generates `android/` with prebuild, compiles the debug APK, installs it on the connected emulator or device and starts Metro. The initial build takes several minutes (it downloads Gradle and the NDK).

After that, as long as the native modules don't change, starting Metro and opening the installed app is enough:

```bash
bun run start            # = bunx expo start
```

Changes to TS/TSX files show up instantly with Fast Refresh. Run `bun run android` again only when adding or updating a native module or changing `app.config.ts`. If `android/` already exists, regenerate it first with `bunx expo prebuild --platform android --clean`: `expo run:android` does not apply config plugin changes (such as new fonts) to an existing `android/`.

`android/` and `ios/` are neither committed nor edited by hand: they are regenerated with `bunx expo prebuild --clean`.

### Tests and quality

```bash
bun run test             # Jest; test:watch, test:coverage
bun run typecheck        # tsc --noEmit
bun run lint             # ESLint with the layer rules; fails on any warning
bun run format:check     # Prettier
```

There are no API keys yet.

## Relevant decisions

The ADRs are in [docs/especificacion/adr/](docs/especificacion/adr/README.md) (Spanish).

## Known limitations

> Under construction.

## Project documentation (Spanish)

- [Specification](docs/especificacion/README.md): requirements, business rules, data model and texts.
- [Implementation plan](docs/plan-de-implementacion.md): phases and exit criteria.
- [Conventions](docs/convenciones.md): branches, commits, PRs and Definition of Done.
- [Project «OneRM MVP»](https://github.com/users/ivomiyashiro/projects/2): task board.
- [CHANGELOG](CHANGELOG.md).
