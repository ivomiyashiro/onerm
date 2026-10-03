# OneRM

[![CI](https://github.com/ivomiyashiro/onerm/actions/workflows/ci.yml/badge.svg)](https://github.com/ivomiyashiro/onerm/actions/workflows/ci.yml)

App móvil (React Native + Expo) que le dice a quien entrena fuerza qué peso, series y repeticiones hacer, y registra el entrenamiento en el gimnasio, con o sin señal.

TPO de Desarrollo de Aplicaciones I (UADE).

## Problema y propuesta de valor

Quien entrena fuerza en el gimnasio **no sabe con qué peso, series y repeticiones hacer cada ejercicio** para seguir progresando sin lastimarse, y el novato ni siquiera sabe qué rutina seguir. Hoy lo resuelve a ojo, con notas del celular o pagando un personal trainer.

OneRM le dice **qué hacer hoy** en cada ejercicio, con el motivo de cada sugerencia, y registra el entrenamiento en un toque por serie, **aunque no haya señal** (subsuelos, zonas sin cobertura). Con cuenta, el historial se respalda y se restaura en otro dispositivo.

Detalle: [visión y alcance](docs/especificacion/00-vision-y-alcance.md).

## Funcionalidades implementadas

> En construcción. Hoy el proyecto tiene la base técnica (F0): app Expo vacía, development build, lint con reglas de capas, tests y CI.

## Requisitos funcionales alcanzados

> En construcción. Los RF del TPO (RF01–RF04) se cierran en la fase F5 del [plan](docs/plan-de-implementacion.md).

## Arquitectura

MVVM + Clean Architecture ([12-arquitectura](docs/especificacion/12-arquitectura.md), [ADR-0011](docs/especificacion/adr/0011-mvvm-clean-en-react-native.md)):

```
app/                 Expo Router: solo composición de pantallas
src/domain/          TypeScript puro: modelos, reglas (motor de sugerencias), casos de uso, interfaces
src/data/            SQLite (Drizzle), Supabase, repositorios, sync
src/presentation/    pantallas, componentes, ViewModels (hooks), textos
src/di/              composition root: crea las implementaciones y las provee por Context
```

Las dependencias apuntan hacia el dominio. Lo verifica el lint (`eslint-plugin-boundaries`): por ejemplo, un import de `domain` a `data` hace fallar `bun run lint` y la CI.

> El diagrama final y el flujo de datos implementado se completan al cerrar F2.

## Tecnologías utilizadas

| Área | Elección | Por qué |
|---|---|---|
| Framework | React Native 0.86 + Expo SDK 57, development build, Expo Router | [ADR-0007](docs/especificacion/adr/0007-react-native-con-expo.md) |
| Lenguaje | TypeScript `strict` | — |
| Gestor de paquetes | bun | [Convenciones §7](docs/convenciones.md) |
| Tests | Jest (`jest-expo`) + Testing Library | RNF-12, RNF-15 |
| Calidad | ESLint + Prettier + `eslint-plugin-boundaries` | RNF-11 |
| CI | GitHub Actions: typecheck, lint y tests en cada PR | — |
| Base local, remoto, estado | SQLite + Drizzle, Supabase, Zustand | En construcción (F1–F4). [Plan §4](docs/plan-de-implementacion.md) |

## Estrategia offline y persistencia

> En construcción. La decisión está en [ADR-0002](docs/especificacion/adr/0002-estrategia-de-sincronizacion.md) y [07-datos-y-sincronizacion](docs/especificacion/07-datos-y-sincronizacion.md): SQLite es la fuente de verdad y la sincronización con Supabase corre aparte.

## Instrucciones de ejecución

### Requisitos

- [bun](https://bun.sh) 1.3 o superior y Node 22 LTS.
- JDK 17 o superior (`JAVA_HOME` apuntando a él).
- Android SDK (el de Android Studio) con `ANDROID_HOME` configurado y `platform-tools` en el `PATH`.
- Un emulador Android 10 o superior, o un dispositivo con depuración USB.

> Docker y Supabase CLI se suman cuando se cierre el spike #12.

### Instalar

```bash
git clone https://github.com/ivomiyashiro/onerm.git
cd onerm
bun install
```

### Compilar y correr en Android

La app usa un **development build** propio, no Expo Go ([ADR-0007](docs/especificacion/adr/0007-react-native-con-expo.md)).

```bash
bun run android          # = bunx expo run:android
```

La primera vez genera `android/` con prebuild, compila el APK de debug, lo instala en el emulador o dispositivo conectado y levanta Metro. La compilación inicial tarda varios minutos (descarga Gradle y el NDK).

Después, mientras no cambien los módulos nativos, alcanza con levantar Metro y abrir la app ya instalada:

```bash
bun run start            # = bunx expo start
```

Los cambios en archivos TS/TSX se ven al instante con Fast Refresh. Hay que volver a correr `bun run android` solo al agregar o actualizar un módulo nativo o cambiar `app.config.ts`.

`android/` e `ios/` no se commitean ni se editan a mano: se regeneran con `bunx expo prebuild --clean`.

### Tests y calidad

```bash
bun run test             # Jest; test:watch, test:coverage
bun run typecheck        # tsc --noEmit
bun run lint             # ESLint con las reglas de capas; falla con cualquier advertencia
bun run format:check     # Prettier
```

No hay claves de API todavía.

## Decisiones relevantes

Los ADR están en [docs/especificacion/adr/](docs/especificacion/adr/README.md).

## Limitaciones conocidas

> En construcción.

## Documentación del proyecto

- [Especificación](docs/especificacion/README.md): requisitos, reglas de negocio, modelo de datos y textos.
- [Plan de implementación](docs/plan-de-implementacion.md): fases y criterios de salida.
- [Convenciones](docs/convenciones.md): ramas, commits, PR y Definición de Hecho.
- [Project «OneRM MVP»](https://github.com/users/ivomiyashiro/projects/2): tablero de tareas.
- [CHANGELOG](CHANGELOG.md).
