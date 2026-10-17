# Changelog

All notable changes to this project are recorded in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- MVP specification, design and the Stage 1 deliverable.
- Phased implementation plan, working conventions, and issue and PR templates.
- App skeleton: navigation with the Inicio, Rutinas, Progreso and Perfil tabs, and every screen as a placeholder.
- Kinetic dark theme from the design, with the Archivo and JetBrains Mono fonts and the base components (buttons, load and reps steppers, fields, sheet, dialog, snackbar, empty states, loading skeletons and the backup status).
- Every UI text of the specification, in Spanish, centralized in one place.
- Local database on the phone, created on first launch and upgraded on every start; if preparing it fails, a screen offers to retry without losing data.
- Exercise catalog and the three routine templates (full body 2 and 3 days, upper/lower 4 days) bundled with the app, available offline from the first launch.
- Exercise search by name or alias, ignoring accents and case, with muscle and equipment filters; works offline.
- Exercise detail with its muscles, equipment, description when there is one and a link to your progress once you trained it; and an About screen with the version and the credits (photos and fonts).
- Routines tab: your routines with the active one highlighted, and the templates with the one recommended for you. A template shows its days, exercises and the prescription for your goal, explains why it is built that way, with its criteria and their scientific sources, and can be adopted as your routine with one tap; a routine can be activated or deleted, never while a workout is in progress. Works offline.
- Home shows the next day of your active routine over a photo of its kind of day (legs, upper body or full body), with its exercises, sets and estimated time; without an active routine it offers to choose one of the templates or create your own.
- First launch: a welcome screen to start without an account, and three short questions (experience, goal and days per week) that can go back, be skipped and resume where you left them; then the recommended template for your answers, explained, to start with one tap, see the others or skip for now. Works offline.
- Profile: change your level, goal, days per week, weight unit and effort mode, and the weight steps of your gym per equipment and the bar weight; a new goal or level offers to adjust your routine's reps, effort and rest without touching its exercises. Works offline.
- Routine editor: create your own routine or edit one, with a name, days you can rename, reorder or remove, and exercises from the catalog with role, sets, rep range, reps in reserve, rest and notes; drag exercises by their handle or move them up or down, replace or remove them; the editor asks before leaving with unsaved changes, says which day is empty, warns about RIR 0 and about accessories before main exercises, and offers to activate a new routine. Works offline.
- Start a workout from the central button of the tab bar, on any tab: it starts the next day of your routine, or shows «Continuar» with the running time of the workout in progress. Home shows the suggested weight and reps of each exercise, or «Calibrar» the first time, with an icon for what changes; «Cambiar día» lists every day with when it was last done and starts any of them. Works offline.
- Log your workout set by set: each set comes prefilled with the suggestion and «Hecho» saves it with one tap and a short vibration; tap the current set to adjust the weight (with ± in your equipment steps or by typing it), the reps, a warm-up mark and how many more you could do, also per side for one-arm or one-leg exercises; tap a logged set to correct or delete it, with «Deshacer»; add an extra set; after the last set it moves on to the next exercise, and «Ver todos» jumps to any of them. Everything is saved on the phone at once and survives closing the app. Works offline.
- Each exercise of the workout says why it suggests that weight, in plain words for beginners and with the numbers for intermediate and advanced users; «¿Por qué?» shows the rule, the data it used (last time, effort, estimated max) and the principle behind it. The first time you do an exercise you choose the weight, answer how many more you could do, and the next set's weight is calculated from that. Works offline.
- Rest timer after each set: a full-screen countdown with +15 s, restart and skip, the set just done to answer how many more you could do, and what comes next; it can be minimized to a bar over «Hecho». When it ends the phone vibrates and, with the screen locked, a notification arrives on time if the phone allows exact alarms; the app asks for both permissions the first time and S09 says which one is missing. The screen stays on during the workout. Works offline.
- Workout: skip an exercise and come back to it later, or substitute it for today with another one from the catalog, the same muscle first; the substitute keeps the prescription and says what it replaces. Finish the workout from its menu or from the main button when nothing is left, with a warning when exercises have no sets; discard it after confirming. Finishing or discarding stops the rest. Works offline.
- Workout summary after finishing: duration, sets, exercises done, the records beaten today (heaviest load and estimated max, only for exercises done before), what was done in each exercise with its best set or «Salteado», and the next day. Opening the app goes back to the workout in progress, with the rest's real time left; one started more than 12 hours ago asks whether to finish it (ending at its last set), continue or discard it. Works offline.
- Progress: the history of finished workouts by month, with duration, sets and records, and «Empezar el próximo» when there are none. Each workout opens its detail with its sets, records, substitutes and skipped exercises; editing it corrects, adds or deletes sets, or deletes the whole workout after confirming, and the suggestions, records and next day follow at once. Works offline.
- Exercise progress: the estimated max over time (hollow points when approximate, the record in lime) for 4 weeks, 3 months or everything, with the records, the best set of each workout and, without an estimate, the reps of the best set; bodyweight exercises follow their reps. The weekly volume per muscle, with the reference at 10 sets and earlier weeks. Works offline.
- Optional account: create it with an email and a password, or sign in, from the welcome screen or from Profile; the session is kept encrypted on the phone, also without a connection. Profile shows your email and «Cerrar sesión», which warns about changes not backed up (D03) and asks you to finish your workout first (D14). Backing up and restoring your data comes with the sync. If the server ends your session, Profile says so and lets you sign back in (only with the same account); your data stays. After your first finished workout as a guest, and then at most once a week, the summary invites you to create an account.
- Forgot your password: «Olvidé mi contraseña» sends a link to your email (the answer is the same whether the account exists or not); opening it on the phone lets you choose a new password and signs you in. An expired or used link says so and offers to ask for another one.
- Continue with Google: from the sign-in and sign-up screens you can enter with your Google account. If that email already has an account with a password, the app tells you to use the password and never links the two.
- When the session of your account expires, Profile names it and «Volver a entrar» comes with your email filled in.
- Your guest data joins your account: signing in or creating an account on a phone used as a guest moves your routines and workouts to it. If both the phone and the account have data, «¿Sumamos tus datos a la cuenta?» lets you add them (nothing of the account is replaced, its profile and active routine stay), discard them after confirming, or cancel and stay as a guest. If the app closes halfway, it resumes when it opens again; without a connection it tries again when the connection returns or the app comes back.
- Automatic backup for accounts: what you change is uploaded on its own a few seconds later, when the app opens or comes back, and when the connection returns; without a connection nothing changes and it is retried later, never in the background. A workout in progress is uploaded when you finish it. Changes made on another phone of the same account arrive with the next sync, and a delete always wins. If the server rejects a change, the rest are uploaded anyway. Signing out first backs up your pending changes («Respaldando tus datos…») and only warns (D03) about the ones left. The exercise catalog updates from the server, for guests too.
- Backup status in Profile: «Respaldado · hace 2 min», «Respaldando…», the changes waiting (with or without connection), the ones the server rejected, a network error with «Reintentar», a workout that is backed up when finished, an expired session and an outdated app. Inicio shows a discreet notice of the changes not backed up yet.
- Changes the server rejected: «Ver» in Profile lists them, each by the record it is about; tapping one says why and offers «Reintentar» or «Descartar este cambio», which goes back to the saved version or, if it was never uploaded, deletes it together with the records that depend on it (and says how many).
- Restoring your data: signing in on a phone without data downloads your account with «Restaurando tus datos…», how many records of the total and the percentage; the app opens as soon as your profile arrives and the rest keeps downloading, with «Faltan datos por restaurar» in Inicio until it ends. If the connection is cut, what arrived stays, «Continuar» goes on and the restoration finishes by itself. A new account goes on to the onboarding.
- «Respaldar ahora» in Profile backs up and brings the other phone's changes at once, when backed up or with changes waiting and a connection. What you did on another phone appears when the app opens or comes back, and the history, next day and suggestions follow it.
- Progress: with an account, a workout not backed up yet says «Pendiente» in the history until it is.
- Workout: swipe the exercise sideways to go to the next or the previous one, to correct the sets of an exercise already done.
- `device:android` and `device:ios` (and their `:release` variants) build, install and open the app on a connected phone with one command.

### Changed

- Bottom sheets float over the screen, inset from its edges and with every corner rounded.
- Sheets, dialogs and the full-screen rest: the dark background fades in place while the sheet slides up, and a «…» button can be tapped again as soon as its sheet closes, without waiting for the animation.

### Fixed

- On iPhone the rest notifications are asked once, with the system prompt alone, instead of our explanation followed by the system's.
- Rest notice: «Activar» in the workout shows the system prompt when the phone never asked (after «Ahora no»), instead of opening the settings, where iPhone has no notifications option for the app yet. The notice also appears right after «Ahora no».
- Workout on iPhone: the screen no longer stops responding when a set is confirmed from «Ajustar serie» or sheets are opened and closed quickly; sheets and dialogs are drawn over the screen instead of as separate system windows.
- On an iPhone with iOS 27 the app closed as soon as it opened; it now starts normally.
- A profile made on the phone while your account was still being restored (or before signing in) no longer replaces the one your account already had; it only goes up if the account had none.

- Perfil shows whether the rest notifications can arrive with the screen locked, and leads to the phone settings or to allow exact alarms when one is missing.
- Finishing a workout without any logged set now offers to discard it, so the next day doesn't move and the history doesn't get an empty workout.
- With a long history (1,000 workouts), logging a set no longer reads the whole history again, and the app starts faster.
- Typing the load of a calibration set started after the «—» shown in the field, so the set could not be logged.
- The estimated max shows one decimal, as an estimate.
- Recovering a password says «Enviando…» while it sends, instead of «Enlace enviado» before the link was sent.
- iOS: the display titles keep the accent of an uppercase letter («DÍA A»), the notification permission is asked over the rest screen, and the app no longer fails at startup without a Google client for iOS.
- The rest says «Siguiente: {ejercicio} · primera vez» when the next exercise has no load yet, instead of «· × 8».
- On iOS without a Google client of its own, «Continuar con Google» is not shown instead of always failing.
- Coming back to the app, the rest and the workout time are right from the first frame, and a rest that ended in the background no longer vibrates on return (its notification already said so).
- The rest countdown and the workout time stop ticking while the app is in the background, so Android no longer closes the app for using the CPU; and the app no longer checks the internet with periodic requests.
- A backup request without an answer gives up after 15 s and is retried, so a request stuck when the network changes no longer holds the backup back.
- The time of the central button past an hour fits its disc instead of ending in «…».
- Accessibility: every touch target is at least 48 dp (section tabs, effort options, text fields, switches and «¿Por qué?»), and a switch toggles by tapping anywhere on its row. TalkBack no longer stops on the dark background behind sheets, reads which set a row is and whether it is done, names the day of «Empezar» and the time of «Continuar entrenamiento», and the rest's time is a button. With the system font at 150 % the tab bar and the load and reps labels stay in one line.
