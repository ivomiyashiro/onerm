# ADR-0011 — MVVM + Clean Architecture en React Native: ViewModel como hook, Zustand y DI por Context

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** 12-arquitectura, RNF-11, RNF-12, TPO §4.11

## Contexto

El TPO exige MVVM, Clean Architecture y gestión explícita del estado. En React Native no existe una clase `ViewModel` oficial como en Android. Hay que definir **qué pieza cumple ese rol** y cómo se conectan las capas.

## Decisión

1. **ViewModel = un hook propio por pantalla** (`useXViewModel`). Hace lo mismo que un ViewModel de Android:
   - Expone un **estado explícito** (unión discriminada: `loading`, `content`, `empty`, `error`…).
   - Expone **acciones**.
   - Llama a **casos de uso**. Nunca a repositorios ni SDKs de forma directa.
   - No contiene JSX. La vista solo renderiza el estado y llama acciones.
2. **Estado global en Zustand**, solo para lo que comparten varias pantallas: dueño de los datos (invitado o usuario), estado de sync, entrenamiento en curso y temporizador. Equivale al estado compartido de un `StateFlow` de Android.
3. **Datos persistentes:** la fuente de verdad es SQLite. Los ViewModels se **suscriben** a `repository.observe…()` a través de los casos de uso. No se duplican en stores globales.
4. **Inyección de dependencias:** un *composition root* (`src/di`) crea las implementaciones (repositorios, data sources, sync) y las provee por **React Context**. En los tests se inyectan versiones falsas.
5. **Casos de uso:** son funciones o clases del dominio que reciben interfaces de repositorio por constructor.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| **Hooks ViewModel + Zustand + Context DI** (elegida) | Poco código repetitivo, idiomático en React, fácil de mapear a MVVM en la defensa | La disciplina de capas depende del lint (RNF-11) |
| Redux Toolkit | Muy estructurado, con devtools | Mucho código repetitivo para un equipo de una persona |
| MobX (ViewModel como clase observable) | Parecido a MVVM clásico | Otro paradigma (observables mutables) para aprender a la vez que RN |
| TanStack Query | Excelente para datos del servidor | Nuestros datos son **locales** (fuente de verdad en SQLite). Resuelve otro problema |
| Lógica en los componentes | Rápido al principio | Rompe MVVM y la capacidad de prueba. Descartado por el TPO |

## Mapa para la defensa (Android → este proyecto)

| Android (Kotlin) | Este proyecto |
|---|---|
| Composable | Componente RN |
| `ViewModel` + `StateFlow<UiState>` | `useXViewModel()` → `{ state, actions }` |
| `sealed class UiState` | Unión discriminada en TypeScript |
| Hilt / Koin | Composition root + React Context |
| Room DAO + `Flow` | Drizzle + `observe…()` |
| Retrofit | `supabase-js` (HTTP/REST contra PostgREST) dentro de `RemoteDataSource` |
| Navigation Compose | Expo Router |
