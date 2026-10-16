# Verificación de los RNF de la entrega final (#50)

**Fecha:** 16 de octubre de 2026.
Los RNF que se verifican a mano (05 §1, columna «Verificación»), con su evidencia. Los que se verifican con tests (RNF-04 a 09, 11 a 17 y 21) corren en CI en cada PR (`bun run test`, `test:int`, `test:supabase`, `lint`).

| RNF | Qué pide | Resultado | Evidencia |
|---|---|---|---|
| **RNF-01** | Nada de rutinas, entrenamiento, sugerencias ni progreso requiere conexión | ✅ | Recorrido completo en modo avión desde una instalación limpia ([52](52-recorrido-modo-avion.md)) |
| **RNF-02** | Una serie confirmada persiste aunque se mate el proceso | ✅ | Android: matar el proceso 0,5 s después de confirmar ([52](52-recorrido-modo-avion.md)); iOS: matar y reabrir ([49](49-ios.md)) |
| **RNF-03** | Confirmar una serie responde en < 100 ms en un teléfono de gama media, también con 1.000 entrenamientos | ⏳ **para una persona** | En el emulador la escritura es local y síncrona; con 1.000 entrenamientos, confirmar una serie bajó de unos 580 ms a 11 ms al leer el historial una sola vez (#141). Falta la medición en un teléfono físico, con los pasos de [52](52-recorrido-modo-avion.md#pendiente-para-una-persona) |
| **RNF-10** | La sync nunca bloquea la interfaz ni muestra diálogos durante un entrenamiento | ✅ | Build de release en el emulador, con cuenta y un entrenamiento en curso: serie 2 confirmada en modo avión y serie 3 al recuperar la red, sin diálogos ni demoras, con el descanso corriendo en los dos casos. La sync tampoco interrumpe en las pruebas de [53](53-estados-y-conectividad.md); el entrenamiento en curso se sube recién al finalizarlo (RN-SYNC-13) |
| **RNF-22** | Sin procesos en segundo plano: notificación programada, pantalla encendida solo en S09, sync sin sondeos y sin reintentos en segundo plano | RNF22_RESULT | Abajo |
| **RNF-23** | Aviso de fin de descanso con la pantalla bloqueada con ≤ 5 s de retraso | ✅ | Android: 0,5–0,7 s con alarmas exactas, también con Doze ([spike #14](../spikes/14-rest-notification.md)); iOS: 0,3 s ([49](49-ios.md)). Limitación: no se midió en un teléfono físico ni con ahorro de batería |

## RNF-22 — 30 minutos en segundo plano

**Revisión de código**
- La pantalla encendida es `useKeepAwake()` en `workout-screen.tsx` (S09), y en ningún otro lugar.
- El aviso de fin de descanso es una notificación local programada a la hora absoluta del fin (`expo-rest-notifier.ts`); no hay ningún temporizador corriendo en segundo plano.
- No hay dependencias de tareas en segundo plano (`expo-background-fetch`, `expo-task-manager` ni headless JS).
- La sync solo se dispara con los eventos de RN-SYNC-06; al pasar a segundo plano, `SyncScheduler.enterBackground()` cancela la escritura agrupada y los reintentos, y la reconexión en segundo plano no sincroniza (`sync-scheduler.test.ts`, RNF-22).

**Prueba en el emulador (dev build, Android 15)**
1. Con una cuenta, en modo avión: un cambio de perfil queda «1 cambio sin respaldar · sin conexión». Se empieza un entrenamiento y se confirma una serie, así corre un descanso.
2. Se resetean las estadísticas de batería, la app pasa a segundo plano (Home) y se **desactiva el modo avión**.
3. 30 minutos después:
   - El cambio **no llegó al servidor**: el perfil en Supabase siguió con su valor anterior. En segundo plano no se sincroniza, ni al recuperar la red.
   - La app no registró jobs ni alarmas en `batterystats`. Su único wake lock es el de la pantalla encendida mientras S09 estuvo en primer plano (9 s).
4. Al volver al primer plano, el cambio subió solo en unos 30 s, incluida la recarga de la app.

RNF22_RELEASE
