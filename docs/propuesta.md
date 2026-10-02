# Propuesta — resumen (borrador)

> Resumen del brainstorming inicial. No es todavía la preentrega: sirve como base para después especificar en detalle y redactar los entregables de la Etapa 1 (ver `etapa-1-preentrega.md`).

## La idea en una línea

Un entrenador personal de bolsillo: te dice qué hacer hoy (ejercicio, peso, series, repeticiones) según cómo venís entrenando, y te deja registrarlo con un toque, aunque no haya señal.

## Problema

Las personas que entrenan fuerza en el gimnasio no saben con qué peso, series y repeticiones hacer cada ejercicio para seguir progresando sin lastimarse. Los novatos ni siquiera saben qué rutina seguir. Hoy lo resuelven con notas, papel, rutinas de Instagram o un personal trainer caro. El resultado es estancamiento, subas de peso arbitrarias y datos perdidos.

| Pregunta (§4.1) | Respuesta tentativa |
|---|---|
| ¿Cómo se resuelve hoy? | Notas del celular, planillas de Excel, papel, memoria, rutinas de PDF o Instagram, o un personal trainer (caro). |
| ¿Qué dificultades tiene? | Anotar entre series es incómodo, los datos no quedan estructurados, nadie te dice cuánto subir y el trainer cuesta plata. |
| ¿Por qué móvil? | El registro se hace en el gimnasio, entre series y con el celular en la mano. No existe otro momento ni otro dispositivo para hacerlo. |

## Usuarios

- **Principal: el novato.** No sabe armar una rutina ni cuánto peso usar, y es quien más necesita la sugerencia.
- **Secundario: intermedio o avanzado.** Ya sabe entrenar, quiere armar su propia rutina y aprovechar los cálculos.
- **Un mismo núcleo para los dos:** registro, sugerencias y progreso. Solo cambia de dónde sale la rutina (plantilla o creada por el usuario).

## Contexto de uso (el punto fuerte)

- En el gimnasio, entre series (1 a 3 minutos), con una sola mano y la otra ocupada o transpirada.
- Interacciones de segundos, mientras la atención está en entrenar.
- Señal mala o nula (subsuelos). **Offline First se justifica por el problema, no para cumplir.**
- Mark Weiser: la app ya sabe qué toca hacer y el usuario solo confirma o ajusta.

## ¿Por qué móvil?

El registro ocurre en el gimnasio, en el momento, y no existe otro dispositivo ni otro momento para hacerlo. Además hay capacidades del teléfono que aportan valor real:

- ✅ Temporizador de descanso con notificación y vibración (avisa aunque la pantalla esté bloqueada).
- ✅ Pantalla siempre encendida durante la sesión.
- ✅ Almacenamiento local (núcleo del Offline First).
- ❌ **Sin GPS, cámara ni sensores:** no resuelven nada del problema, y así lo vamos a defender.

## Solución

1. **Rutinas:** plantillas predefinidas para novatos y un creador mínimo para avanzados (elegir ejercicios del catálogo, series y rango de repeticiones).
2. **Motor de sugerencias, completo, con reglas deterministas y explicables:**
   - **Doble progresión:** si llegás al tope del rango de repeticiones, sube el peso y vuelve al piso del rango.
   - **1RM estimado (Epley/Brzycki):** para sugerir la carga y medir el progreso.
   - **RIR/RPE:** para ajustar la sugerencia según cuánto costó la serie.
   - **Descarga automática:** si fallás varias sesiones seguidas.
   - **Calibración en la primera sesión:** para resolver el arranque sin historial.
3. **Registro rápido:** valores precargados con la sugerencia, un toque para confirmar cada serie y se guarda al instante en local.
4. **Progreso:** historial y evolución del 1RM estimado por ejercicio.

¿Por qué reglas y no IA? Se pueden explicar en la defensa ("¿por qué te sugirió 62,5 kg?"), son lógica de dominio pura y testeable, y funcionan sin conexión.

## Borrador de requisitos funcionales

| RF | Qué hace | Criterio clave |
|---|---|---|
| RF01 | Seleccionar o crear una rutina | Queda disponible sin conexión |
| RF02 | Registrar la sesión (series, peso, repeticiones, RIR) | Cada serie persiste al confirmarse, sin red o si se cierra la app |
| RF03 | Sugerencia de carga | Si se completa el tope del rango, sube el peso según la regla |
| RF04 | Ver el progreso | Incluye lo registrado offline |

## Datos y Offline First

- **La fuente de verdad durante el entrenamiento es la base local.** Todo se escribe primero ahí.
- **Remoto:** Supabase para autenticación y respaldo en la nube del historial. El catálogo de ejercicios puede venir de la API de wger o de una base propia en Supabase.
- **Sincronización** al recuperar conexión. Hay pocos conflictos porque cada usuario escribe solo sus datos y las series son append-only.
- **El motor de sugerencias corre en el dispositivo**, porque tiene que funcionar sin red. Además es lógica de dominio pura y testeable, así que la capa de dominio de Clean Architecture tiene un sentido real.

## Stack (tentativo)

- **App:** React Native, probablemente con Expo. Base local SQLite, notificaciones, keep-awake y hápticos.
- **Nube:** Supabase.
- **Backend propio (NestJS / Hono / .NET): pendiente.** Si la app habla directo con Supabase (Auth + Postgres + RLS) y el motor corre en el dispositivo, **puede que el backend propio no tenga una responsabilidad clara**. El principio rector del TPO penaliza agregar tecnología sin un problema que la justifique. Usarlo solo si encontramos algo que le toque a él, por ejemplo lógica de sincronización, validación de servidor o que el catálogo lo maneje un admin.

## Fuera de alcance (V1)

Nutrición, parte social, chat con IA, wearables, videos de técnica, periodización avanzada, modo coach/alumno, cardio, superseries.

## Propuesta de valor

> **Problema → Usuario → Solución → Valor**
> No sé cuánto peso usar ni si progreso → novato en el gimnasio → app que te dice qué hacer hoy y lo registra con un toque, incluso sin señal → progresión constante y segura, sin pagar un personal trainer, con un historial que no se pierde.

El valor es de salud, económico y de experiencia.

---

## ⚠️ A tener en cuenta

1. **Equipo:** el TPO es en equipo y §4.15 pide integrantes con roles. La IA está permitida como herramienta, pero no cuenta como integrante. Confirmar con la cátedra si se puede hacer solo o si asignan compañero.
2. **Alcance siendo una sola persona:** con el motor completo, el creador de rutinas, la sincronización y un posible backend, el trabajo es bastante. Si algo tiene que ceder, recortar primero el backend propio y después el creador de rutinas (dejar solo editar plantillas). Las sugerencias no se tocan: son el diferencial.

## Próximos pasos

Especificar en detalle: reglas exactas del motor, modelo de datos, flujos y pantallas.
