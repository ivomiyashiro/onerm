# ADR-0010 — Base local: expo-sqlite + Drizzle ORM

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** 07-datos-y-sincronizacion, ADR-0002, RNF-02, TPO §4.12

## Contexto

Los datos son **relacionales**: rutina → días → ejercicios; entrenamiento → ejercicios → series. Se consultan con filtros y agregaciones (historial, progreso, volumen). La base local es la **fuente de verdad** (ADR-0002). El TPO espera Room o una "base local estructurada equivalente, justificada".

## Decisión

**expo-sqlite** como motor y **Drizzle ORM** para el esquema tipado, las consultas y las migraciones. Es el análogo en React Native de Room en Android, o de sqflite + drift en Flutter.

- El esquema se define en TypeScript (`schema.ts`), del que salen los tipos de las filas.
- Las migraciones se generan con `drizzle-kit`, se incluyen en la app y se aplican al iniciar.
- Consultas **reactivas** (live queries y listeners de cambios) para que los repositorios expongan `observe…()`.
- Modo WAL y **una transacción por operación de dominio**. Por ejemplo, borrar un entrenamiento marca sus hijos en la misma transacción (I-07).

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| **expo-sqlite + Drizzle** (elegida) | SQL real, tipado, migraciones, módulo oficial de Expo, liviano | Drizzle en móvil es más nuevo que en servidor |
| expo-sqlite "a mano" (SQL crudo) | Cero dependencias | Sin tipos ni migraciones gestionadas. Propenso a errores |
| WatermelonDB | Reactivo, trae su propio protocolo de sync | Más pesado. Impone su modelo y su sync, que es justo lo que queremos diseñar y explicar (ADR-0002) |
| op-sqlite | Muy rápido (JSI) | No es un módulo oficial de Expo. El rendimiento extra no hace falta con este volumen |
| Realm | Base de objetos | MongoDB discontinuó su sync (Atlas Device Sync) en 2024. Riesgo de mantenimiento |
| AsyncStorage / MMKV | Simples | Clave-valor: no sirve para datos relacionales ni consultas |

## Consecuencias

- ✅ Tipos de punta a punta: esquema → mappers → modelos de dominio.
- ✅ En la defensa se explica como "el Room de React Native".
- ⚠️ Los mappers fila ↔ dominio son explícitos: más código, pero la capa de dominio queda limpia de detalles de la base.
- ⚠️ `expo-sqlite` abre sin WAL y sin claves foráneas: hay que activarlos con PRAGMA en cada apertura. Validado en el [spike #11](../../spikes/11-sqlite-drizzle.md), junto con los tests de integración sobre `better-sqlite3`.
