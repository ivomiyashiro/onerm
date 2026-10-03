# OneRM

[![CI](https://github.com/ivomiyashiro/onerm/actions/workflows/ci.yml/badge.svg)](https://github.com/ivomiyashiro/onerm/actions/workflows/ci.yml)

App móvil (React Native + Expo) que le dice a quien entrena fuerza qué peso, series y repeticiones hacer, y registra el entrenamiento en el gimnasio, con o sin señal.

## Requisitos

- [bun](https://bun.sh) (gestor de paquetes) y Node 22 LTS.
- JDK 17 o superior (`JAVA_HOME` apuntando a él).
- Android SDK (el de Android Studio) con `ANDROID_HOME` configurado y `platform-tools` en el `PATH`.
- Un emulador Android 10 o superior, o un dispositivo con depuración USB.

## Compilar y correr en Android

La app usa un **development build** propio, no Expo Go ([ADR-0007](docs/especificacion/adr/0007-react-native-con-expo.md)).

```bash
bun install
bun run android          # = bunx expo run:android
```

La primera vez genera `android/` con prebuild, compila el APK de debug, lo instala en el emulador o dispositivo conectado y levanta Metro. La compilación inicial tarda varios minutos (descarga Gradle y el NDK).

Después, mientras no cambien los módulos nativos, alcanza con levantar Metro y abrir la app ya instalada:

```bash
bun run start            # = bunx expo start
```

Los cambios en archivos TS/TSX se ven al instante con Fast Refresh. Hay que volver a correr `bun run android` solo al agregar o actualizar un módulo nativo o cambiar `app.config.ts`.

`android/` e `ios/` no se commitean ni se editan a mano: se regeneran con `bunx expo prebuild --clean`.
