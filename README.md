# OneRM

[![CI](https://github.com/ivomiyashiro/onerm/actions/workflows/ci.yml/badge.svg)](https://github.com/ivomiyashiro/onerm/actions/workflows/ci.yml)

Mobile app (React Native + Expo) that tells strength trainees what weight, sets and reps to do, and logs the workout at the gym, with or without signal.

TPO for Desarrollo de Aplicaciones I (UADE), final delivery (stage 2). The app's UI and the specification are in Spanish; the code and this README are in English.

## Problem and value proposition

People who strength-train at the gym **don't know what weight, sets and reps to use** on each exercise to keep progressing without getting hurt, and beginners don't even know which routine to follow. Today they guess, keep notes on their phone or on paper, copy routines from social media or pay a personal trainer. Logging between sets is awkward, loads go up by eye and the notes get lost.

OneRM is a pocket trainer: it says **what to do today** on each exercise, with the rule behind each suggestion, and logs the workout with **one tap per set, even without signal** (many gyms are in basements). With an optional account, the history is backed up and restored on another phone.

The main user is the beginner (under 6 months of training); the secondary one, the intermediate or advanced user who builds their own routine and wants the app to do the progression maths. Details: [vision and scope](docs/especificacion/00-vision-y-alcance.md) (Spanish).

## Implemented features

- **First launch, offline:** welcome screen, start without an account, three questions (experience, goal, days per week) and the recommended routine template, explained, adopted with one tap.
- **Routines:** your routines and the three templates (full body 2 and 3 days, upper/lower 4 days); a routine editor with days, exercises from the catalog, sets, rep range, reps in reserve and rest. The exercise catalog (search, filters, detail) ships with the app.
- **Workout:** the central tab button starts the next day. Each set comes prefilled with the suggestion and «Hecho» logs it with one tap and a vibration; the set can be adjusted (± in your equipment's steps, reps, effort, warm-up, per side for one-arm exercises), corrected, deleted with «Deshacer», skipped, substituted. Rest timer with a notice when it ends, also with the screen locked. The screen stays on only during the workout. A workout survives closing the app and resumes where it was.
- **Suggestions:** a deterministic engine (double progression, effort adjustment, deload, calibration the first time) that explains each suggestion in plain words, with «¿Por qué?» showing the rule, the data and the principle behind it.
- **Progress:** history by month, editable past workouts (the suggestions follow), estimated 1RM chart per exercise, personal records, weekly volume per muscle.
- **Optional account:** email and password or Google (Android), password recovery, the session kept encrypted on the phone. Guest data joins the account. **Backup and restore** with Supabase: automatic on the device's triggers, a status in Profile, the changes the server rejected with retry or discard, and restoring the account on a new phone.
- **Accessibility:** touch targets ≥ 48 dp (56 dp for the workout actions), contrast ≥ 4.5:1, names for TalkBack on every control, readable with the system font at 150 %.

The full list is in the [CHANGELOG](CHANGELOG.md).

## Functional requirements met

The four functional requirements committed in the pre-delivery, each grouping the detailed requirements of the [specification](docs/especificacion/09-trazabilidad.md):

| RF | Requirement | Status | Evidence |
|---|---|---|---|
| RF01 | Choose or create a routine (onboarding, templates, editor) | ✅ | Airplane-mode walkthrough from a clean install ([52](docs/pruebas/52-recorrido-modo-avion.md)) |
| RF02 | Log a workout (one tap per set, rest timer, resume after the app is killed) | ✅ | [52](docs/pruebas/52-recorrido-modo-avion.md); iOS in [49](docs/pruebas/49-ios.md) |
| RF03 | Suggest the load of each exercise, with its reason | ✅ | The reference cases of [sugerencias](docs/especificacion/03-requisitos/sugerencias.md) as literal tests (`src/domain/rules/suggestion/reference-cases.test.ts`); 80 kg × 12, 12, 12 → 85 kg × 8 in [52](docs/pruebas/52-recorrido-modo-avion.md) |
| RF04 | See the progress (history, estimated 1RM, records, volume) | ✅ | [52](docs/pruebas/52-recorrido-modo-avion.md) |

Every operation has real, persistent effects; the non-functional requirements are verified in [50-verificacion-rnf](docs/pruebas/50-verificacion-rnf.md).

## Architecture

MVVM with Clean Architecture ([12-arquitectura](docs/especificacion/12-arquitectura.md), [ADR-0011](docs/especificacion/adr/0011-mvvm-clean-en-react-native.md)). In React Native the ViewModel is a hook per screen that exposes `{ state, actions }`, with the state as a discriminated union (`loading | content | empty | error | …`).

```
app/                 Expo Router: screen composition only (each file re-exports a screen)
src/presentation/    screens, components, ViewModels (hooks), theme, texts (strings)
src/domain/          Pure TypeScript: models, rules (suggestion engine), use cases, repository interfaces
src/data/            SQLite (Drizzle), Supabase, repositories, mappers, sync engine
src/di/              composition root: creates the implementations and provides them via Context
```

Dependencies point towards the domain: `domain` imports no React, Expo, Supabase or Drizzle, and `presentation` never imports `data`. `eslint-plugin-boundaries` enforces it, so a wrong import fails `bun run lint` and CI.

**Data flow, confirming a set:**

```
SetRow «Hecho» ─▶ useWorkoutViewModel.actions ─▶ LogSet (use case, validates)
                                                     └─▶ WorkoutRepository.save ─▶ SQLite (row marked _dirty)
SQLite change ─▶ observeQuery ─▶ ObserveWorkout ─▶ ViewModel state ─▶ screen re-renders   (no network involved)
SyncScheduler (a few seconds later, app in the foreground) ─▶ push _dirty rows ─▶ Supabase ─▶ pull changes
```

SQLite is the source of truth for the UI; the UI never waits for the network. The suggestion engine is a pure function over the history ([ADR-0009](docs/especificacion/adr/0009-motor-como-funcion-pura.md)): suggestions, records and the estimated 1RM are computed, never stored.

**Infrastructure:** the phone holds the app, SQLite, the system's secure storage (Keystore / Keychain) and the OS services (notifications, keep-awake, vibration). In the cloud, Supabase provides auth and a Postgres database with row-level security, reached over HTTPS through its REST API. There is no backend of our own ([ADR-0001](docs/especificacion/adr/0001-supabase-directo-sin-backend-propio.md)).

## Technologies

| Area | Choice | Why |
|---|---|---|
| Framework | React Native 0.86 + Expo SDK 57, development build | The course allows React Native; Expo covers notifications, keep-awake and secure storage with maintained modules ([ADR-0007](docs/especificacion/adr/0007-react-native-con-expo.md)) |
| Navigation | Expo Router | File-based navigation; the role of Navigation Compose |
| Language | TypeScript `strict` | — |
| Local database | `expo-sqlite` + Drizzle ORM | Structured local storage with types, migrations and observable queries; the role of Room ([ADR-0010](docs/especificacion/adr/0010-base-local-sqlite-drizzle.md)) |
| Global state | Zustand | Minimal: the data owner and the sync status ([ADR-0011](docs/especificacion/adr/0011-mvvm-clean-en-react-native.md)) |
| Backend | Supabase (Auth, Postgres with RLS, REST through `supabase-js`) | Backup and auth with row-level security, without running a backend; `supabase-js` is the HTTP client (the role of Retrofit) |
| Device | `expo-notifications`, `expo-keep-awake`, `expo-secure-store` + `expo-crypto`, NetInfo, React Native's `Vibration` | The rest notice with the screen locked, the screen on during the workout, the encrypted session, the connectivity triggers, the confirmation vibration |
| Google sign-in | `@react-native-google-signin/google-signin` | Native picker, ID token accepted by Supabase ([spike #16](docs/spikes/16-google-sign-in.md)) |
| Charts | `react-native-svg` | The 1RM chart, drawn without a chart library |
| Tests | Jest (`jest-expo`) + Testing Library; `better-sqlite3` for the repositories; pgTAP + supabase-js for the server rules | RNF-12, RNF-15 |
| Quality | ESLint + Prettier + `eslint-plugin-boundaries`; GitHub Actions | RNF-11 |
| Package manager | bun | [Conventions §7](docs/convenciones.md) |

## Offline strategy and persistence

The user trains where there is no signal, so everything is written **locally first** and the sync with Supabase runs apart, only while the app is open ([ADR-0002](docs/especificacion/adr/0002-estrategia-de-sincronizacion.md), [07-datos-y-sincronizacion](docs/especificacion/07-datos-y-sincronizacion.md)).

- **Local:** SQLite holds the profile, routines, workouts, catalog, templates, the rest timer and the sync state. The catalog and templates ship with the app, so a guest needs no network ever.
- **Remote:** Supabase keeps the backup of the user's data and publishes the catalog. The workout in progress is uploaded when it is finished.
- **When it syncs:** a few seconds after a local write, when the app opens or comes back to the foreground, when the connection returns, and with «Respaldar ahora». Never in the background and never polling (RNF-22). Failures retry with backoff (5 s, 15 s, 60 s) while there are pending changes; a request without an answer gives up after 15 s.
- **Conflicts:** last write wins per row, a delete always wins, and the server returns the winning version. A change the server rejects stays visible in Profile, where it can be retried or discarded.
- **What the user sees offline:** nothing changes in the workout (RNF-10); a discreet «N cambios sin respaldar» notice; account actions say they need a connection.

The connectivity scenarios are verified one by one in [53-estados-y-conectividad](docs/pruebas/53-estados-y-conectividad.md).

## Running the project

### Requirements

- [bun](https://bun.sh) 1.3 or later and Node 22 LTS.
- **Android:** JDK 17 or later (`JAVA_HOME`), the Android SDK with `ANDROID_HOME` set and `platform-tools` on the `PATH`, and an Android 10+ emulator or a device with USB debugging.
- **iOS (optional):** macOS with Xcode and an iOS simulator.
- **Docker**, for the local Supabase (accounts, backup and its tests).

### Install

```bash
git clone https://github.com/ivomiyashiro/onerm.git
cd onerm
bun install
```

### Build and run

The app uses its own **development build**, not Expo Go ([ADR-0007](docs/especificacion/adr/0007-react-native-con-expo.md)).

```bash
bun run android          # = expo run:android: prebuild, compile, install and start Metro
bun run ios              # = expo run:ios, on a simulator
```

The first build takes several minutes. After that, while the native modules don't change, `bun run start` (Metro only) and opening the installed app is enough; TS changes show up with Fast Refresh. `android/` and `ios/` are generated by prebuild and never committed or edited: after changing `app.config.ts` or a config plugin, regenerate them with `bunx expo prebuild --clean`.

### Run on a physical device

With the phone connected by USB, one command builds the app, installs it and opens it. Without a device name, Expo lists the connected ones to pick from; adding the name or id after the command skips the question (`bun run device:ios "iPhone de Ivo"`).

```bash
bun run device:android           # Debug: needs Metro, the phone on the same Wi-Fi or USB
bun run device:ios
bun run device:android:release   # Release: the JS goes inside the app, it runs without the Mac
bun run device:ios:release
```

- **Android:** turn on the developer options and **USB debugging**, accept the computer's key on the phone, and check it shows in `adb devices`. The release variant is signed with the debug key from prebuild, enough to install it by hand.
- **iOS:** Xcode with a free **Apple ID** added in *Settings → Accounts*. The first time, Expo asks for the signing team; the free signature lasts **7 days**, then run the command again. On the iPhone, turn on *Settings → Privacy & Security → Developer Mode* and, after the first install, trust the certificate in *Settings → General → VPN & Device Management*.

### Backend and keys

Without Supabase variables the app runs fully **as a guest** (the accounts say they need a connection). To use accounts and backup, create `.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=…              # https://<project>.supabase.co, or http://10.0.2.2:55321 for the local stack from the Android emulator
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…  # the publishable (anon) key; the service_role key never goes into the app
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=…      # optional: Google sign-in on iOS (ADR-0012)
```

These are read when the app is built. A build installed on a phone needs the cloud URL: `10.0.2.2` only exists inside the Android emulator, so the app would say it needs a connection.

**Google on iOS:** create an OAuth client of type *iOS* with bundle ID `com.training.onerm` in Google Cloud, in the same project as the web client. Then add its ID to Supabase, in *Authentication → Providers → Google → Client IDs*, after the web one, separated by a comma with no spaces, and turn on *Skip nonce checks*. The iOS token is issued for the iOS client, and Google's iOS library adds a nonce the app can't pass on; without these two settings Supabase refuses the token and the app says «No pudimos completarlo». With the variable set, the build registers the reversed client ID as the URL scheme Google returns to (`plugins/with-google-sign-in.ts`). Without it, iOS doesn't offer Google.

For a local backend: `bunx supabase start` (Docker; project `onerm-mvp`, ports 553xx) applies the migrations of `supabase/migrations`, and `bunx supabase status` prints the local URL and publishable key.

### Tests and quality

```bash
bun run test             # unit tests (domain, ViewModels, screens); test:watch, test:coverage
bun run test:int         # repositories against a real in-memory SQLite with the app's migrations
bun run test:supabase    # RLS and LWW triggers (pgTAP) and supabase-js with two users; needs `bunx supabase start`
bun run typecheck        # tsc --noEmit
bun run lint             # ESLint with the layer rules; fails on any warning; cached, CI runs it cold
bun run format:check     # Prettier
```

CI runs all of them on every pull request.

## Relevant decisions

The decisions are recorded as ADRs in [docs/especificacion/adr/](docs/especificacion/adr/README.md) (Spanish): Supabase straight from the client without a backend (0001), local-first sync with last-write-wins (0002), guest mode with migration to an account (0003), a canonical catalog seeded from several sources (0004), external load and bodyweight only (0005), the next day derived from the history (0006), Expo development build (0007), unilateral sets per side (0008), the engine as a pure function (0009), SQLite + Drizzle (0010), MVVM + Clean in React Native (0011), and iOS runnable but not published (0012). The spikes that confirmed the stack are in [docs/spikes](docs/spikes/README.md).

### Changes since the pre-delivery

The pre-delivery (2026-10-02) committed RF01–RF04 and nine non-functional requirements. What changed while building, and why:

| Change | Why |
|---|---|
| The rest notice with the screen locked needs the **exact alarms** permission on Android 12+, asked after the notification permission (D17) | Spike #14: without exact alarms, Android delays the notice by minutes; a late notice is worse than none, so without the permission it isn't scheduled and the on-screen notice stays exact |
| **Google sign-in and receiving other devices' changes were kept**, although the pre-delivery named them as the first cuts | They fit in the plan; Google works on Android, and on iOS it needs a Google client of its own (a known limitation) |
| **Vibration with React Native's `Vibration`** instead of `expo-haptics` | One fixed confirmation pattern is all the workout needs, without another dependency (F5 review) |
| **Charts drawn with `react-native-svg`**, without a chart library | The 1RM chart is one line with points and a legend; a library would add weight for no gain |
| **«Empezar» moved to a central button of the tab bar**, reachable from every tab | The main action of the app in the thumb zone (design decision of 2026-10-06) |
| The non-functional requirements follow the specification's numbering (RNF-01 to RNF-23), which details the pre-delivery's RNF01–RNF09: for example, accessibility with TalkBack and the 150 % font, the history with 1,000 workouts and iOS | Each one is verifiable on its own; none of the nine was dropped |
| **iOS runs in the simulator** (ADR-0012), with Android as the reference platform | The same code base runs on both; checked with a smoke test before the final delivery (#49) |

## Known limitations

- **No account deletion from the app** (RF-AUTH-09, Won't). Google Play requires it for apps that create accounts; it doesn't apply because the app isn't published.
- **The email is not confirmed** on sign-up (an account can be created with someone else's email).
- **No sync with the app closed** (on purpose: RNF-22). Changes go up the next time the app is open.
- **Out of scope** ([00 §6](docs/especificacion/00-vision-y-alcance.md)): weighted, assisted or timed exercises (plank); nutrition and body measurements; social features; AI chat or recommendations; wearables, sensors, GPS and camera; technique videos; advanced periodization; coach mode; cardio and supersets; light mode.
- **Measured on emulators and the iOS simulator, not on a physical phone:** RNF-03 (< 100 ms to confirm a set on a mid-range phone) and the rest notice with battery saver on.
- **iOS:** the app closes at launch on iOS 27, which requires the scene life cycle ([#181](https://github.com/ivomiyashiro/onerm/issues/181)); it was checked on the iOS 26.5 simulator. «Continuar con Google» needs an iOS OAuth client; VoiceOver doesn't announce the effort options as radio buttons ([49](docs/pruebas/49-ios.md)).
- For the first minutes in the background, a frame loop of `react-native-worklets` (Reanimated, pulled in by the navigation and gesture libraries) still uses some CPU until Android freezes the app ([#182](https://github.com/ivomiyashiro/onerm/issues/182)).
- The Supabase free tier pauses a project after a week without activity: it has to be woken up before using accounts.

## Team, roles and responsibilities

| Member | Role | Responsibilities |
|---|---|---|
| Ivan Miyashiro (1158050) | Full development | Analysis, UX and UI, architecture, persistence and sync, suggestion engine, testing and documentation |

The work is individual, with AI assistance (Claude) for implementation and reviews, as the course allows (§8). Every change went through a pull request with tests, CI and a review; the work is planned on the [«OneRM» board](https://github.com/users/ivomiyashiro/projects/2), card by card.

## Project documentation (Spanish)

- [Specification](docs/especificacion/README.md): requirements, business rules, data model, screens and texts.
- [Implementation plan](docs/plan-de-implementacion.md): phases and exit criteria.
- [Conventions](docs/convenciones.md): branches, commits, PRs and Definition of Done.
- [Test notes](docs/pruebas/): airplane-mode walkthrough, accessibility, iOS, states and connectivity, RNF verification.
- [Demo script](docs/entregas/guion-demo.md).
- [CHANGELOG](CHANGELOG.md).
