# Estados de UI, conectividad y errores (#53)

**Fecha:** 16 de octubre de 2026.
**Cómo se verificó:** cada fila de 08 §6 y cada escenario de 07 §5 apunta al test que lo comprueba. Los de pantalla (`*-screen.test.tsx`) tienen un test por estado, y los de ViewModel, dominio, integración y pgTAP cubren el resto. Lo que solo se ve en vivo (la conectividad) se comprobó en el emulador (Android 15) con Supabase local y una cuenta registrada. Las pantallas en modo avión se recorrieron en #52 ([52-recorrido-modo-avion.md](52-recorrido-modo-avion.md)).

Rutas abreviadas: `auth/` = `src/presentation/features/auth/`, y así con cada feature; `domain/` = `src/domain/`.

## 08 §6 — Estados por pantalla

| Pantalla | Estados de 08 §6 | Evidencia | Resultado |
|---|---|---|---|
| S01 Bienvenida | contenido; sin conexión (avisan los botones de cuenta) | `welcome/welcome-screen.test.tsx`; el aviso se da al intentar crear la cuenta o entrar (S02/S03 AC3/AC4, RF-AUTH-02/03), como piden los RF | ✅ |
| S02/S03 Auth | carga «Ingresando…» · formulario · credenciales · email existente · método distinto · validación · sin conexión · Google cancelado | `auth/sign-in-screen.test.tsx` (carga: **agregado en #53**, AC2, AC3), `auth/sign-up-screen.test.tsx` (AC2–AC5), `auth/use-google-sign-in-view-model.test.tsx` (AC4 cancelar, AC5 sin conexión) | ✅ |
| S04 Pedir enlace | enviando · contenido · email inválido · sin conexión · «Si existe una cuenta…» | `auth/password-recovery-screen.test.tsx` (enviando: **agregado en #53**; decía «Enlace enviado» antes de enviarlo y ahora dice «Enviando…») | ✅ corregido |
| S24 Nueva contraseña | guardando · contenido · contraseña inválida · enlace inválido o vencido · sin conexión | `auth/new-password-screen.test.tsx` (guardando: **agregado en #53**), `auth/use-new-password-view-model.test.tsx` (sin conexión) | ✅ |
| S05 Onboarding | pasos 1–3 · sin conexión igual · retomar el paso pendiente | `onboarding/onboarding-screen.test.tsx`, `onboarding/use-onboarding-view-model.test.tsx` (RF-PERF-01.AC6); en modo avión en #52 | ✅ |
| S06 Recomendación | recomendación + por qué · novato con 4+ días · intermedio con 5–6 · «fuerza sin barra» | `onboarding/recommendation-screen.test.tsx` (AC1, AC4, AC6, intermedio) | ✅ |
| S23 Restaurando | progreso · se cortó: aviso + continuar · sin conexión = error | `sync/restoring-screen.test.tsx` (RF-SYNC-03.AC1, AC2) | ✅ |
| S07 Inicio | esqueleto · próximo día · sin rutina activa · error con Reintentar · sin conexión con indicador · restauración incompleta · en curso | `home/home-screen.test.tsx` (los 9 estados), `workout/use-workout-action.test.tsx` («Continuar») | ✅ |
| S08 Elegir día | días con «hace N días» y el recomendado | `home/choose-day-sheet.test.tsx` | ✅ |
| S09 Entrenamiento | precargada · editando · calibración · unilateral dividido · calentamiento · descanso corriendo y terminado · esfuerzo simple y RIR · peso corporal · EXTEND_REPS · valor inválido · permisos rechazados · salteado · sustituido · último ejercicio · no disponible · sin conexión idéntico | `workout/workout-screen.test.tsx` (contenido, unilateral, valor inválido, calibración, descanso, D05, sin notificaciones, salteado, sustituido, **no disponible: agregado en #53**), `workout/use-workout-view-model.test.tsx` (último ejercicio, siguiente), `workout/set-form.test.ts` (peso corporal), `domain/rules/suggestion/reference-cases.test.ts` (EXTEND_REPS), `profile/profile-screen.test.tsx` (RIR numérico); sin conexión en #52 | ✅ |
| S10 ¿Por qué? | novato · avanzado · uno por código | `workout/reason-text.test.ts`, `workout/workout-screen.test.tsx` (RF-SUG-07) | ✅ |
| S11 Sustituir | mismo músculo primero + búsqueda · sin resultados | `workout/workout-screen.test.tsx` (RF-ENT-09; sin resultados: **agregado en #53**) | ✅ |
| S12 Resumen | con y sin récords · invitado: D13 | `summary/workout-summary-screen.test.tsx` | ✅ |
| S13 Rutinas | carga · contenido · sin rutinas propias · error · activa destacada | `routines/routines-screen.test.tsx` | ✅ |
| S14 Plantilla | contenido + por qué · prescripción para mi objetivo | `routines/template-screen.test.tsx` | ✅ |
| S15 Editor | contenido · día sin ejercicios · validaciones · reordenar · RIR 0 · D08 · D15 | `routine-editor/routine-editor-screen.test.tsx` | ✅ |
| S16 Buscador | carga · contenido · sin resultados · filtros | `exercises/exercise-search-screen.test.tsx` | ✅ |
| S17 Ejercicio | contenido · sin descripción · obsoleto · no disponible | `exercises/exercise-detail-screen.test.tsx` | ✅ |
| S18 Progreso | carga · historial y volumen · sin entrenamientos · error · **ítem «pendiente de respaldo»** | `progress/history-screen.test.tsx`, `progress/use-history-view-model.test.tsx` (error) | ⚠️ falta el indicador «Pendiente» (RF-PROG-01.AC2) → **#174** |
| S19 Detalle editable | lectura · edición · validación · sustitutos y salteados · D16 | `progress/workout-detail-screen.test.tsx`, `domain/usecases/observe-workout-detail.test.ts` | ✅ |
| S20 Progreso de ejercicio | carga · línea + récords · 1 punto · solo mejor serie · peso corporal | `progress/exercise-progress-screen.test.tsx`, `progress/use-exercise-progress-view-model.test.tsx` (carga, AC6) | ✅ |
| S21 Perfil | los 9 estados de sync · error · permisos · D03, D06, D14, D17 | `profile/profile-screen.test.tsx`, `domain/rules/sync/sync-status.test.ts`; en vivo abajo | ✅ |
| S22 Acerca de | versión + créditos | `about/about-screen.test.tsx` | ✅ |
| S25 Conflictos | lista · «Todo respaldado» · D12 | `sync/rejected-changes-screen.test.tsx` | ✅ |

**Salidas ante errores:** cada error tiene una salida. Hay Reintentar en las lecturas locales (S07, S13, S16, S17, S18, S21 y S15) y en el arranque (`startup/startup-gate.test.tsx`). Volver, o seguir como invitado, en auth sin conexión. Continuar en la restauración cortada. Reintentar o Descartar en los cambios rechazados (D12). El valor inválido queda en el campo con su mensaje.

## 07 §5 — Escenarios de conectividad

| Escenario | Evidencia | Resultado |
|---|---|---|
| Con conexión | `domain/usecases/sync-scheduler.test.ts` (RN-SYNC-06 a: escrituras agrupadas en 3 s; c: al volver al primer plano), `sync-status.test.ts` (RN-SYNC-13). En vivo: Perfil dice «Tu entrenamiento se respalda al finalizarlo» ([captura](53/01-con-conexion.jpg)) | ✅ |
| Pierde la conexión | `sync-scheduler.test.ts` (backoff de 5, 15 y 60 s), `domain/usecases/observe-backup-notice.test.ts`, `home/home-screen.test.tsx` (RF-SYNC-06.AC2), auth AC3/AC4 («Necesitás conexión»). En vivo, en modo avión: un cambio de esfuerzo deja «1 cambio sin respaldar · sin conexión» ([captura](53/02-sin-conexion.jpg)); el entrenamiento no cambia (#52, RNF-10) | ✅ |
| Recupera la conexión | `sync-scheduler.test.ts` (RN-SYNC-06 b). En vivo: el cambio sube y Perfil vuelve a su estado ([captura](53/03-recupera.jpg)), pero «Respaldando…» duró unos 40 s | ⚠️ sin timeout de red → **#175** |
| Información local desactualizada | `domain/usecases/observe-*.test.ts` (los datos derivados se recalculan al cambiar la base); pull en `src/data/sync/` | ✅ |
| Sin información local | Invitado: RF-AUTH-01.AC1 y el catálogo incluido (#52, desde `pm clear` en modo avión). Usuario: `sync/restoring-screen.test.tsx` | ✅ |
| Conflicto (LWW, el borrado gana) | `supabase/tests/sync_rules_test.sql` (casos 2–7) | ✅ |
| Cambio rechazado | `sync/rejected-changes-screen.test.tsx`, `src/data/sync/sqlite-rejected-change-repository.int.test.ts` (RN-SYNC-11) | ✅ |
| App desactualizada | `sync-status.test.ts` (RN-SYNC-14) | ✅ |

## Hallazgos

| Qué | Estado |
|---|---|
| S04 decía «Enlace enviado» mientras enviaba | Corregido en este PR: «Enviando…» (13-textos) |
| El tiempo del botón central con más de una hora se cortaba con «…» (regresión de #48) | Corregido en este PR: una talla menor ([captura](53/disco-mas-de-una-hora.jpg)) |
| S18 sin el indicador «Pendiente» (RF-PROG-01.AC2) | #174 |
| La sync no tiene timeout de red: «Respaldando…» unos 40 s al recuperar la conexión | #175, con propuesta |
| Estados sin test: S02 carga, S04 enviando, S24 guardando, S11 sin resultados, S09 no disponible | Tests agregados en este PR |
