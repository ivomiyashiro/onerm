# Spike 15 — ¿El patrón de 07 §1.1 (clave AES en el Keystore y sesión cifrada) funciona como `storage` de supabase-js, con el refresh automático?

- **Issue:** #15
- **Fecha:** 2026-10-03
- **Tiempo acotado:** 3 horas · **Tiempo real:** 1,5 horas
- **ADR / RNF relacionados:** RNF-07, RNF-08, 07 §1.1, ADR-0001

## Pregunta

La sesión de Supabase no entra en `expo-secure-store`, que en algunas plataformas tiene un límite de unos 2 KB por valor. 07 §1.1 propone guardar una clave AES en SecureStore (Keystore o Keychain) y la sesión cifrada en el almacenamiento local. Hay que saber si ese adaptador funciona con supabase-js (login, persistencia y refresh) y qué librerías usar.

## Criterio de éxito

- [x] Un adaptador de `storage` para supabase-js que cifra con AES y guarda la clave en el Keystore.
- [x] Login contra el Supabase local, y la sesión sobrevive a reiniciar la app.
- [x] El refresh del token funciona y se pausa con la app en segundo plano.
- [x] Verificado que la sesión no queda en texto plano.
- [x] Librerías elegidas, con su justificación.

## Qué se hizo

**Versiones:** `expo-secure-store` 57.0.4, `expo-crypto` 57.0.3, `expo-sqlite` 57.0.3 (`kv-store`), `@supabase/supabase-js` 2.117.2 y el Supabase local de #12. Emulador nuevo, `OneRM_API35` (Android 15): el AVD de Android 17 se volvió inestable durante #14.

1. Adaptador `secureSessionStorage` (`getItem`, `setItem` y `removeItem`):
   - la primera vez genera una clave AES-256 con `AESEncryptionKey.generate()` y la guarda en hexadecimal en SecureStore, con `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`;
   - `setItem` cifra con `aesEncryptAsync` (AES-GCM, IV aleatorio y tag de autenticación) y guarda el sobre `combined` en base64 en `expo-sqlite/kv-store`;
   - `getItem` hace el camino inverso.
2. `createClient(..., { auth: { storage: secureSessionStorage, autoRefreshToken: true, persistSession: true } })`, con `startAutoRefresh()` y `stopAutoRefresh()` según `AppState`, como recomienda supabase-js para React Native.
3. `jwt_expiry = 120` en `supabase/config.toml`, para ver el refresh en minutos y no en horas.
4. Pruebas en el emulador, con `adb reverse` al Supabase local:
   - registro e inicio de sesión;
   - `am force-stop` y reapertura;
   - 100 s en primer plano y 150 s en segundo plano, contando los eventos `TOKEN_REFRESHED`;
   - volcado de todos los archivos de la app (`run-as … tar`) y búsqueda de `eyJhbGci`, `access_token`, `refresh_token` y el email.

## Resultado

| Qué | Resultado |
|---|---|
| Tamaño de la sesión | **2.106 caracteres** (2.848 ya cifrada en base64). Supera los ~2 KB: 07 §1.1 tenía razón y el patrón hace falta |
| Login y registro | ✅ `SIGNED_IN`. El adaptador escribe y relee el valor |
| Reiniciar la app (`force-stop`) | ✅ `getItem` descifra y la app arranca con la sesión (`user: spike15@…`). Como el token estaba por vencer, se refrescó solo al abrir |
| Refresh en primer plano | ✅ `TOKEN_REFRESHED` cada 30 s con el JWT de 120 s. Con el valor real (3.600 s) es una vez por hora |
| Refresh en segundo plano | ✅ **0 refrescos en 150 s**, aunque el token venció a mitad de la prueba |
| Volver al primer plano con el token vencido | ✅ Refresca 1,4 s después de `active` y sigue con sesión |
| Texto plano | ✅ **0 coincidencias** en los 13 archivos de la app. En el kv-store solo está el sobre AES-GCM. La entrada de SecureStore (`shared_prefs/SecureStore.xml`) guarda la clave AES cifrada a su vez con una clave del Keystore (`"scheme":"aes"`, `usesKeystoreSuffix`) |

**Problemas encontrados:**
1. **En Android, `AESSealedData.fromCombined()` rechaza un string base64** («Value is a string, expected an Object»), aunque el tipo de TypeScript lo acepta. Hay que pasarle los bytes: `Uint8Array.from(atob(s), c => c.charCodeAt(0))`.
2. **Ese error hizo visible un antipatrón:** el `catch` de `getItem` borraba la sesión ante *cualquier* error, para "comportarse como sesión cerrada". Por un bug del adaptador, la sesión se perdía en silencio en cada arranque. El adaptador definitivo borra solo si falla la autenticación del sobre (clave perdida o datos alterados). Cualquier otro error se propaga y se registra.
3. **Con `createClient` a nivel de módulo, Fast Refresh deja clientes viejos vivos**, con sus timers de refresh, que leen y escriben el mismo storage. En la app definitiva el cliente se crea una sola vez en el composition root (`src/di`), no en un módulo que se recarga.

## Decisión

**Se confirma 07 §1.1.** Librerías elegidas:

| Para qué | Elección | Por qué | Descartadas |
|---|---|---|---|
| Cifrado | **`expo-crypto` (AES-256-GCM nativo)** | Módulo oficial de Expo, implementación nativa del sistema. GCM además **autentica**: un sobre alterado no se descifra | `aes-js` + modo CTR (el ejemplo de Supabase): JS puro, sin autenticación y otra dependencia |
| Números aleatorios (clave e IV) | **`expo-crypto`** (CSPRNG de la plataforma, dentro de `generate()` y `aesEncryptAsync()`) | No hace falta otra librería | `react-native-get-random-values`: solo lo necesita `aes-js` |
| Guardar la clave | **`expo-secure-store`** con `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` | Keystore en Android y Keychain en iOS. La clave no viaja en los backups | — |
| Guardar la sesión cifrada | **`expo-sqlite/kv-store`** | `expo-sqlite` ya es dependencia (ADR-0010). Misma API que AsyncStorage | `@react-native-async-storage/async-storage`: una dependencia más para lo mismo |

**Para #42 (F7 Auth):**
- el adaptador se reescribe con TDD en `src/data/auth/`, con los arreglos 1 y 2;
- el cliente se crea en `src/di`;
- `AppState` maneja `startAutoRefresh` y `stopAutoRefresh`.

No se cambia nada de la especificación.

## Código

Rama [`spike/15-secure-session`](https://github.com/ivomiyashiro/onerm/tree/spike/15-secure-session). Se conserva como referencia y **no se mergea**.
