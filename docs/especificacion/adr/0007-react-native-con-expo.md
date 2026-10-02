# ADR-0007 — React Native con Expo (development build, sin Expo Go)

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** RF-AUTH-04, ADR-0001 (R7), RNF-07

## Contexto

- El TPO admite Kotlin + Compose o React Native. **Se eligió React Native** para aprender la tecnología.
- El equipo tiene experiencia en **Flutter**, no en el ecosistema de React Native.
- La app necesita módulos nativos: SQLite, notificaciones locales, pantalla encendida, hápticos, almacenamiento seguro y Google Sign-In.
- React Native "pelado" (sin Expo) obliga a mantener a mano el proyecto nativo de Android (Gradle, `AndroidManifest`) e integrar cada módulo. La documentación oficial de React Native **recomienda arrancar con un framework**, y el que propone es Expo.

## Decisión

Usar **Expo** con un **development build** propio, no Expo Go:

- **Expo Router** para la navegación.
- **Módulos de Expo** para las capacidades del dispositivo: `expo-sqlite`, `expo-notifications`, `expo-keep-awake`, `expo-haptics`, `expo-secure-store`.
- **Config plugins** y *prebuild* para generar el proyecto nativo. No se edita `android/` a mano.
- Build local con `npx expo run:android`, usando el Android SDK que ya existe por Flutter. EAS Build (en la nube) es opcional.

### Expo Go vs. development build

| | Expo Go | Development build |
|---|---|---|
| Qué es | Una app de la tienda con un conjunto **fijo** de módulos nativos. Se escanea un QR y el JS corre adentro. | **Nuestro propio APK de debug**, con los módulos nativos que usamos más un cliente de desarrollo. |
| Módulos nativos fuera de Expo (ej.: Google Sign-In) | ❌ | ✅ |
| Equivalente en Flutter | No tiene | El APK de debug de `flutter run` |
| Cuándo se recompila | Nunca | Solo al agregar o cambiar un módulo nativo. Los cambios de JS/TS se ven al instante con Fast Refresh |

## Mapa Flutter → React Native + Expo

| Flutter | React Native + Expo |
|---|---|
| Dart | TypeScript |
| Flutter SDK + CLI (`flutter create/run/build`) | Expo CLI (`npx create-expo-app`, `npx expo start`, `npx expo run:android`) |
| `flutter doctor` | `npx expo-doctor` |
| Motor propio (Skia/Impeller) que **dibuja los píxeles** | **Componentes nativos reales** de Android (`<View>` → `android.view.View`) |
| Widgets (`StatelessWidget`, `StatefulWidget`) | Componentes funcionales (JSX) + hooks |
| `setState` | `useState` / `useReducer` |
| Provider, Riverpod, Bloc | Zustand, Redux Toolkit, Context. **El "ViewModel" suele ser un hook propio** (`useWorkoutViewModel`) que expone estado y acciones |
| `go_router` | Expo Router (rutas basadas en archivos, como Next.js) |
| pub.dev / plugins | npm / módulos de Expo |
| `sqflite` / `drift` | `expo-sqlite` (+ Drizzle ORM, el análogo de drift) |
| `flutter_secure_storage` | `expo-secure-store` |
| `flutter_local_notifications` | `expo-notifications` |
| `wakelock_plus` | `expo-keep-awake` |
| Hot reload | Fast Refresh |
| Editar `AndroidManifest.xml` / Gradle | Config plugins en `app.json` / `app.config.ts` (*Continuous Native Generation*) |
| `flutter build apk` | `npx expo run:android --variant release` o `eas build` |

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| **Expo + development build** (elegida) | Herramientas integradas (parecido a Flutter), módulos mantenidos, sin tocar el proyecto nativo, soporta módulos de terceros | Una capa más para entender. La primera compilación es lenta |
| Expo con solo Expo Go | Cero configuración nativa | **No soporta Google Sign-In nativo** (RF-AUTH-04). Límite a mediano plazo |
| React Native CLI (sin Expo) | Control total del proyecto nativo | Mantener Gradle y el manifiesto a mano, integrar cada módulo. Mucho más para aprender a la vez |

## Consecuencias

- ✅ Se aprende **React Native** igual: Expo es herramienta, no reemplaza a RN. Componentes, hooks y el modelo de renderizado son los mismos.
- ✅ Las capacidades del dispositivo del MVP están cubiertas por módulos oficiales.
- ⚠️ Hay que tener el Android SDK y un emulador o dispositivo (ya disponibles por Flutter).
- ⚠️ Al agregar un módulo nativo hay que recompilar el development build.

## Riesgos y mitigaciones

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | La curva de aprendizaje de RN y Expo retrasa el desarrollo. | Hacer un *spike* temprano: proyecto vacío, navegación, SQLite y un development build en el dispositivo. |
| R2 | En la defensa se pregunta por qué Expo. | Este ADR: está recomendado por la documentación oficial de RN, cubre los módulos necesarios y no se usa Expo Go. |
| R3 | Configurar Google Sign-In (cliente OAuth, huella SHA-1) es engorroso. | Hacerlo temprano, en el mismo spike (ADR-0001 R7). |
