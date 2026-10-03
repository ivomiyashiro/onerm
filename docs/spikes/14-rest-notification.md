# Spike 14 — ¿Una notificación local programada avisa el fin del descanso con la pantalla bloqueada con ≤ 5 s de retraso?

- **Issue:** #14
- **Fecha:** 2026-10-03
- **Tiempo acotado:** 3 horas · **Tiempo real:** 2,5 horas (1 h se perdió con el emulador colgado)
- **ADR / RNF relacionados:** RN-ENT-07, RNF-22, RNF-23, ADR-0007

## Pregunta

RN-ENT-07 y RNF-22 piden que el temporizador no use procesos en segundo plano: se guarda la hora de fin y se programa una notificación local. RNF-23 pide que, con la pantalla bloqueada, el aviso llegue con ≤ 5 s de retraso cuando el sistema permite alarmas exactas. Hay que saber si `expo-notifications` lo logra, qué pasa sin alarmas exactas (Android 12+) y con el ahorro de batería.

## Criterio de éxito

- [x] Notificación programada para una hora de fin absoluta. Reprogramarla (+15 s) y cancelarla (Saltear) funcionan.
- [ ] Retraso medido con la pantalla bloqueada en un **dispositivo físico** Android 12+, con y sin permiso de alarmas exactas. **Pendiente: se midió solo en el emulador** (ver «Para el dispositivo físico»).
- [x] Comportamiento con el permiso de notificaciones rechazado.
- [~] `expo-keep-awake` mantiene la pantalla encendida solo mientras está activo. Verificado en el código. En la build de desarrollo no se puede observar, y en el dispositivo físico queda pendiente con una build de release.
- [x] Limitaciones anotadas para RNF-23.

## Qué se hizo

**Versiones:** `expo-notifications` 57.0.21 y `expo-keep-awake` 57.0.2. Emulador Pixel_10 con Android 17.

1. Pantalla de prueba con la hora de fin absoluta en el estado. La cuenta regresiva es `fin − ahora`, refrescada cada 250 ms, y los botones son Iniciar 30 s, +15 s, Saltear, Pedir permiso y un interruptor de keep-awake.
2. `scheduleNotificationAsync` con un disparador `DATE`, sobre un canal `rest-timer` de importancia máxima.
3. Lectura del código nativo de `expo-notifications` (`ExpoSchedulingDelegate.kt`). Usa `setExactAndAllowWhileIdle` solo si `alarmManager.canScheduleExactAlarms()` y, si no, `setAndAllowWhileIdle`, que es inexacta.
4. La medición se hizo con un script por adb:
   - lee de `dumpsys alarm` la hora programada (`origWhen`) y la ventana (`window`);
   - bloquea la pantalla (`keyevent 26`) o fuerza Doze (`dumpsys deviceidle force-idle`);
   - registra cuándo desaparece la alarma, que es cuando se dispara. Tiene unos 0,3 s de error por el sondeo.
5. Se probó sin `SCHEDULE_EXACT_ALARM` en el manifest, con el permiso declarado pero sin conceder (el estado por defecto) y concedido con `appops set … SCHEDULE_EXACT_ALARM allow`.

## Resultado

| Caso (descanso de 30 s) | Ventana de la alarma | Retraso medido |
|---|---|---|
| Sin permiso de alarmas exactas, app en primer plano | +22,4 s | **22,5 s** |
| Sin permiso, pantalla bloqueada | +22,4 s | **23,6 s** |
| Permiso declarado pero no concedido (por defecto en Android 14+) | +22,5 s | **23,7 s** |
| Permiso concedido, pantalla bloqueada (2 veces) | 0 | **0,5 s y 0,6 s** |
| Permiso concedido, pantalla bloqueada y Doze forzado | 0 | **0,7 s** |
| Permiso concedido y ahorro de batería | — | No concluyente: el sistema del emulador se colgó («Process system isn't responding») y una alarma llegó 78 s tarde. No se puede separar el ahorro de batería del cuelgue |

- **Sin alarmas exactas, Android programa una ventana del 75 % del intervalo** (22 s en un descanso de 30 s, 1:30 en uno de 2 min). Entonces RNF-23 no se cumple sin el permiso, **ni siquiera con la app en primer plano**: la notificación llega igual de tarde. Lo exacto en primer plano tiene que ser la cuenta regresiva de la UI, que sale de la hora de fin y no depende de la alarma.
- **+15 s y Saltear** funcionan si la notificación se programa **siempre con el mismo identificador** (`identifier: 'rest-timer'`). Programar de nuevo reemplaza la alarma anterior, y Saltear cancela por ese identificador. La primera versión guardaba el id en el estado de React. Con toques seguidos el estado quedaba desfasado y **quedó una alarma huérfana que sonó después de Saltear**. Con el id fijo se verificó en la lista de alarmas: al iniciar hay una, con +15 s y +15 s sigue habiendo una (a las 20:23:26, 20:23:41 y 20:23:56) y con Saltear no queda ninguna.
- **Permiso de notificaciones rechazado:** `scheduleNotificationAsync` no falla y la alarma se programa, pero no se muestra nada. El listener de primer plano igual se ejecuta. La app tiene que leer el permiso con `getPermissionsAsync()` para mostrar el aviso de S09 («Activá las notificaciones…», 13-textos), porque el error nunca llega.
- **Keep-awake:** `useKeepAwake(tag)` agrega `FLAG_KEEP_SCREEN_ON` a la ventana al montar y lo saca al desmontar, contando los tags (`ExpoKeepAwakeManager.kt`). En la **build de desarrollo, Expo activa su propio tag** (`expo/src/launch/withDevTools`) apenas `expo-keep-awake` está instalado, así que la pantalla nunca se apaga y la verificación no sirve. Hay que probarlo en una build de release. Se compiló una, pero el emulador se colgó antes de poder probarla.
- **Ninguna de las dos librerías corre en segundo plano:** la alarma la dispara el sistema y keep-awake es un flag de la ventana (RNF-22).

## Decisión

**Se confirma el enfoque de RN-ENT-07** (hora de fin absoluta, notificación local, sin procesos en segundo plano), con estos ajustes para la card del temporizador:

1. La notificación del descanso usa siempre el identificador fijo `rest-timer`: programar reemplaza y Saltear cancela.
2. Lo exacto en primer plano es la UI: la cuenta regresiva sale de `rest_timer_ends_at`, y al llegar a 0 la pantalla muestra «¡Descanso terminado!» sin esperar la notificación.
3. El estado del permiso de notificaciones se lee con `getPermissionsAsync()` para mostrar el aviso de S09 y S21.
4. `useKeepAwake` va solo en S09.

**Decisión pendiente (del usuario).** Las alarmas exactas en Android 14+ necesitan un permiso que **viene denegado por defecto**. Sin él, el aviso con la pantalla bloqueada llega hasta un 75 % tarde. Opciones:

| Opción | A favor | En contra |
|---|---|---|
| **A. `SCHEDULE_EXACT_ALARM` + pedirlo** (llevar a «Alarmas y recordatorios» en los ajustes, con una explicación) | Cumple RNF-23 si el usuario lo concede. Es lo que espera Play para una app que no es de alarmas | Un paso más en el onboarding o en S09. Hace falta un texto nuevo en 13-textos y leer `canScheduleExactAlarms()`, que `expo-notifications` no expone: es un módulo nativo chico o `expo-intent-launcher` para abrir los ajustes |
| **B. `USE_EXACT_ALARM`** (se concede solo) | Cero fricción. Cumple RNF-23 siempre | Play lo restringe a apps cuyo núcleo es una alarma o un calendario. La app no se publica en Play (TPO), pero el argumento es débil en la defensa |
| **C. Aceptar el aviso inexacto** y documentarlo como limitación (RNF-23 ya lo prevé) | Nada que agregar | Con la pantalla bloqueada, en un descanso de 2 min el aviso puede llegar 1:30 tarde. Es la función principal del temporizador |

Recomendación: **A**, con C como degradación si el usuario no concede el permiso. Hay que agregar el texto en 13-textos.

## Para el dispositivo físico (pendiente de una persona)

Con un Android 12 o superior y la depuración USB activada:

1. `git checkout spike/14-rest-notification && bun install && bun run android` (con el teléfono conectado).
2. En la app: **Request permission** → Permitir. Después **Start 30 s** y bloquear el teléfono enseguida. Anotar cuántos segundos después de los 30 llega el aviso (con un cronómetro en otro dispositivo).
3. Repetir 3 veces **sin** alarmas exactas: es el estado por defecto en Android 14+. En Android 12–13 puede venir concedido: revisarlo en Ajustes → Apps → OneRM → Alarmas y recordatorios.
4. Concederlas en ese mismo ajuste y repetir 3 veces.
5. Con el ahorro de batería activado y las alarmas exactas concedidas, repetir 2 veces.
6. Keep-awake: compilar en release (`cd android && ./gradlew app:assembleRelease -Dorg.gradle.jvmargs=-Xmx4g`, después `adb install -r app/build/outputs/apk/release/app-release.apk`). Con la pantalla en 30 s de apagado automático, verificar que con el interruptor apagado se apaga y que con el interruptor encendido no.

Pasar los resultados para completar la tabla de esta nota.

## Código

Rama [`spike/14-rest-notification`](https://github.com/ivomiyashiro/onerm/tree/spike/14-rest-notification). Se conserva como referencia y **no se mergea**. La pantalla de prueba es `src/di/spike-rest.tsx`.
