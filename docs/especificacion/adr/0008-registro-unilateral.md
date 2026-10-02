# ADR-0008 — Registro de series unilaterales por lado

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** RF-ENT-03, RN-ENT-05, RN-ENT-06, ADR-0004 (`isUnilateral`), RF-SUG-03 AC5, caso F

## Contexto

En los ejercicios unilaterales (remo a una mano, sentadilla búlgara, curl alternado), cada lado puede rendir distinto en la misma serie: 10 repeticiones con el derecho y 8 con el izquierdo, o el mismo número con distinto esfuerzo. Si se registra un solo número:

- El historial **miente**: se pierde la asimetría.
- El motor **sobreestima** el lado débil: sugiere subir la carga cuando uno de los lados no llegó al tope.

Al mismo tiempo, en la mayoría de las series **los dos lados son iguales**, y el registro no puede volverse más lento por un caso minoritario (OBJ-02).

## Decisión

1. **Modelo:** en un ejercicio con `isUnilateral = true`, una **serie** guarda **una carga** y **repeticiones y esfuerzo por lado** (`left`, `right`). Una serie es la unidad que dispara el descanso. La carga es la misma en ambos lados, porque se usa la misma mancuerna o máquina.
2. **Interfaz:** por defecto, un solo valor que se aplica a ambos lados: 1 toque, igual que un ejercicio bilateral. La acción **"Distinto por lado"** divide los campos.
3. **Convención de carga:** en los ejercicios unilaterales y en todos los ejercicios con mancuernas, la carga se registra **por mancuerna o por lado**, nunca como suma (RN-ENT-05). La etiqueta lo dice explícitamente.
4. **Motor:** usa el **lado limitante**, el de menos repeticiones y, si empatan, el de mayor esfuerzo (RN-ENT-06), para la progresión y el e1RM. Es la opción conservadora: no se sube la carga hasta que **ambos** lados lleguen al tope.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| **Serie con valores por lado** (elegida) | Refleja la realidad, un toque en el caso común, motor conservador | El modelo y la interfaz tienen una variante |
| Un número por serie ("el peor lado") | Simple | Pierde información. El usuario tiene que calcular mentalmente |
| Dos series separadas (una por lado) | Reusa el modelo bilateral | Duplica los toques, rompe el temporizador (¿descansa entre lados?) y confunde el conteo de series para el volumen |
| Carga distinta por lado | Máxima flexibilidad | Caso muy raro. Complica el e1RM. Won't |

## Consecuencias

- ✅ El motor no sube la carga antes de que el lado débil esté listo, lo que es más seguro.
- ✅ *Could* a futuro: mostrar la asimetría en el progreso.
- ⚠️ La tabla de series admite repeticiones y esfuerzo nulos por lado en los ejercicios bilaterales (o columnas separadas). El diseño exacto se define en `07-datos-y-sincronizacion.md`.
- ⚠️ Para el volumen semanal, una serie unilateral cuenta como **1 serie** por músculo, igual que en la literatura.
