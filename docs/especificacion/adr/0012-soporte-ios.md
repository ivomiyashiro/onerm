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
- Se evitan las APIs exclusivas de Android. Todo se hace con módulos de Expo que soportan las dos plataformas: `expo-sqlite`, `expo-notifications`, `expo-keep-awake`, `expo-haptics`, `expo-secure-store`.

## Consecuencias e implicancias

| Tema | Implicancia en iOS |
|---|---|
| Build | Necesita **macOS + Xcode** para el development build (`npx expo run:ios`). El simulador es gratis. En un **dispositivo físico** alcanza con un Apple ID gratuito (firma por 7 días). TestFlight requiere la cuenta paga de desarrollador. |
| Google Sign-In | Requiere un **client ID de iOS** y un URL scheme propios en la configuración (config plugin). |
| Sign in with Apple | ⚠️ Si la app **se publicara** en la App Store con login de Google, Apple exige ofrecer también Sign in with Apple o una alternativa equivalente (App Review Guidelines 4.8). **No aplica** porque no se publica. Queda como limitación conocida. |
| Notificaciones del temporizador | Las notificaciones locales programadas funcionan igual. El permiso se pide también en iOS (RF-ENT-06 AC9). |
| Pantalla encendida y hápticos | Soportados por los módulos de Expo. La intensidad háptica varía según el dispositivo. |
| Almacenamiento seguro | Keychain en iOS, Keystore en Android (RNF-07). |
| Diseño | Se respetan las áreas seguras (notch) y el gesto de "volver" de iOS. El diseño es único, sin variantes por plataforma en el MVP. |

## Cuándo revisar esta decisión

Si se decide publicar: sumar Sign in with Apple, la cuenta de desarrollador, el aviso de privacidad y una política de eliminación de cuenta (ver RF-AUTH-09).
