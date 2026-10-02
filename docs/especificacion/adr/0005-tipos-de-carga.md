# ADR-0005 — Tipos de carga del MVP: externa y peso corporal

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** RF-SUG-09, RN-SUG-12, RF-PROG-04, RF-CAT, ADR-0004

## Contexto

El motor de sugerencias trabaja con **carga × repeticiones**. No todos los ejercicios tienen una carga externa:

| Variante | Ejemplo | Cómo se mide la dificultad |
|---|---|---|
| **a. Carga externa** | Press de banca, jalón al pecho, prensa | Kilos de la barra, mancuerna o máquina |
| **b. Peso corporal** | Flexiones, dominadas, fondos | Repeticiones; la carga es el propio cuerpo |
| c. Peso corporal + lastre | Dominadas con cinturón y disco | Peso corporal + lastre |
| d. Asistido | Dominada en máquina asistida o con banda | Peso corporal **menos** la asistencia (carga negativa) |
| e. Isométrico o por tiempo | Plancha | Segundos, no repeticiones |

### ¿Cuánto complica cada una?

| Componente | a. Externa | b. Peso corporal | c. Lastre / d. Asistido | e. Por tiempo |
|---|---|---|---|---|
| Registro | carga + reps | solo reps | reps + lastre o asistencia | segundos |
| Doble progresión | reps → carga | **solo reps**: al tope no hay "más peso" | la carga sube (lastre) o baja (asistencia) | otra métrica |
| e1RM | ✅ | ❌ sin peso corporal no tiene sentido | requiere el **peso corporal del usuario** e historial de ese peso | ❌ |
| Progreso | e1RM, carga | máximo de reps, reps totales | e1RM con peso corporal | tiempo |
| Calibración | buscar la carga | "hacé las que puedas dejando 1–2 en reserva" | buscar el lastre o la asistencia | buscar el tiempo |
| **Costo** | base | **bajo** (una rama en el motor) | **alto** (dato nuevo de usuario, carga negativa, e1RM compuesto) | **alto** (otro modelo de registro) |

## Decisión

- El modelo tiene el campo **`loadType`** desde el principio, para poder extenderlo.
- El MVP soporta:
  - **a. Carga externa**, completa: doble progresión, e1RM y descarga.
  - **b. Peso corporal**, con **progresión solo por repeticiones**: sumar repeticiones hasta el tope del rango. Al llegar al tope en todas las series, el motor lo indica ("Estás listo para una variante más difícil") en lugar de sugerir peso. Sin e1RM. El progreso muestra el máximo de repeticiones y las repeticiones totales.
- **Quedan fuera (Won't):** c, d y e. El seed los rechaza (ADR-0004, R5).
- **Las plantillas para novatos priorizan los ejercicios de carga externa**, por ejemplo jalón al pecho en lugar de dominadas. Muchos novatos no pueden hacer ni una dominada, y además con carga externa el motor funciona completo.

## Consecuencias

- ✅ El catálogo puede incluir flexiones y fondos sin romper el motor.
- ✅ No hay que pedirle al usuario su peso corporal (fuera de alcance).
- ⚠️ La interfaz de registro y el gráfico de progreso tienen dos variantes según `loadType`.
- ⚠️ Un avanzado que hace dominadas con lastre no puede registrarlo en el MVP. Es una limitación conocida.

## Cuándo revisar esta decisión

- Si el público intermedio o avanzado lo pide: sumar c y d requiere guardar el peso corporal del usuario y su historial.
