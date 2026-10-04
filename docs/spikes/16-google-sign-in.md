# Spike 16 — ¿Se puede entrar con Google de forma nativa en el development build y pasar el ID token a Supabase Auth?

- **Issue:** #16
- **Fecha:** 2026-10-03
- **Tiempo acotado:** 4 horas · **Tiempo real:** 1,5 horas (sin contar la creación de los clientes OAuth, que hizo el usuario)
- **ADR / RNF relacionados:** RF-AUTH-04 (Should), RN-AUTH-03, ADR-0007 R3, ADR-0001 R7 y R10, ADR-0012

## Pregunta

ADR-0007 R3 y ADR-0001 R7 piden validar temprano el login nativo con Google, porque configurar el cliente OAuth y la huella SHA-1 es engorroso. Además hay que confirmar que un email con cuenta de contraseña no se vincula automáticamente a Google (RN-AUTH-03).

## Criterio de éxito

- [x] Cliente OAuth de Android (SHA-1 del keystore de debug) y cliente web en Google Cloud.
- [x] Login con Google en el emulador con una librería nativa y `signInWithIdToken` en Supabase.
- [x] Verificado lo que pasa con un email que ya tiene cuenta con contraseña (RN-AUTH-03). **Supabase sí los vincula solo**: hace falta una regla en la base.
- [x] Pasos de configuración documentados.

## Qué se hizo

**Versiones:** `@react-native-google-signin/google-signin` 16.1.5 (con su config plugin), `@supabase/supabase-js` 2.117.2, el Supabase local de #12 y el emulador `OneRM_API35` (Android 15 con Google Play Services), con una cuenta de Google de prueba.

1. `GoogleSignin.configure({ webClientId })` con el **Client ID web**: así el ID token sale con ese cliente como audiencia, que es la que valida Supabase. El Client ID de Android no aparece en el código: Google lo identifica por el paquete y la SHA-1.
2. `GoogleSignin.signIn()` → `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`.
3. En `supabase/config.toml`, `[auth.external.google]` con `enabled = true`, `client_id` = el Client ID web y `skip_nonce_check = true`, que el CLI exige para Google en local. **No hizo falta el Client secret**: con `signInWithIdToken` no hay intercambio de código.
4. RN-AUTH-03 en los dos sentidos:
   - email con cuenta de Google y después registro con contraseña;
   - email con cuenta de contraseña y después «Continuar con Google».

## Resultado

| Qué | Resultado |
|---|---|
| Selector de cuentas y consentimiento | ✅ Se abre el selector nativo («Choose an account · to continue to OneRM»). No apareció `DEVELOPER_ERROR`, así que **el paquete y la SHA-1 del cliente Android son correctos** |
| `signInWithIdToken` | ✅ `SIGNED_IN`. En `auth.users` queda la cuenta con la identidad `google` y el email verificado. La sesión se guarda cifrada con el adaptador de #15 |
| Cuenta de Google y después registro con contraseña | ✅ Se rechaza: `422 user_already_exists` y la cuenta sigue solo con `google` |
| Cuenta con contraseña y después «Continuar con Google» | ❌ **Supabase vincula las identidades solo**, porque el email de Google viene verificado y la cuenta con contraseña está confirmada. La cuenta queda con `email` y `google` e inicia sesión. Viola RN-AUTH-03 |
| Con el trigger `reject_second_identity` en `auth.identities` | ✅ Se rechaza: el `INSERT` de la segunda identidad falla, Supabase no crea la sesión y la cuenta sigue solo con `email`. La app recibe un error genérico: `500 unexpected_failure`, «Error creating identity» |

## Decisión

**Se confirma el login nativo con Google** (ADR-0007, ADR-0001). Para F7 (#44):

1. **RN-AUTH-03 se impone en la base**, con un trigger `BEFORE INSERT` en `auth.identities` que rechaza una identidad de otro proveedor para el mismo usuario (`supabase/migrations/…_spike_single_auth_method.sql` en la rama). Es la única capa que el cliente no puede saltear. **Falta confirmar** que el proyecto de Supabase en la nube permite triggers en `auth.identities`, en #40. Si no lo permite, la alternativa es un *Auth Hook*.
2. **Los mensajes de RN-AUTH-03 necesitan saber el método de ingreso.** Ni el error del trigger (500 genérico) ni `user_already_exists` lo dicen. Propuesta: una función RPC `security definer` que devuelve el método de un email. Revela si el email existe, pero RN-AUTH-02 ya acepta ese riesgo para estos mensajes. Se decide en #44.
3. `skip_nonce_check = true` solo en local. En la nube se evalúa usar nonce con la API de Credential Manager de la librería.
4. Para ver el selector de cuentas otra vez después de cerrar sesión, hay que llamar a `GoogleSignin.signOut()` además de `supabase.auth.signOut()`.

## Configuración (para repetirla)

Los Client ID se publican acá por decisión del usuario (2026-10-03): son públicos por diseño (van dentro de la app) y no dan acceso a nada. El plan de #16 decía que no irían al repositorio. El *Client secret* no se usa y nunca se commiteó.


1. **Google Cloud Console** → proyecto → *APIs y servicios* → *Pantalla de consentimiento de OAuth*: tipo **Externo**, en modo de prueba, con las cuentas de prueba como *usuarios de prueba*.
2. *Credenciales* → *ID de cliente de OAuth*:
   - **Aplicación web:** sin orígenes de JavaScript ni URI de redireccionamiento. Su Client ID es el `webClientId` de la app y el `client_id` de Supabase. Client ID del TPO: `190800915067-rcghu8e9tmhjam3mrqra4g5mbdbibb3s.apps.googleusercontent.com`.
   - **Android:** paquete `com.training.onerm` y la SHA-1 del keystore de debug, `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`. Es el keystore de debug estándar de React Native y `expo prebuild --clean` lo regenera igual. Client ID: `190800915067-7bpeud18d5nulqk71r0m023a7k2nss6o.apps.googleusercontent.com`.
3. **Supabase:**
   - en local, en `config.toml`: `[auth.external.google]` con `enabled = true`, `client_id` = el Client ID web y `skip_nonce_check = true`;
   - en la nube: *Authentication → Providers → Google*, con el mismo Client ID web.
4. **Emulador:** con Google Play Services, el teclado físico activado (`hw.keyboard = yes` en el `config.ini` del AVD) y una cuenta de prueba agregada.
5. Si se firma con otro keystore (por ejemplo, el de release), se agrega otro cliente Android con su SHA-1.

## Código

Rama [`spike/16-google-sign-in`](https://github.com/ivomiyashiro/onerm/tree/spike/16-google-sign-in), que sale de la de #15. Se conserva como referencia y **no se mergea**. Se reescribe en #44 (y el trigger en #40).
