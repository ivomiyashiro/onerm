# ADR-0001 — La app habla directo con Supabase, sin backend propio

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** RF-AUTH-*, RF-SYNC-*, RNF-06..09, RNF-11, ADR-0002

## Contexto

La app necesita autenticación (email y contraseña, Google) y un respaldo remoto con sincronización. Se consideró un backend propio (NestJS, Hono o .NET) entre la app y la base.

El TPO **penaliza agregar tecnología sin un problema que la justifique**. Ver qué responsabilidades tendría un backend:

| Responsabilidad | ¿Hace falta un backend propio? |
|---|---|
| Autenticación | No: Supabase Auth |
| Aislamiento de datos entre usuarios | No: RLS de Postgres |
| Validación de datos | No: constraints (CHECK, NOT NULL, FK) y triggers |
| Sync atómica por lotes, LWW en el servidor | No necesariamente: funciones de Postgres (RPC) |
| Motor de sugerencias | No: corre en el dispositivo (offline) |
| Catálogo | No: un seed desde la máquina del mantenedor (ADR-0004) |

No queda ninguna responsabilidad que sea exclusiva de un backend propio.

## Decisión

La app se comunica **directo con Supabase** (Auth + PostgREST) con `supabase-js`, **encapsulado detrás de interfaces de la capa de datos** (`RemoteDataSource`, `AuthRepository`). La lógica de servidor necesaria se implementa en Postgres: RLS, constraints, triggers y, si hace falta atomicidad en la sync, funciones RPC.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| **Supabase directo** (elegida) | Menos infraestructura, sin deploy ni hosting propio, auth resuelta, RLS probado | La seguridad depende de configurar bien RLS; el cliente queda acoplado al esquema |
| Backend propio (NestJS, Hono o .NET) + Supabase como base | Validación y lógica centralizadas, contrato de API versionable, "networking" explícito para la defensa | Otro servicio para desarrollar, hostear y mantener; más latencia; **sin un problema que lo justifique** hoy; riesgo de "tecnología para cumplir" |
| Supabase Edge Functions para todo | Lógica en el servidor sin hostear nada | Innecesario hoy; queda como escape (ver "Cuándo revisar") |

## Consecuencias

- ✅ Menos piezas: el tiempo va al motor de sugerencias y a la sync, que son el valor.
- ✅ La topología de infraestructura del TPO queda simple y fácil de explicar: App ↔ Supabase (Auth + Postgres).
- ⚠️ Parte de la "lógica de servidor" vive en SQL (RLS, triggers, RPC). Hay que versionarla como migraciones en el repo.
- ⚠️ La app depende del esquema de la base. Se mitiga con la capa de datos.

## Riesgos y mitigaciones

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | **RLS mal configurada** expone datos de otros usuarios. | RLS en **todas** las tablas de usuario con la política `user_id = auth.uid()`. Tests automatizados con dos usuarios (RNF-06). Revisar el Security Advisor de Supabase. |
| R2 | **Sin validación de servidor**, un cliente con errores o malicioso inserta datos inválidos (peso negativo, repeticiones = 0). | Constraints en Postgres. `user_id` con valor por defecto `auth.uid()` y no editable. Validación también en el dominio. |
| R3 | **Acoplamiento al esquema:** un cambio de tabla rompe versiones viejas instaladas, porque en móvil no se puede forzar la actualización. | Solo migraciones **aditivas**. Las operaciones complejas (sync) van en RPC, que funciona como contrato estable. `RemoteDataSource` aísla el resto de la app. |
| R4 | La lógica de sync queda en el cliente y se vuelve compleja. | Diseño explícito (ADR-0002). Tests con un remoto falso. LWW aplicado en el servidor mediante RPC o trigger. |
| R5 | **Dependencia de Supabase** (vendor lock-in). | Puertos y adaptadores: el dominio no conoce Supabase (RNF-11). Cambiar de proveedor implica reescribir solo los adaptadores. |
| R6 | **Plan gratuito:** el proyecto **se pausa tras ~7 días sin actividad**, y el SMTP incluido tiene un **límite muy bajo de emails por hora**. Cualquiera de los dos puede arruinar la demo. | Checklist antes de la demo: verificar que el proyecto esté activo. La confirmación de email está desactivada en el MVP (Q-01). |
| R7 | **Google Sign-In en RN** requiere un development build (no funciona en Expo Go), un cliente OAuth y la huella SHA-1 configurados. | Hacer un *spike* temprano. Email y contraseña es el camino principal para la demo. |
| R8 | **Defensa:** el TPO nombra Retrofit (networking explícito) y el SDK "esconde" las llamadas HTTP. | Poder explicar que `supabase-js` hace HTTP/REST contra PostgREST y GoTrue. `RemoteDataSource` es la frontera de networking. Mostrar el tráfico en la demo. |
| R9 | La `anon key` va incluida en la app. | Es pública por diseño; lo que protege es RLS. La `service_role` nunca entra en la app (RNF-08). |
| R10 | **Apropiación previa de cuentas:** sin confirmar el email, alguien podría registrarse con el email de otra persona. Si después esa persona entra con Google y las identidades se vinculan solas, quedaría en una cuenta cuya contraseña conoce el atacante. | RN-AUTH-03: **no se vinculan identidades**, y un email tiene un único método de ingreso. **Resultado del [spike #16](../../spikes/16-google-sign-in.md) (2026-10-03):** Supabase **sí** vincula sola una identidad de Google con el email verificado a una cuenta con contraseña. Mitigación elegida: un trigger `BEFORE INSERT` en `auth.identities` que rechaza una identidad de otro proveedor para el mismo usuario. Se verificó en local: la vinculación falla y no se crea la sesión. El cliente recibe un error genérico, así que para los mensajes de RN-AUTH-03 hace falta además una función `security definer` que devuelva el método de ingreso de un email (revela si existe, aceptado en RN-AUTH-02). Pendiente en #40: confirmar que el proyecto en la nube permite el trigger. Si no lo permite, un Auth Hook; si tampoco, Google queda fuera del MVP (es Should). |
| R11 | La sesión de Supabase puede superar el límite de tamaño de `expo-secure-store`. | Se guarda cifrada con una clave AES que vive en secure-store (07 §1.1, RNF-07). |

## Cuándo revisar esta decisión

Si aparece lógica que **no puede correr en el cliente**, por ejemplo:

- Secretos de APIs de terceros.
- Cálculos que el usuario no debe poder alterar.
- Notificaciones push programadas desde el servidor.
- Administración del catálogo desde una interfaz.
- Integraciones con otros servicios.

**Primer paso:** Supabase Edge Functions. **Backend propio** (NestJS, Hono o .NET) solo si esas responsabilidades crecen lo suficiente para justificar un servicio.
