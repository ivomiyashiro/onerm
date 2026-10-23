# ADR-0012 — Soporte de iOS (ejecutable, no publicado)

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** ADR-0007, RF-AUTH-04, RF-ENT-06, RF-ENT-07, RNF-20

## Contexto

El TPO pide Android. El equipo quiere, además, que la app **se pueda ejecutar en iOS**, aunque no sea un requisito de la materia. React Native con Expo lo hace posible con el mismo código.

## Decisión

- **Android es la plataforma de referencia:** la demo, la defensa y las pruebas completas se hacen en Android.
- **iOS es Should:** la app compila y corre en el **simulador de iOS** con todas las funciones del MVP. Antes de cada entrega se hace una **prueba de humo** en iOS.
- **No se publica** en la App Store.
- Se evitan las APIs exclusivas de Android. Todo se hace con módulos de Expo que soportan las dos plataformas: `expo-sqlite`, `expo-notifications`, `expo-keep-awake`, `expo-secure-store`, y `Vibration` de React Native.

## Consecuencias e implicancias

| Tema | Implicancia en iOS |
|---|---|
| Build | Necesita **macOS + Xcode** para el development build (`npx expo run:ios`). El simulador es gratis. En un **dispositivo físico** alcanza con un Apple ID gratuito (firma por 7 días), sin el entitlement de push, que los Personal Teams no admiten (#181). TestFlight requiere la cuenta paga de desarrollador. |
| Ciclo de vida | Desde iOS 27 la app tiene que usar escenas (UIScene) o se cierra al abrir. Lo agrega el config plugin `plugins/with-scene-lifecycle.ts` en el prebuild (#181). |
| Google Sign-In | Requiere un **client ID de iOS** y un URL scheme propios en la configuración (config plugin). Se lee de `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, que es público como el client ID web. Sin él, iOS no muestra «Continuar con Google» (#49; decisión D2 de la revisión de F9). Con él, `plugins/with-google-sign-in.ts` registra como URL scheme el client ID invertido (`com.googleusercontent.apps.…`), por donde Google vuelve a la app; sin ese scheme, abrir el selector cierra la app (#273). Supabase tiene que aceptar ese client ID además del web, en «Client IDs» del proveedor Google, y tener activo «Skip nonce checks»: la librería de Google en iOS agrega un nonce que la app no puede reenviar. Verificado en el iPhone el 2026-10-22. |
| Sign in with Apple | ⚠️ Si la app **se publicara** en la App Store con login de Google, Apple exige ofrecer también Sign in with Apple o una alternativa equivalente (App Review Guidelines 4.8). **No aplica** porque no se publica. Queda como limitación conocida. |
| Notificaciones del temporizador | Las notificaciones locales programadas funcionan igual. El permiso se pide también en iOS (RF-ENT-06 AC9). |
| Pantalla encendida y vibración | `expo-keep-awake` y `Vibration` de React Native, en las dos plataformas. La intensidad de la vibración varía según el dispositivo. |
| Almacenamiento seguro | Keychain en iOS, Keystore en Android (RNF-07). |
| Diseño | Se respetan las áreas seguras (notch) y el gesto de "volver" de iOS. El diseño es único, sin variantes por plataforma en el MVP. |

## Cuándo revisar esta decisión

Si se decide publicar: sumar Sign in with Apple, la cuenta de desarrollador, el aviso de privacidad y una política de eliminación de cuenta (ver RF-AUTH-09).
