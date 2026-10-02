# RF-AUTH — Autenticación y cuenta

**Objetivo:** OBJ-04.
**ADR:** [ADR-0001](../adr/0001-supabase-directo-sin-backend-propio.md), [ADR-0003](../adr/0003-modo-invitado.md).
**Reglas:** RN-AUTH-*, RN-SYNC-08 y RN-SYNC-09.

La cuenta existe para **respaldar y llevar los datos a otro dispositivo**, no para habilitar el uso. Nada del entrenamiento depende de tener cuenta ni conexión.

## Resumen

| ID | Título | Prioridad |
|---|---|---|
| RF-AUTH-01 | Usar la app como invitado | Must |
| RF-AUTH-02 | Registrarse con email y contraseña | Must |
| RF-AUTH-03 | Iniciar sesión con email y contraseña | Must |
| RF-AUTH-04 | Continuar con Google | Should |
| RF-AUTH-05 | Migrar los datos del invitado a la cuenta | Must |
| RF-AUTH-06 | Mantener la sesión de autenticación, también sin conexión | Must |
| RF-AUTH-07 | Cerrar sesión sin perder datos pendientes | Must |
| RF-AUTH-08 | Recuperar la contraseña | Should |
| RF-AUTH-09 | Eliminar la cuenta | Won't |

---

### RF-AUTH-01 — Usar la app como invitado

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Invitado | RN-SYNC-09 | ADR-0003 |

**Historia:** Como persona que recién instaló la app, quiero empezar a entrenar sin crear una cuenta, para probarla sin fricción y aunque no tenga señal.

```gherkin
Escenario: AC1 — Primer uso sin conexión
  Dado que instalé la app y no tengo conexión
  Cuando la abro por primera vez y elijo "Continuar sin cuenta"
  Entonces accedo al onboarding sin que se me pida conexión ni cuenta

Escenario: AC2 — Funcionalidad completa como invitado
  Dado que uso la app como invitado
  Cuando accedo a rutinas, entrenamiento, sugerencias o progreso
  Entonces todas esas funciones están disponibles igual que para un usuario registrado

Escenario: AC3 — Los datos del invitado persisten
  Dado que registré un entrenamiento como invitado
  Cuando cierro la app por completo y la vuelvo a abrir
  Entonces el entrenamiento sigue en mi historial

Escenario: AC4 — El invitado sabe que no tiene respaldo
  Dado que uso la app como invitado
  Cuando abro la pantalla de perfil
  Entonces veo "Tus datos solo están en este teléfono" y la acción "Crear cuenta"

Escenario: AC5 — Recordatorio no intrusivo
  Dado que uso la app como invitado
  Cuando finalizo mi primer entrenamiento
  Entonces se me sugiere crear una cuenta para respaldar mis datos
  Y puedo descartar la sugerencia con un toque
  Pero no vuelvo a verla por al menos 7 días (D13)

Escenario: AC6 — Recordatorio posterior
  Dado que descarté la sugerencia hace 7 días o más
  Cuando finalizo otro entrenamiento
  Entonces vuelvo a ver D13
```

**Notas:** el recordatorio nunca aparece durante un entrenamiento en curso.

---

### RF-AUTH-02 — Registrarse con email y contraseña

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Invitado | RN-AUTH-01, RN-AUTH-03 | ADR-0001 |

**Historia:** Como invitado, quiero crear una cuenta con mi email y una contraseña, para que mis entrenamientos queden respaldados.

```gherkin
Escenario: AC1 — Registro exitoso
  Dado que soy invitado y tengo conexión
  Cuando ingreso un email válido no registrado y una contraseña que cumple RN-AUTH-01
  Y confirmo
  Entonces se crea mi cuenta y quedo autenticado
  Y mis datos de invitado pasan a la cuenta (RF-AUTH-05)

Escenario: AC2 — Validación de campos antes de enviar
  Dado que estoy en el formulario de registro
  Cuando ingreso un email con formato inválido o una contraseña que no cumple RN-AUTH-01
  Entonces veo el error junto al campo correspondiente
  Y el formulario no se envía

Escenario: AC3 — Email ya registrado
  Dado que el email ingresado ya tiene una cuenta con contraseña
  Cuando confirmo el registro
  Entonces veo "Ya existe una cuenta con este email"
  Y se me ofrece ir a iniciar sesión con el email ya completado
  (excepción aceptada a la no enumeración, RN-AUTH-02)

Escenario: AC4 — Sin conexión
  Dado que no tengo conexión
  Cuando intento registrarme
  Entonces veo "Necesitás conexión para crear tu cuenta. Podés seguir entrenando sin cuenta."
  Y lo que ingresé en el formulario no se borra
  Y mis datos de invitado no se modifican

Escenario: AC5 — Email registrado con Google
  Dado que el email ingresado ya tiene una cuenta creada con Google
  Cuando confirmo el registro
  Entonces veo "Ya tenés una cuenta con este email. Entrá con Google" (RN-AUTH-03)
```

**Notas:** en el MVP **no se exige confirmar el email** (Q-01 resuelta): la cuenta queda activa al crearla. Se desactiva la confirmación en Supabase Auth. Confirmar el email queda como mejora futura; cuando se agregue, suma un AC con el estado "email pendiente de confirmación".

---

### RF-AUTH-03 — Iniciar sesión con email y contraseña

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Invitado | RN-AUTH-02 | ADR-0001 |

**Historia:** Como persona que ya tiene cuenta, quiero iniciar sesión, para recuperar mis datos en este dispositivo.

```gherkin
Escenario: AC1 — Login exitoso
  Dado que tengo cuenta y conexión
  Cuando ingreso mi email y contraseña correctos
  Entonces quedo autenticado
  Y comienza la restauración de mis datos (RF-SYNC-03)

Escenario: AC2 — Credenciales incorrectas
  Dado que ingreso un email o una contraseña incorrectos
  Cuando confirmo
  Entonces veo "Email o contraseña incorrectos"
  Y el mensaje no indica cuál de los dos falló (RN-AUTH-02)

Escenario: AC3 — Sin conexión
  Dado que no tengo conexión
  Cuando intento iniciar sesión
  Entonces veo que necesito conexión para iniciar sesión
  Y puedo seguir usando la app como invitado
```

---

### RF-AUTH-04 — Continuar con Google

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Should | Borrador | Invitado | RN-AUTH-03 | ADR-0001 |

**Historia:** Como invitado, quiero entrar con mi cuenta de Google, para no tener que crear ni recordar otra contraseña.

```gherkin
Escenario: AC1 — Primera vez con Google
  Dado que no tengo cuenta en la app
  Cuando elijo "Continuar con Google" y autorizo con mi cuenta de Google
  Entonces se crea mi cuenta y quedo autenticado
  Y mis datos de invitado pasan a la cuenta (RF-AUTH-05)

Escenario: AC2 — Ya tenía cuenta con Google
  Dado que ya había entrado antes con esa cuenta de Google
  Cuando elijo "Continuar con Google" y autorizo
  Entonces quedo autenticado en mi cuenta existente
  Y comienza la restauración de mis datos (RF-SYNC-03)

Escenario: AC3 — Mismo email que una cuenta con contraseña
  Dado que existe una cuenta con email y contraseña en "ana@mail.com"
  Cuando continúo con una cuenta de Google con el mismo email
  Entonces no se crea ni se vincula ninguna cuenta (RN-AUTH-03)
  Y veo "Ya tenés una cuenta con este email. Entrá con tu contraseña"
  Y sigo como estaba

Escenario: AC4 — El usuario cancela
  Dado que inicié "Continuar con Google"
  Cuando cancelo en la pantalla de Google
  Entonces vuelvo a la pantalla anterior sin mensaje de error
  Y sigo como estaba (invitado)

Escenario: AC5 — Sin conexión
  Dado que no tengo conexión
  Cuando elijo "Continuar con Google"
  Entonces veo que necesito conexión y puedo seguir como invitado
```

**Notas:**
- Requiere un development build de Expo y la configuración del cliente OAuth en Google Cloud (ADR-0007, ADR-0001 R7).
- La vinculación automática de Supabase tiene que quedar **deshabilitada o neutralizada**. Se verifica en el spike técnico (ADR-0001 R10).
- Queda en **Should** para reducir el alcance: el MVP funciona completo con email y contraseña.

---

### RF-AUTH-05 — Migrar los datos del invitado a la cuenta

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Invitado → Usuario registrado | RN-AUTH-04, RN-SYNC-01 | ADR-0003 |

**Historia:** Como invitado que ya entrenó con la app, quiero que al crear mi cuenta o iniciar sesión mis entrenamientos no se pierdan, para no empezar de cero.

```gherkin
Escenario: AC1 — Registro nuevo con datos de invitado
  Dado que como invitado tengo rutinas y entrenamientos registrados
  Cuando creo una cuenta nueva (RF-AUTH-02 o RF-AUTH-04)
  Entonces todos mis datos de invitado pasan a pertenecer a la cuenta
  Y se suben al servidor (RF-SYNC-01)

Escenario: AC2 — Login a una cuenta existente con datos de invitado
  Dado que como invitado tengo datos (RN-AUTH-05): 3 entrenamientos y 1 rutina
  Y la cuenta en la que inicio sesión también tiene datos
  Cuando inicio sesión
  Entonces veo el diálogo D01 "En este teléfono tenés 3 entrenamientos y 1 rutina…"
  Y las opciones son "Sumar a mi cuenta" y "Descartar"

Escenario: AC3 — Sumar a la cuenta existente
  Dado que se me preguntó si sumar mis datos de invitado
  Cuando elijo "Sumar a mi cuenta"
  Entonces mis datos de invitado se agregan a los de la cuenta sin reemplazar ninguno (RN-AUTH-04)
  Y el perfil de la cuenta se conserva y el del invitado se descarta
  Y la rutina activa es la de la cuenta, o la del invitado si la cuenta no tenía ninguna
  Y la rutina del invitado queda disponible en "Mis rutinas"

Escenario: AC4 — Descartar requiere confirmación
  Dado que se me preguntó si sumar mis datos de invitado
  Cuando elijo "Descartar"
  Entonces se me pide confirmar que esos datos se van a borrar de forma permanente
  Y solo se borran si confirmo

Escenario: AC5 — Invitado sin datos
  Dado que soy invitado y no tengo datos (RN-AUTH-05)
  Cuando inicio sesión en una cuenta existente
  Entonces no se me pregunta nada y se restauran los datos de la cuenta

Escenario: AC6 — La subida falla después de migrar
  Dado que mis datos de invitado ya pasaron a la cuenta
  Cuando la subida al servidor falla o se corta la conexión
  Entonces los datos quedan como cambios pendientes en el dispositivo
  Y se suben en el próximo intento de sincronización, sin que se pierda ninguno

Escenario: AC7 — Cuenta sin datos
  Dado que como invitado tengo datos
  Y la cuenta en la que inicio sesión no tiene datos
  Cuando inicio sesión
  Entonces mis datos, perfil incluido, pasan a la cuenta sin preguntar
  Y no repito el onboarding

Escenario: AC8 — Entrenamiento en curso del invitado
  Dado que como invitado tengo un entrenamiento en curso
  Cuando inicio sesión y sumo mis datos
  Entonces el entrenamiento en curso sigue en el dispositivo y se sube recién al finalizarlo (RN-SYNC-13)

Escenario: AC9 — Cancelar la unión
  Dado que veo D01
  Cuando elijo "Cancelar"
  Entonces se cierra la sesión de autenticación y sigo como invitado con mis datos intactos

Escenario: AC10 — Unión interrumpida
  Dado que la app se cerró mientras se unían mis datos
  Cuando la vuelvo a abrir
  Entonces la unión se retoma desde el principio, sin duplicar ni perder datos (07 §4.3)
```

**Notas:** el algoritmo está en [07 §4.3](../07-datos-y-sincronizacion.md#43-unión-de-los-datos-del-invitado-rf-auth-05-rn-auth-04). La migración es local, en una transacción, y después se sincroniza.

---

### RF-AUTH-06 — Mantener la sesión de autenticación, también sin conexión

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Usuario registrado | RN-SYNC-01 | ADR-0001 |

**Historia:** Como usuario registrado, quiero seguir logueado aunque cierre la app o pierda la señal, para no tener que volver a ingresar credenciales en el gimnasio.

```gherkin
Escenario: AC1 — Reabrir la app
  Dado que estoy autenticado
  Cuando cierro la app y la vuelvo a abrir, con o sin conexión
  Entonces sigo autenticado sin ingresar credenciales

Escenario: AC2 — Token vencido sin conexión
  Dado que mi token de acceso venció y no tengo conexión
  Cuando uso la app
  Entonces puedo seguir usando todas las funciones de entrenamiento
  Y mis cambios quedan pendientes de sincronizar

Escenario: AC3 — Renovación transparente
  Dado que mi token de acceso venció
  Cuando recupero la conexión
  Entonces la sesión de autenticación se renueva sin intervención
  Y los cambios pendientes se suben (RF-SYNC-01)

Escenario: AC4 — Sesión de autenticación revocada o vencida en el servidor
  Dado que el servidor rechaza la renovación de mi sesión de autenticación
  Cuando la app lo detecta
  Entonces S21 muestra "Tu sesión venció" con "Volver a entrar", sin interrumpir un entrenamiento en curso
  Y mis datos locales y cambios pendientes se conservan
  Y si vuelvo a entrar con la misma cuenta, los cambios pendientes se suben

Escenario: AC5 — Otra cuenta en el mismo dispositivo
  Dado que en el dispositivo hay datos de mi cuenta A (con la sesión activa o vencida)
  Cuando intento iniciar sesión con otra cuenta B
  Entonces veo "Para entrar con otra cuenta, primero cerrá sesión" (RN-AUTH-07)
  Y ningún dato de A se sube a la cuenta B
```

---

### RF-AUTH-07 — Cerrar sesión sin perder datos pendientes

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Must | Borrador | Usuario registrado | RN-SYNC-08 | ADR-0002 |

**Historia:** Como usuario registrado, quiero cerrar sesión sabiendo si tengo datos sin respaldar, para no perder entrenamientos por error.

```gherkin
Escenario: AC1 — Sin cambios pendientes
  Dado que estoy autenticado y no tengo cambios pendientes
  Cuando cierro sesión
  Entonces se eliminan del dispositivo mis datos (excepto el catálogo)
  Y vuelvo a la pantalla de bienvenida

Escenario: AC2 — Con cambios pendientes y conexión
  Dado que tengo cambios pendientes y conexión
  Cuando cierro sesión
  Entonces primero se sincronizan los cambios pendientes mientras veo "Respaldando tus datos…"
  Y si la sincronización termina bien, se cierra la sesión como en AC1

Escenario: AC3 — Con cambios pendientes que no se pueden subir
  Dado que tengo cambios pendientes
  Y no tengo conexión o la sincronización falla
  Cuando cierro sesión
  Entonces veo "Tenés N cambios sin respaldar. Si cerrás sesión ahora, se pierden."
  Y la opción destacada es "Cancelar"
  Y la opción "Cerrar sesión igual" se presenta como acción destructiva

Escenario: AC4 — Entrenamiento en curso
  Dado que tengo un entrenamiento en curso
  Cuando intento cerrar sesión
  Entonces veo D14 y tengo que finalizar o descartar el entrenamiento antes de cerrar sesión
```

**Notas:** los pendientes existen el menor tiempo posible: todo cambio sincronizable se sube a los pocos segundos (RN-SYNC-06). El entrenamiento en curso no cuenta como pendiente (RN-SYNC-08) y bloquea el cierre de sesión (AC4, D14).

---

### RF-AUTH-08 — Recuperar la contraseña

| Prioridad | Estado | Actor | Reglas | ADR |
|---|---|---|---|---|
| Should | Borrador | Invitado con cuenta existente | RN-AUTH-01, RN-AUTH-02 | ADR-0001 |

**Historia:** Como persona que olvidó su contraseña, quiero restablecerla por email, para recuperar el acceso a mis datos.

```gherkin
Escenario: AC1 — Solicitud
  Dado que estoy en "Olvidé mi contraseña" con conexión
  Cuando ingreso un email y confirmo
  Entonces veo "Si existe una cuenta con ese email, te enviamos un enlace"
  Y el mensaje es el mismo exista o no la cuenta (RN-AUTH-02)

Escenario: AC2 — Restablecer
  Dado que abrí el enlace de recuperación en el teléfono
  Cuando ingreso una contraseña nueva que cumple RN-AUTH-01
  Entonces la contraseña se actualiza y quedo autenticado
  Y si tenía datos como invitado, se sigue el flujo de unión (RF-AUTH-05)

Escenario: AC3 — Enlace vencido o inválido
  Dado que el enlace de recuperación venció o ya se usó
  Cuando lo abro
  Entonces veo que el enlace no es válido y la opción de pedir uno nuevo
```

---

### RF-AUTH-09 — Eliminar la cuenta

**Won't.** Decisión del equipo para el MVP. Se declara como limitación conocida: Google Play lo exige para publicar, y la app no se publica.
