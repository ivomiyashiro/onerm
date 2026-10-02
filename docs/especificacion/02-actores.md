# 02 — Actores

## Actores humanos

| Actor | Descripción | Puede |
|---|---|---|
| **Invitado** | Usa la app sin cuenta. Los datos quedan solo en el dispositivo. | Todo lo relacionado con entrenar: rutinas, entrenamientos, sugerencias y progreso. **No** tiene respaldo ni multidispositivo. |
| **Usuario registrado** | Tiene cuenta (email y contraseña, o Google). | Lo mismo que el invitado, más respaldo, restauración y uso en varios dispositivos. |
| **Mantenedor** | El equipo. Mantiene el catálogo y las plantillas. | Correr el seed del catálogo (ADR-0004) y publicar plantillas. No usa la app como actor. |

"Usuario" sin calificar, en un requisito, quiere decir **invitado o usuario registrado**.

## Perfiles de usuario (personas)

Los perfiles no son actores distintos: los dos pueden ser invitados o registrados. Cambian las **preferencias por defecto** y el **lenguaje** de la interfaz.

### Novato (principal)

- **Quién:** entrena de forma regular hace menos de 6 meses, o vuelve después de más de 6 meses sin entrenar (RN-PERF-07).
- **Objetivo:** saber qué hacer y con cuánto peso, sin tener que estudiar.
- **Frustraciones:** no sabe qué rutina seguir, copia de Instagram, sube de peso a ojo o nunca sube, no entiende términos como RIR o 1RM.
- **Cómo lo atiende la app:** plantillas, sugerencias precargadas, escala de esfuerzo simple y explicaciones en lenguaje llano.

### Intermedio o avanzado (secundario)

- **Quién:** intermedio, entre 6 meses y 2 años de entrenamiento regular; avanzado, más de 2 años y arma sus rutinas (RN-PERF-07). En el MVP se comportan igual.
- **Objetivo:** armar su rutina y que alguien haga las cuentas de progresión y registro.
- **Frustraciones:** las planillas son incómodas en el gimnasio y otras apps son solo registro, sin progresión.
- **Cómo lo atiende la app:** creador de rutinas, RIR numérico, e1RM y la posibilidad de sobrescribir sugerencias.

## Actores de sistema

| Actor | Tipo | Rol |
|---|---|---|
| **Motor de sugerencias** | Interno (dominio, en el dispositivo) | Calcula sugerencias, e1RM, descargas y próximo día a partir del historial local. |
| **Motor de sincronización** | Interno (datos, en el dispositivo) | Hace push y pull contra Supabase y resuelve conflictos (ADR-0002). |
| **Supabase Auth** | Externo | Identidad: email y contraseña, OAuth de Google, tokens. |
| **Supabase Postgres** | Externo | Respaldo remoto con RLS, más el catálogo publicado. |
| **Google** | Externo | Proveedor de identidad (OAuth). |
| **Fuente de catálogo (wger, etc.)** | Externo | **Solo durante el seed**, nunca en tiempo de ejecución de la app (ADR-0004). |
| **Sistema operativo Android** | Externo | Notificaciones del temporizador, pantalla encendida, hápticos y almacenamiento seguro de tokens. |
