# Verificación de los RNF de la entrega final (#50)

**Fecha:** 16 de octubre de 2026.
Los RNF que se verifican a mano (05 §1, columna «Verificación»), con su evidencia. Los que se verifican con tests (RNF-04 a 09, 11 a 17 y 21) corren en CI en cada PR (`bun run test`, `test:int`, `test:supabase`, `lint`).

| RNF | Qué pide | Resultado | Evidencia |
|---|---|---|---|
| **RNF-01** | Nada de rutinas, entrenamiento, sugerencias ni progreso requiere conexión | ✅ | Recorrido completo en modo avión desde una instalación limpia ([52](52-recorrido-modo-avion.md)) |
| **RNF-02** | Una serie confirmada persiste aunque se mate el proceso | ✅ | Android: matar el proceso 0,5 s después de confirmar ([52](52-recorrido-modo-avion.md)); iOS: matar y reabrir ([49](49-ios.md)) |
| **RNF-03** | Confirmar una serie responde en < 100 ms en un teléfono de gama media, también con 1.000 entrenamientos | ⏳ **para una persona** | En el emulador la escritura es local y síncrona; con 1.000 entrenamientos, confirmar una serie bajó de unos 580 ms a 11 ms al leer el historial una sola vez (#141). Falta la medición en un teléfono físico, con los pasos de [52](52-recorrido-modo-avion.md#pendiente-para-una-persona) |
| **RNF-10** | La sync nunca bloquea la interfaz ni muestra diálogos durante un entrenamiento | ✅ | Build de release en el emulador, con cuenta y un entrenamiento en curso: serie 2 confirmada en modo avión y serie 3 al recuperar la red, sin diálogos ni demoras, con el descanso corriendo en los dos casos. La sync tampoco interrumpe en las pruebas de [53](53-estados-y-conectividad.md); el entrenamiento en curso se sube recién al finalizarlo (RN-SYNC-13) |
| **RNF-22** | Sin procesos en segundo plano: notificación programada, pantalla encendida solo en S09, sync sin sondeos y sin reintentos en segundo plano | ✅ con un residuo (#182) | Abajo |
| **RNF-23** | Aviso de fin de descanso con la pantalla bloqueada con ≤ 5 s de retraso | ✅ | Android: 0,5–0,7 s con alarmas exactas, también con Doze ([spike #14](../spikes/14-rest-notification.md)); iOS: 0,3 s ([49](49-ios.md)). Limitación: no se midió en un teléfono físico ni con ahorro de batería |

## RNF-22 — 30 minutos en segundo plano

**Revisión de código**
- La pantalla encendida es `useKeepAwake()` en `workout-screen.tsx` (S09), y en ningún otro lugar.
- El aviso de fin de descanso es una notificación local programada a la hora absoluta del fin (`expo-rest-notifier.ts`); no hay ningún temporizador corriendo en segundo plano.
- No hay dependencias de tareas en segundo plano (`expo-background-fetch`, `expo-task-manager` ni headless JS).
- La sync solo se dispara con los eventos de RN-SYNC-06; al pasar a segundo plano, `SyncScheduler.enterBackground()` cancela la escritura agrupada y los reintentos, y la reconexión en segundo plano no sincroniza (`sync-scheduler.test.ts`, RNF-22).

**Prueba en el emulador (Android 15): primero con el dev build y después con la build de release**
1. Con una cuenta, en modo avión: un cambio de perfil queda «1 cambio sin respaldar · sin conexión». Se empieza un entrenamiento y se confirma una serie, así corre un descanso.
2. Se resetean las estadísticas de batería, la app pasa a segundo plano (Home) y se **desactiva el modo avión**.
3. 30 minutos después:
   - El cambio **no llegó al servidor**: el perfil en Supabase siguió con su valor anterior. En segundo plano no se sincroniza, ni al recuperar la red.
   - La app no registró jobs ni alarmas en `batterystats`. Su único wake lock es el de la pantalla encendida mientras S09 estuvo en primer plano (9 s).
4. Al volver al primer plano, el cambio subió solo en unos 30 s, incluida la recarga de la app.

**Lo que encontró la prueba (#180)**
- En las dos builds, Android **mató la app por uso de CPU** en segundo plano (release: «Killed for cpu use: +9,5 s over 5 min», 3 %).
- La causa principal eran los relojes de la UI: la cuenta regresiva re-renderizaba 4 veces por segundo y el tiempo transcurrido una vez por segundo (Inicio, barra de pestañas y S09), también en segundo plano. Además, NetInfo pedía una URL cada minuto para comprobar internet, aunque la app solo usa `isConnected`.
- **Corregido en #180:** los relojes solo corren con la app en pantalla y se ponen al día al volver, y NetInfo no hace ese sondeo. Con la build de release, la app pasó 6 min 40 s en segundo plano sin que Android la matara, y ya no figura en el consumo de `batterystats`.
- **30 minutos con la corrección (build de release, mismo escenario):** la app siguió viva todo el tiempo (mismo proceso) y Android no la mató. El servidor no recibió nada aunque la red volvió. No hubo jobs, alarmas ni wake locks, y en total usó unos 36 s de CPU en 30 min, concentrados en los primeros minutos (ver el residuo).
- **Residuo (#182):** en los primeros minutos en segundo plano el hilo principal todavía usa ~4 % de CPU, hasta que Android congela el proceso. Según `simpleperf`, viene de un bucle de frames de `react-native-worklets` (Reanimated, que llega por las bibliotecas de navegación y gestos). Corre siempre, también con la app quieta en primer plano.
