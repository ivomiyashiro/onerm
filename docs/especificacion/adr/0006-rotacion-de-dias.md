# ADR-0006 — Rotación de días derivada del historial, con cambio manual

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** RF-RUT-04, RF-ENT-01, RN-RUT-01, RN-SUG-05, RN-SYNC-10

## Contexto

Una rutina tiene varios días (A, B, C…). Hay dos formas de decidir qué toca hoy:

- **Calendario fijo** (lunes A, miércoles B…): si faltás un día, el plan "se rompe".
- **Rotación**: toca el día siguiente al último que hiciste, entrenes cuando entrenes.

Además, el usuario quiere poder **elegir otro día manualmente**, por ejemplo si la máquina está ocupada o si prefiere hacer piernas hoy.

## Decisión

1. **Rotación circular:** el próximo día es el siguiente al día del **último entrenamiento finalizado** de la rutina activa (A → B → C → A…).
2. **El próximo día es un dato derivado:** se calcula a partir del historial y **no se guarda** como un puntero (RN-SYNC-10).
3. Antes de iniciar un entrenamiento, el usuario **puede elegir cualquier día** de la rutina. La rotación sigue desde el día que realmente hizo.
4. **La progresión no depende del día:** se lleva por **ejercicio de rutina**, con el e1RM del **ejercicio** como base común (ver R2).

## Riesgos del cambio manual y mitigaciones

| # | Riesgo | Ejemplo | Mitigación |
|---|---|---|---|
| R1 | **Desbalance:** el usuario siempre evita el mismo día. | Nunca hace el día de piernas. | La opción por defecto es siempre la rotación. El selector muestra "hace N días" por cada día. *Could:* avisar si un día no se hizo en dos vueltas de la rotación. |
| R2 | **Progresión atada al día:** el mismo ejercicio aparece en dos días con prescripciones distintas. | Sentadilla 5×5 pesada el día A y 3×10 liviana el día C. | La doble progresión se lleva **por ejercicio de rutina** (el de A y el de C son independientes). El e1RM es **por ejercicio**, y se usa para estimar la carga cuando un ejercicio de rutina no tiene historial propio. Cambiar el orden de los días no altera nada. |
| R3 | **Falsas descargas:** saltearse días parece un estancamiento. | Hace A, A, A y nunca B. | Estancamiento y descarga cuentan **entrenamientos realizados de ese ejercicio**, no fechas ni vueltas. No hacer algo no es fallar. |
| R4 | **Inactividad prolongada:** vuelve después de semanas y la sugerencia es demasiado pesada. | Tres semanas sin entrenar; se sugiere la carga de la última vez + incremento. | **Reentrada** (RN-SUG-05): se basa en los días **sin entrenar en general**, no en los días sin hacer ese ejercicio. Así no se dispara en rotaciones largas normales (RF-SUG-06 AC3). |
| R5 | **Dos dispositivos sin conexión** calculan el próximo día por separado. | En A y en B se hace el día A. | Al ser un dato derivado, se recalcula después de sincronizar. Se conservan los dos entrenamientos y no hay conflicto. |
| R6 | **Se edita la rutina** y desaparece el día que tocaba. | Se borra el día C después de hacer el día B. | RN-RUT-01: se usa la `position` del día del último entrenamiento, aunque esté borrado, y se toma el siguiente día **vivo** en forma circular. Borrar C después de hacer B da D. Borrar B después de hacer B da C. |
| R7 | **Cambiar de día con un entrenamiento en curso.** | Empezó A y quiere pasar a B. | Hay como máximo un entrenamiento en curso. Para cambiar hay que finalizarlo o descartarlo. |
| R8 | **Editar o borrar un entrenamiento pasado** cambia el próximo día. | Borra el último entrenamiento (B) y el próximo pasa a ser B de nuevo. | Es el comportamiento correcto y consistente, porque el dato se deriva del historial. |

## Conclusión

Con el próximo día derivado y la progresión por ejercicio (no por día), **el cambio manual es de bajo riesgo** y se incluye como Must. El único riesgo de producto real es el desbalance (R1), y se mitiga en la interfaz, sin restringir al usuario.
