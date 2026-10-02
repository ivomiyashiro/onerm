# ADR-0009 — Motor de sugerencias como función pura sobre el historial

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** RF-SUG-*, RN-SUG-*, RN-SYNC-10, RNF-11, RNF-12, ADR-0002, ADR-0006

## Contexto

El motor tiene que:

- **Funcionar sin conexión** (RNF-01).
- Dar **siempre el mismo resultado** con los mismos datos, para poder explicarlo y probarlo (OBJ-03).
- Reflejar **ediciones del pasado** y datos que llegan de otro dispositivo sin lógica especial (RF-SYNC-04, RN-SYNC-10).
- Resolver reglas con memoria: el estancamiento cuenta exposiciones seguidas, y la descarga y la reentrada reinician ese conteo.

## Decisión

1. El motor vive en la **capa de dominio**, en TypeScript puro, **sin dependencias** de React, SQLite, Supabase ni Expo (RNF-11).
2. Es un **fold (reducer) determinista** sobre las exposiciones de un ejercicio de rutina, en orden cronológico:

   ```ts
   // ERR: exposiciones del ejercicio de rutina (doble progresión) · EE: exposiciones del ejercicio (e1RM, historial alternativo)
   type Exposure = { finishedAt: Date; sets: EffectiveSet[]; prescription: Prescription };
   type EngineState = { workingLoad; bestMark; stagnationCount; lastSuggestionCode; recentEffort; /* … */ };

   const step = (state: EngineState, exposure: Exposure): EngineState => { /* RN-SUG */ };
   const suggest = (
     state: EngineState,
     ctx: { today: LocalDate; workoutDates: { startedAt; finishedAt }[]; prescription; increment; unit; minLoad; exerciseExposures: Exposure[] }  // RN-SUG-17
   ): Suggestion => { /* RN-SUG, orden de decisión */ };

   // uso: el fold recalcula también qué se sugirió en cada punto (para reinicios y consolidación), sin guardarlo
   const state = routineExposures.reduce(step, initialState);
   const suggestion = suggest(state, ctx);
   ```

3. **Nada del motor se persiste** (RN-SYNC-10): el estado se recalcula cada vez desde el historial local. Con el volumen esperado (cientos de exposiciones por ejercicio), el cálculo tarda milisegundos.
4. Cada `Suggestion` incluye un **motivo estructurado** (código + parámetros), no un texto. La capa de presentación lo convierte en texto para el novato o el avanzado (RN-SUG-11).
5. Los parámetros numéricos (porcentajes, umbrales) son **constantes nombradas en un solo lugar** (RN-SUG-00).

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| **Fold puro, sin persistir** (elegida) | Determinista, testeable con tablas de casos, sin conflictos de sync, las ediciones se reflejan solas | Recalcula cada vez (costo despreciable) |
| Estado del motor persistido y actualizado de forma incremental | Menos cálculo | Hay que invalidarlo cuando se editan datos pasados o llegan datos de otro dispositivo, y sincronizarlo. Contradice ADR-0002 |
| Motor en el servidor | Se actualiza sin publicar la app | No funciona sin conexión. Descartado |
| Modelo de ML | Personalización | No es explicable, necesita datos y no funciona sin conexión. Fuera de alcance |

## Consecuencias

- ✅ Los casos resueltos de [sugerencias.md](../03-requisitos/sugerencias.md#casos-de-referencia) se vuelven **tests unitarios** directamente (RNF-12).
- ✅ La capa de dominio de Clean Architecture tiene contenido real: es el mejor ejemplo para la defensa.
- ⚠️ Hay que definir bien el **orden** y la **granularidad** de las exposiciones (RN-SUG-01).
