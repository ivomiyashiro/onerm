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
- First launch: a welcome screen to start without an account, and three short questions (experience, goal and days per week) that can go back, be skipped and resume where you left them. Works offline.
