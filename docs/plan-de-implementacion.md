# Plan de implementación del MVP

**Estado:** Vigente · **Fecha:** 2026-10-02
**Entrada:** [especificación](especificacion/README.md) (RF, RN, RNF, ADR), [Etapa 2 del TPO](etapa-2-entrega-final.md).
**Seguimiento:** [GitHub Project «OneRM MVP»](https://github.com/users/ivomiyashiro/projects/2) · [milestones](https://github.com/ivomiyashiro/onerm/milestones). Cómo se trabaja: [convenciones.md](convenciones.md).

> Este documento dice **qué** se hace en cada fase y **cómo se sabe que terminó**. El estado de cada tarea vive **solo** en GitHub (issues y milestones); acá no se marcan tareas como hechas.

## 1. Criterios

1. **Primero lo riesgoso y lo que nunca se recorta.** El motor de sugerencias es lo único que no se recorta (00 §8) y la sync es lo más complejo (00 §9). El motor va temprano porque es puro. La sync tiene un spike en F1 y se implementa completa en F8.
2. **Offline como invitado antes que la nube.** Los 4 RF del TPO (09 §1) funcionan 100 % en local. Al cerrar F5 la app ya cumple lo comprometido, aun sin auth ni sync.
3. **Slices verticales.** Cada fase de producto termina en algo demostrable y con tests, no en una capa suelta.
4. **Backlog completo, detalle justo a tiempo.** Todo el MVP está en el tablero como cards, una por slice, con su checklist de RF. Las tareas finas de cada card se agregan a su checklist al empezarla. Se trabaja con Kanban liviano ([convenciones.md §5](convenciones.md)).

## 2. Fases

| Fase | Milestone | Objetivo | RF / RNF | Criterio de salida |
|---|---|---|---|---|
| F0 | [Fundaciones](https://github.com/ivomiyashiro/onerm/milestone/1) | Proyecto Expo, calidad y CI | RNF-11, RNF-19 | La CI pasa en verde. La app abre en el emulador Android con un development build. Un import prohibido entre capas hace fallar el lint |
| F1 | [Spikes](https://github.com/ivomiyashiro/onerm/milestone/2) | Confirmar o corregir los ADR antes de construir encima | ADR-0001, 0002, 0007, 0010 · RNF-07, RNF-23 | Cada spike tiene su nota en [spikes/](spikes/README.md) con conclusión y decisión. Si un ADR cambia, se actualiza en la misma fase |
| F2 | [Esqueleto](https://github.com/ivomiyashiro/onerm/milestone/3) | Arquitectura de 12 §5 funcionando de punta a punta | ADR-0011 · RNF-21 | Se navega por las 4 pestañas. El tema sale de los tokens de diseño. Un ViewModel se prueba con un repositorio falso inyectado |
| F3 | [Dominio](https://github.com/ivomiyashiro/onerm/milestone/4) | Motor de sugerencias y reglas puras, con TDD | RF-SUG-* · RNF-12, 13, 15 | Cada caso de referencia (A–R) tiene su test y pasa. Benchmark de menos de 50 ms con 500 exposiciones. Sin UI |
| F4 | [Persistencia](https://github.com/ivomiyashiro/onerm/milestone/5) | Base local completa y repositorios | ADR-0010 · RNF-02 | Esquema con las columnas de sync desde el inicio (07 §2.1). Catálogo y plantillas cargados. Tests de integración de los repositorios |
| F5 | [Producto offline](https://github.com/ivomiyashiro/onerm/milestone/6) | Los 4 RF del TPO como invitado | RF01–RF04 del TPO | La card de recorrido en modo avión (#52) pasa: RNF-01, RNF-02, RNF-03 y los criterios de RF01–RF04. Ver el desglose en §3 |
| F6 | [Supabase](https://github.com/ivomiyashiro/onerm/milestone/7) | Esquema remoto, RLS y triggers | RNF-06, RNF-08, RNF-09 | Test con dos usuarios: ninguno lee ni modifica los datos del otro. Security Advisor sin alertas |
| F7 | [Auth](https://github.com/ivomiyashiro/onerm/milestone/8) | Cuenta opcional | RF-AUTH-* (salvo RF-AUTH-05) | Tests de integración y flujo manual de registro, login y logout |
| F8 | [Sync](https://github.com/ivomiyashiro/onerm/milestone/9) | Respaldo, restauración, multidispositivo y unión de los datos del invitado | RF-SYNC-*, RF-AUTH-05 · RNF-04, 05, 10, 12 | Idempotencia, convergencia con dos clientes simulados, pull de más de 500 filas en la misma ventana y unión del invitado sin duplicar ni perder filas |
| F9 | [Cierre](https://github.com/ivomiyashiro/onerm/milestone/10) | Should, accesibilidad, iOS y entrega | RNF-16..20, 22, 23 | Checklist de [etapa-2-entrega-final.md](etapa-2-entrega-final.md) completo y README según §7.4 |

## 3. Desglose de F5 (orden del flujo principal)

| Slice | Contenido | RF del TPO | Pantallas |
|---|---|---|---|
| F5a | Onboarding y perfil | RF01 | S05, S06, S21 (parte local) |
| F5b | Catálogo y rutinas | RF01 | S13–S17 |
| F5c | Entrenamiento con sugerencias, temporizador, pantalla encendida y hápticos | RF02, RF03 | S07–S12 |
| F5d | Progreso: historial, edición del pasado, e1RM, récords y volumen | RF04 | S18–S20 |

## 4. Stack decidido

| Área | Elección | Fuente |
|---|---|---|
| Framework | Expo (último SDK estable) con development build, Expo Router | ADR-0007 |
| Lenguaje | TypeScript en modo `strict` | — |
| Gestor de paquetes | bun | [convenciones.md](convenciones.md) |
| Base local | `expo-sqlite` + Drizzle ORM + `drizzle-kit` | ADR-0010 |
| Remoto | `@supabase/supabase-js`, Supabase CLI local para desarrollo y tests | ADR-0001 |
| Estado | ViewModels como hooks + Zustand + DI por Context | ADR-0011 |
| Dispositivo | `expo-notifications`, `expo-keep-awake`, `expo-haptics`, `expo-secure-store`, `expo-crypto`, `@react-native-community/netinfo` | ADR-0007 |
| Tests | Jest (`jest-expo`) + `@testing-library/react-native`. E2E con Maestro, opcional | RNF-12, RNF-15 |
| Calidad | ESLint + Prettier + `eslint-plugin-boundaries` | RNF-11 |
| CI | GitHub Actions: typecheck, lint y tests en cada PR | — |
| Se decide después | Librería de gráficos (F5d), Google Sign-In nativo (spike en F1, implementación en F7 porque es Should) | — |

## 5. Riesgos del plan

| Riesgo | Mitigación |
|---|---|
| La curva de aprendizaje de React Native retrasa F0–F2 | Los spikes de F1 son chicos y tienen tiempo acotado |
| La sync propia no llega a tiempo | Punto de control en el spike de F1 y plan B de ADR-0002 (librería) |
| Se acumula todo al final | F5 cierra los 4 RF antes de tocar la nube; auth y sync son soporte |
| Deriva entre la especificación y el código | Cada issue cita sus RF, RN y AC. Si el código revela un hueco, se corrige primero la especificación |

## Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-10-02 | Versión inicial: fases F0–F9, stack y criterios de salida. |
| 2026-10-02 | Revisión con dos jueces: dependencias en todas las cards, la unión del invitado pasa a F8 (necesita sync), el e1RM pasa a la primera card del motor, cards nuevas #52 (modo avión) y #53 (estados de UI), y `tools/board.sh`. |
| 2026-10-02 | Se adopta Kanban liviano: backlog completo de cards (#1–#16 y #18–#53), sin sprints ni estimaciones. |
