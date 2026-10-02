# 00 — Visión y alcance

## 1. Propósito del documento

Define **qué problema resuelve la app, para quién, qué entra en el MVP y qué no**. Es el marco contra el que se evalúa cualquier requisito nuevo: si no contribuye a un objetivo (`OBJ-NN`), no entra.

## 2. Problema

Las personas que entrenan fuerza en el gimnasio **no saben con qué peso, series y repeticiones hacer cada ejercicio** para seguir progresando sin lastimarse. Los novatos ni siquiera saben qué rutina seguir.

Hoy lo resuelven con notas del celular, papel, planillas, memoria, rutinas de Instagram o PDF, o pagando un personal trainer. Consecuencias:

- **Estancamiento o sobrecarga:** los aumentos de peso se deciden a ojo.
- **Datos perdidos o inutilizables:** anotar entre series es incómodo y los datos no quedan estructurados.
- **Costo:** la alternativa que funciona (un trainer) es cara.

### ¿Por qué móvil?

El registro sucede **en el gimnasio, entre series, con el celular en la mano**. No hay otro momento ni otro dispositivo para hacerlo. Además hay capacidades del teléfono que aportan valor:

- Temporizador de descanso con notificación y vibración.
- Pantalla siempre encendida durante el entrenamiento.
- Almacenamiento local.

No se usan GPS, cámara ni sensores porque no resuelven nada del problema.

## 3. Usuarios y contexto

- **Principal: el novato.** No sabe armar una rutina ni cuánto peso usar.
- **Secundario: intermedio o avanzado.** Arma sus propias rutinas y aprovecha los cálculos.

Detalle en [02-actores.md](02-actores.md).

**Contexto de uso:** gimnasio, interacciones de pocos segundos entre series (de 1 a 3 minutos de descanso), una sola mano libre y **señal mala o nula** (subsuelos, zonas sin cobertura). Offline First se justifica por este contexto.

## 4. Objetivos del producto

| ID | Objetivo | Cómo se verifica |
|---|---|---|
| OBJ-01 | Decirle al usuario **qué hacer hoy** (ejercicios, peso, series y repeticiones) sin que tenga que calcularlo. | Todo ejercicio de un entrenamiento tiene una sugerencia de carga o una instrucción de calibración. |
| OBJ-02 | Registrar un entrenamiento completo **en el gimnasio, con o sin señal**. | Confirmar una serie sugerida lleva 1 toque. Ninguna acción del entrenamiento requiere conexión. |
| OBJ-03 | Progresar de forma **segura y explicable**. | Toda sugerencia muestra su motivo, es decir, qué regla la produjo. |
| OBJ-04 | Que el historial **no se pierda**. | Con cuenta, los datos se respaldan y se restauran en otro dispositivo. No hay pérdida de datos en los escenarios offline definidos. |
| OBJ-05 | Ver **si el usuario progresa**. | Hay historial por ejercicio y evolución del 1RM estimado. |

## 5. Alcance del MVP

| Épica | Qué incluye (resumen) | Prioridad | Objetivos |
|---|---|---|---|
| AUTH | Invitado, registro y login con email, logout seguro, unión de datos del invitado · Google: Should | Must | OBJ-04 |
| SYNC | Respaldo automático, restauración, multidispositivo, edición y borrado propagados, estado de sync | Must | OBJ-04 |
| PERF | Onboarding (nivel, objetivo, días), recomendación de plantilla, unidades | Must | OBJ-01 |
| CAT | Catálogo de ejercicios canónico, búsqueda y filtros | Must | OBJ-01 |
| RUT | Plantillas, crear, editar y eliminar rutinas, rutina activa con rotación de días | Must | OBJ-01 |
| ENT | Entrenamiento en curso: registrar, editar y borrar series, descanso, retomar, finalizar | Must | OBJ-02 |
| SUG | Calibración, doble progresión, e1RM, ajuste por esfuerzo, descarga, "¿por qué?" | Must | OBJ-01, OBJ-03 |
| PROG | Historial, detalle, evolución del e1RM, récords | Must | OBJ-05 |
| Plataforma | Android (referencia del TPO). **iOS ejecutable** en el simulador, sin publicar (ADR-0012) | Must / Should | — |

El detalle y la prioridad de cada RF están en `03-requisitos/`.

## 6. Fuera de alcance (Won't en el MVP)

| Tema | Motivo |
|---|---|
| Eliminar la cuenta desde la app | Decisión del equipo. ⚠️ Google Play lo exige a las apps que permiten crear cuentas; no aplica porque no se publica. Se declara como limitación. |
| Confirmar el email al registrarse | Mejora futura (Q-01). Evita depender del límite de emails del SMTP de Supabase en el MVP. Limitación: se puede crear una cuenta con un email ajeno. |
| Sincronización en segundo plano con la app cerrada | Ver Q-04 |
| Ejercicios con lastre, asistidos o por tiempo (plancha) | Ver ADR-0005 |
| Nutrición, peso corporal y medidas | No es el problema |
| Parte social, compartir, rankings | No es el problema |
| Chat o recomendaciones con IA | El motor es determinista y explicable (OBJ-03) |
| Wearables, sensores, GPS, cámara | No aportan valor al problema |
| Videos de técnica | Costo de contenido. A lo sumo, un enlace de la fuente del catálogo |
| Periodización avanzada (bloques, ondulante) | Complejidad. El MVP tiene doble progresión y descarga |
| Modo coach/alumno | Otro producto |
| Cardio y superseries | Otro modelo de registro |
| Modo claro | Decisión de diseño (2026-10-01): la app es solo oscura en el MVP. El contraste se verifica sobre ese modo (RNF-17). Ver [diseno/marca.md](../diseno/marca.md). |

## 7. Supuestos

- El usuario tiene un teléfono Android y conexión **al menos de vez en cuando**, para respaldar.
- Cada usuario escribe **solo sus propios datos**. No hay datos compartidos entre usuarios, salvo el catálogo, que es de solo lectura.
- El catálogo lo mantiene el equipo con un seed (ADR-0004), no los usuarios.
- Pocos usuarios: proyecto académico, plan gratuito de Supabase.

## 8. Restricciones

- **TPO:** Android, MVVM y Clean Architecture, Offline First justificado, de 3 a 4 RF en la preentrega, demo y defensa individual.
- **Stack:** React Native con Expo (ADR-0007), SQLite local, Supabase (Auth + Postgres). Sin backend propio en el MVP (ADR-0001).
- **Equipo:** una persona con asistencia de IA. El alcance tiene que ser realizable. Si hay que recortar, primero van los Should y Could, **nunca el motor de sugerencias**.
- **IA:** todo el código tiene que poder explicarse en la defensa.

## 9. Riesgos principales

| Riesgo | Mitigación | Ref. |
|---|---|---|
| Sync con edición y multidispositivo es la parte más compleja | Last-write-wins por registro, borrado lógico, datos derivados sin sincronizar | ADR-0002 |
| Seguridad basada solo en RLS | Políticas por usuario y tests con dos usuarios | ADR-0001 |
| Plan gratuito de Supabase: pausa por inactividad y límite de emails | Chequeo antes de la demo; Q-01 | ADR-0001 |
| Calidad y licencia de los datos de wger | Modelo canónico, curaduría y atribución | ADR-0004 |
| Alcance para una sola persona | MoSCoW estricto. Pasaron a **Should** las piezas de mayor riesgo: Google (RF-AUTH-04) y la recepción continua de cambios de otro dispositivo (RF-SYNC-02); la restauración sigue siendo Must. **Plan B** de sync (ADR-0002): si al terminar el spike de sync no están cubiertos los casos de RF-SYNC-05, se evalúa una librería | ADR-0002 |
| Apropiación previa de cuentas sin email confirmado | No se vinculan identidades (RN-AUTH-03) y se verifica en el spike | ADR-0001 R10 |
| Temporizador con la pantalla bloqueada impreciso en algunos Android | Hora de fin absoluta; tolerancia declarada | RNF-23 |
| Pérdida del entrenamiento en curso si se rompe o se pierde el teléfono durante el entrenamiento | Riesgo aceptado: el entrenamiento en curso vive solo en el dispositivo y se respalda al finalizarlo. Sobrevive a cierres de la app y reinicios | RN-SYNC-13 |
| Fuerza sin ejercicios con barra en las plantillas | Limitación declarada en S06 y S14; el usuario puede crear su rutina | 11 §7 |
