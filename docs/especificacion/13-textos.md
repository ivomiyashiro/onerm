# 13 — Catálogo de textos (copy)

Son los textos de la interfaz que ya están definidos, para usarlos **tal cual en los mocks**. En el código viven en `presentation/strings` (RNF-21). `{llaves}` = parámetros.

## 1. Tono

- Castellano rioplatense con **voseo**. Frases cortas. Hablamos **con** la persona, no **sobre** ella.
- **Novato:** sin jerga. Nunca "RIR", "1RM", "e1RM", "volumen" ni "descarga" en la primera línea: se explican con palabras.
- **Intermedio y avanzado:** pueden aparecer términos técnicos y números en el detalle.
- En todos los errores se dice **qué pasó** y **qué se puede hacer**.
- **Plurales.** Los textos de este catálogo están escritos en plural. Con **{n} = 1** se usa el singular en toda la frase: «1 día», «1 serie», «Hecho hace 1 día», «1 cambio sin respaldar», «Te falta 1 ejercicio». Las frases que cambian más que el sustantivo están en la tabla de abajo. Con **{n} = 0**, solo se muestran los casos de la tabla; en los demás el texto no aparece (no hay pendientes, conflictos ni resultados que contar).

| Texto | {n} = 1 | {n} = 0 |
|---|---|---|
| D02: Lo empezaste el {fecha} y registraste {n} series. | …y registraste 1 serie. | Lo empezaste el {fecha} y todavía no registraste series. |
| D09: Se borran las {n} series registradas. | Se borra la serie registrada. | Se descarta el entrenamiento, que no tiene series. |
| D12: …se borra junto con {n} registros que dependen de él. | …se borra junto con 1 registro que depende de él. | …se borra. |
| D16: Se eliminan el entrenamiento y sus {n} series. | Se eliminan el entrenamiento y su serie. | Se elimina el entrenamiento. |
| D01 / D01b: {n_ent} entrenamientos y {n_rut} rutinas | 1 entrenamiento · 1 rutina (cada uno por separado) | Se omite la parte en cero: «En este teléfono tenés 3 entrenamientos.» |
| Motivo `COMPLETE_SETS`: Hacé las {series} series con… | Hacé la serie con… | — |

## 2. Onboarding

**Paso 1: "¿Cuánta experiencia tenés entrenando con pesas?"** (RN-PERF-07)

| Opción | Descripción |
|---|---|
| Estoy empezando | Hace menos de 6 meses que entreno, o vuelvo después de un tiempo largo. |
| Tengo algo de experiencia | Entreno regularmente hace entre 6 meses y 2 años. |
| Tengo mucha experiencia | Entreno hace más de 2 años y armo mis propias rutinas. |

**Paso 2: "¿Qué buscás principalmente?"**

| Opción | Descripción |
|---|---|
| Sentirme mejor y más fuerte | Salud general: entrenar de forma segura y constante. |
| Ganar músculo | Aumentar el tamaño muscular. |
| Ganar fuerza | Poder levantar más peso. |

**Paso 3: "¿Cuántos días por semana podés entrenar?"** Opciones del 2 al 6. Ayuda: "Siendo realista: es mejor poco y constante."

**Recomendación:** "Te recomendamos **{plantilla}**", seguido de "¿Por qué?" (§5). Botones: **Empezar con esta rutina** · Ver otras rutinas · Ahora no.
- Novato con 4 o más días: "Con 3 días alcanza para progresar. Si querés más, también tenés la de 4 días."
- Intermedio con 5 o 6 días: "Esta rutina es de 4 días: podés repetir la rotación sin problema."

## 3. Esfuerzo

- **Escala simple** (RN-ENT-03): "¿Cuántas más podías hacer?" → **Ninguna** · **1** · **2 o 3** · **4 o más**.
- **RIR numérico:** "Repeticiones en reserva (RIR)" → **0** · **1** · **2** · **3** · **4** · **5+**. Ayuda: "0 = no podías hacer ni una más."
- **En calibración:** "Contanos cuántas más podías hacer: con eso calculamos tu peso."

## 4. Motivos de sugerencia

Hay una **línea breve** debajo de la sugerencia, en dos versiones (novato y avanzado), y un **detalle** en "¿Por qué?" (S10). {W} = carga de trabajo, {n} = cantidad, {d} = días.

| Código | Línea (novato) | Línea (avanzado) | Detalle ("¿Por qué?") |
|---|---|---|---|
| `CALIBRATION` | Primera vez: elegí un peso con el que puedas hacer entre {piso} y {tope} con buena técnica. | Calibración: elegí una carga para {piso}–{tope}. | Todavía no tenemos datos tuyos en este ejercicio. Con esta serie estimamos tu peso de trabajo. |
| `CALIBRATION_STEP` | Te sobró bastante: probá con {carga}. | Carga liviana (RTF {rtf}): +20 % → {carga}. | Hiciste {reps} y te sobraban {rir} o más. Subimos para encontrar tu peso real. |
| `CALIBRATION_STEP_DOWN` | Era mucho peso: probá con {carga}. | 0 reps: −20 % → {carga}. | No pudiste completar ninguna repetición. Bajamos para encontrar tu peso de trabajo. |
| `ESTIMATED_FROM_E1RM` | Calculado a partir de lo que hiciste en {ejercicio} el {fecha}. | Estimado desde e1RM {e1rm} ({fecha}). | Tu mejor serie reciente ({carga} × {reps}) indica un máximo estimado de {e1rm}. Para {piso} repeticiones dejando {rir_obj} en reserva, corresponde {carga_sug}. |
| `FROM_EXERCISE_HISTORY` | Arrancamos con el peso que usaste la última vez. | Última W: {W}. | No pudimos estimar tu máximo con esas series, así que repetimos tu último peso de trabajo. |
| `PRESCRIPTION_CHANGED` | Cambiaste el rango: recalculamos tu peso para {piso}–{tope}. | Nueva prescripción: recalculado desde e1RM {e1rm}. | Tu rutina ahora pide {piso}–{tope} repeticiones. Recalculamos para no pedirte un peso que no corresponde. |
| `REENTRY` | Volvés después de {d} días: arrancamos un poco más liviano. | Reentrada ({d} días): −{p} %. | Después de una pausa la fuerza baja un poco. Retomamos más liviano y volvés a subir rápido. |
| `DELOAD` | Hace {n} veces que no mejorás: bajamos un poco para tomar envión. | Descarga por estancamiento: −10 %. | En tus últimas {n} veces no superaste tu mejor marca ({marca}). Bajar un poco ayuda a recuperarse y a volver a progresar. |
| `CONSOLIDATE` | Llegaste al máximo, pero te costó mucho: repetí este peso una vez más. | Consolidar: tope con RIR {rir_medio} (objetivo {rir_obj}). | Completaste el rango, pero muy cerca del límite dos veces seguidas. Lo repetimos una vez antes de subir. |
| `EARLY_INCREASE` | Te está sobrando: subimos a {carga}. | Subida anticipada: RIR {rir_medio} sostenido. | Dos veces seguidas te sobraron {rir_medio} o más. Subimos sin esperar a que llegues al tope. |
| `HIGH_INCREASE` | ¡Muy bien! Te sobró bastante: subimos a {carga}. | +10 %: tope con RIR {rir_medio}. | Completaste el rango y te sobraba mucho: subimos más que lo habitual. |
| `INCREASE_LOAD` | ¡Completaste {series} × {tope}! Subimos a {carga}. | Tope alcanzado: +{p} % → {carga}. | Cuando completás el tope en todas las series, subimos el peso y volvés al piso del rango (doble progresión). *Si el salto es mayor al 10 %:* "Es el salto más chico disponible con tu equipamiento; por eso antes sumaste repeticiones extra." |
| `EXTEND_REPS` | Antes de subir, intentá {reps}: el próximo peso es un salto grande. | Overshoot: {reps} (tope + 2) antes de +{p} %. | El siguiente peso disponible ({carga_sig}) es más de un 10 % mayor. Primero sumás repeticiones para que el salto sea manejable. |
| `ADD_REP` | Mismo peso, intentá {reps} repeticiones. | W {W} · objetivo {reps}. | La última vez hiciste {reps_prev}. Sumamos una repetición hasta llegar a {tope}. |
| `COMPLETE_SETS` | Hacé las {series} series con {carga} × {tope} para subir. | Completar {series} series al tope. | La última vez llegaste al tope, pero en menos series que las prescriptas. |
| `REPEAT` | Repetí {carga} × {piso}: la última vez quedaste cerca. | Repetir: debajo del piso. | Alguna serie quedó por debajo de {piso}. Repetimos el peso para consolidarlo. |
| `BODYWEIGHT_CALIBRATION` | Hacé las que puedas con buena técnica y frená cuando te queden 1 o 2. | Calibración (peso corporal). | Con esta serie sabemos por dónde arrancar. |
| `BODYWEIGHT_ADD_REP` | Intentá {reps} repeticiones. | Objetivo {reps}. | Sumamos una repetición por vez hasta {tope}. |
| `BODYWEIGHT_READY` | ¡Llegaste al máximo! Probá una variante más difícil. | Tope alcanzado: progresá la variante. | Sin peso externo, el siguiente paso es un ejercicio más exigente. |

**Agregados:**
- **Reentrada combinada** (`withReentry`, sumado a la línea): "…y como volvés después de {d} días, arrancamos un poco más liviano."
- **Lado limitante** (unilaterales, en el detalle): "Tomamos tu lado {lado}, que hizo {reps}."
- **"En qué nos basamos"**, al pie del detalle: enlace al resumen del principio correspondiente (§6).

## 5. "¿Por qué esta rutina?" (plantillas)

- **PLT-FB3 — Cuerpo completo A/B, 3 días:** "Trabajás todo el cuerpo en cada sesión y cada músculo unas 3 veces por semana, lo que te da mucha práctica de cada movimiento. Usamos máquinas, poleas y mancuernas porque son más fáciles de aprender y dan resultados parecidos a la barra. Las sesiones duran alrededor de una hora o menos."
- **Aviso con objetivo fuerza** (S06, S14): "Estas rutinas usan máquinas y mancuernas. Si tu meta es levantar más en sentadilla, banca o peso muerto con barra, podés armar tu propia rutina con esos ejercicios."
- **PLT-FB2 — Cuerpo completo, 2 días:** "Si tenés poco tiempo, 2 días bien hechos ya generan mejoras importantes. Cada músculo trabaja 2 veces por semana. Hacemos alguna serie más por ejercicio para compensar."
- **PLT-TP4 — Torso / Pierna, 4 días:** "Separamos tren superior e inferior para meter más trabajo por músculo sin alargar las sesiones. Cada músculo trabaja 2 veces por semana. Incluye ejercicios con más técnica, pensados para quien ya tiene experiencia."

## 6. "En qué nos basamos" (resúmenes de P-01 a P-13)

| Principio | Resumen en lenguaje llano |
|---|---|
| P-01 | Lo que más resultado da es entrenar de forma regular. Un buen plan que cumplís le gana a un plan perfecto que abandonás. |
| P-02 | Entrenar cada músculo al menos 2 veces por semana funciona mejor que 1. |
| P-03 | Unas 10 series por semana por músculo es una buena referencia. Más ayuda, pero cada vez menos. |
| P-04 | Para ganar músculo sirven muchos rangos de repeticiones. Para ganar fuerza conviene más peso con menos repeticiones. |
| P-05 | No hace falta llegar al fallo: alcanza con quedarte cerca, dejando 1 a 3 repeticiones en reserva. |
| P-06 | A todos nos cuesta estimar cuántas repeticiones nos quedaban: por eso no reaccionamos a una sola serie. |
| P-07 | Descansar más de un minuto entre series ayuda a rendir mejor. |
| P-08 | Los ejercicios principales van primero, cuando estás más fresco. |
| P-09 | Máquinas y pesos libres dan resultados parecidos: lo importante es la constancia y el esfuerzo. |
| P-10 | Con el peso y las repeticiones podemos estimar tu máximo sin que tengas que probarlo. |
| P-11 | Sumar repeticiones funciona igual que sumar peso: por eso alternamos las dos cosas. |
| P-12 | Si te estancás, bajar un poco el peso por un tiempo ayuda a volver a progresar. Es una práctica habitual con poca evidencia formal. |
| P-13 | Después de un tiempo sin entrenar la fuerza baja, así que retomamos un poco más liviano. |

## 7. Estados vacíos

| Pantalla | Título | Texto | Acción |
|---|---|---|---|
| S07 sin rutina | Todavía no tenés una rutina | Elegí una de las nuestras o armá la tuya. | **Elegir una rutina** · Crear rutina |
| S13 Mis rutinas | Sin rutinas | Tus rutinas van a aparecer acá. | Ver plantillas |
| S16 sin resultados | No encontramos ejercicios | Probá con otra palabra o quitá filtros. | Limpiar filtros |
| S18 historial | Todavía no hay entrenamientos | Cuando termines tu primer entrenamiento lo vas a ver acá. | Empezar el próximo |
| S20 con 1 punto | ¡Buen comienzo! | Entrená este ejercicio un par de veces más para ver tu evolución. | — |

## 8. Diálogos

| ID | Título | Cuerpo | Botones (el destacado va primero) |
|---|---|---|---|
| D01 Unir datos del invitado | ¿Sumamos tus datos a la cuenta? | En este teléfono tenés {n_ent} entrenamientos y {n_rut} rutinas. Podés sumarlos a tu cuenta o descartarlos. | **Sumar a mi cuenta** · Descartar · Cancelar |
| D01b Confirmar descarte | ¿Descartar tus datos? | Se van a borrar de este teléfono {n_ent} entrenamientos y {n_rut} rutinas{, y el entrenamiento en curso}. No se puede deshacer. | **Cancelar** · Descartar (destructivo) |
| D02 Entrenamiento abandonado | Tenés un entrenamiento sin terminar | Lo empezaste el {fecha} y registraste {n} series. | **Finalizarlo** · Continuar · Descartar |
| D03 Cerrar sesión con pendientes | Tenés {n} cambios sin respaldar | Si cerrás sesión ahora, se pierden. Conectate para respaldarlos antes. | **Cancelar** · Cerrar sesión igual (destructivo) |
| D14 Terminá tu entrenamiento primero | Terminá tu entrenamiento primero | Tenés un entrenamiento en curso. Finalizalo o descartalo para {acción: cerrar sesión / cambiar de rutina / eliminar esta rutina}. | **Ir al entrenamiento** · Cancelar |
| D05 Permiso de notificaciones | Te avisamos cuando termine el descanso | Así podés guardar el teléfono y te avisamos aunque la pantalla esté bloqueada. | **Permitir** · Ahora no |
| D06 Ajustar la rutina al objetivo | ¿Ajustamos tu rutina? | Cambiaste tu objetivo a {objetivo}. Podemos actualizar repeticiones, esfuerzo y descansos. Tus ejercicios y su orden no cambian. | **Ajustar** · Dejar como está |
| D07 Reemplazar la rutina activa | ¿Usar {rutina} como tu rutina? | {rutina_actual} queda guardada en Mis rutinas con todo su historial. | **Usar esta rutina** · Cancelar |
| D08 Cambios sin guardar | ¿Salir sin guardar? | Vas a perder los cambios en esta rutina. | **Seguir editando** · Salir sin guardar |
| D09 Descartar el entrenamiento | ¿Descartar el entrenamiento? | Se borran las {n} series registradas. | **Cancelar** · Descartar (destructivo) |
| D10 Finalizar con pendientes | Te faltan {n} ejercicios | Los que no hiciste quedan como salteados. | **Finalizar igual** · Seguir entrenando |
| D11 Eliminar rutina | ¿Eliminar {rutina}? | Tus entrenamientos con esta rutina se conservan en el historial. | **Cancelar** · Eliminar (destructivo) |
| D12 Cambio que no se pudo respaldar | No pudimos respaldar un cambio | {detalle}. Si lo descartás, {vuelve a la versión guardada / se borra junto con {n} registros que dependen de él}. | **Reintentar** · Descartar este cambio (destructivo) · Cerrar |
| D13 Sugerencia de crear cuenta | Guardá tu progreso | Tus datos solo están en este teléfono. Creá una cuenta gratis para no perderlos. | **Crear cuenta** · Ahora no |
| D15 Activar rutina nueva | ¿Empezar a usar {rutina}? | La vas a ver en Inicio como tu rutina actual. | **Activar** · Ahora no |
| D16 Eliminar del historial | ¿Eliminar {esta serie / este entrenamiento}? | {Se elimina la serie. / Se eliminan el entrenamiento y sus {n} series.} Tus sugerencias se recalculan. | **Cancelar** · Eliminar (destructivo) |
| D17 Permiso de alarmas exactas (Android 12+) | Para avisarte justo a tiempo | Sin este permiso no podemos avisarte con la pantalla bloqueada. Activá «Alarmas y recordatorios» para OneRM. | **Abrir ajustes** · Ahora no |

**Snackbar de deshacer** (RF-ENT-04): "Serie eliminada" · **Deshacer** (visible 5 s).

## 9. Avisos, errores y estados de sync

| Situación | Texto |
|---|---|
| Sin conexión para acciones de cuenta | Necesitás conexión para {acción}. Podés seguir entrenando sin cuenta. |
| Credenciales incorrectas | Email o contraseña incorrectos. |
| Email existente (registro) | Ya existe una cuenta con este email. **Iniciar sesión** |
| Google con un email que tiene contraseña (RN-AUTH-03) | Ya tenés una cuenta con este email. Entrá con tu contraseña. |
| Registro con un email de Google (RN-AUTH-03) | Ya tenés una cuenta con este email. Entrá con Google. |
| Recuperación enviada | Si existe una cuenta con ese email, te enviamos un enlace. |
| Enlace de recuperación inválido | Este enlace ya no es válido. **Pedir uno nuevo** |
| Sync: respaldado | Respaldado · hace {tiempo} |
| Sync: sincronizando | Respaldando… |
| Sync: pendiente sin conexión | {n} cambios sin respaldar · sin conexión |
| Sync: pendiente con conexión | {n} cambios por respaldar… |
| Sync: entrenamiento en curso | Tu entrenamiento se respalda al finalizarlo. |
| Sync: sesión vencida | Tu sesión venció. Tus datos siguen en este teléfono. **Volver a entrar** |
| Login con otra cuenta (RN-AUTH-07) | Para entrar con otra cuenta, primero cerrá sesión. |
| Sync: conflicto | {n} cambios no se pudieron respaldar · **Ver** |
| Sync: error de red | No pudimos respaldar. Lo intentamos de nuevo solos. **Reintentar** |
| Sync: invitado | Sin respaldo: tus datos solo están en este teléfono. **Crear cuenta** |
| Sync: app vieja | Actualizá la app para respaldar tus datos. |
| Restaurando | Restaurando tus datos… {porcentaje} |
| Restauración incompleta | Faltan datos por restaurar. Las sugerencias pueden no estar al día. |
| Permiso de notificaciones rechazado (S09) | Activá las notificaciones para que te avisemos con la pantalla bloqueada. **Activar** |
| Alarmas exactas no permitidas (S09) | Permití las alarmas para que te avisemos a tiempo con la pantalla bloqueada. **Permitir** |
| Ejercicio ausente del catálogo | Ejercicio no disponible todavía. |
| Ejercicio obsoleto | Ya no está en el catálogo. **Reemplazar** |
| Error al preparar los datos (migración) | No pudimos preparar tus datos. **Reintentar** |
| Unidad de carga | por mancuerna · por lado · total con barra |
| Advertencia de RIR 0 (S15) | RIR 0 significa ir al fallo en cada serie. No lo recomendamos: no suma fuerza y aumenta la fatiga. |
| Validación de serie | La carga tiene que estar entre 0 y 1000 {unidad}. · Las repeticiones tienen que estar entre 0 y 100. |
| Validación de rutina | El nombre no puede estar vacío. · El mínimo no puede ser mayor que el máximo. · Agregá al menos un ejercicio a {día}. |
| Notificación de fin de descanso | Título: "¡Descanso terminado!" · Cuerpo: "Siguiente: {ejercicio} · {carga} × {reps}" |
| Inicio: continuar | Continuar entrenamiento |
| Inicio: cambiar día | Cambiar día |
| Selector de día | Hecho hace {n} días · Nunca hecho · Te toca hoy |
| Ayuda de entrada en calor (S09, primer ejercicio principal) | Antes de empezar, hacé 1 o 2 series livianas del mismo movimiento y marcalas como calentamiento. |

## 10. Textos agregados en el diseño (2026-10-01)

Surgieron al diseñar S07, S09 y el sistema de componentes. Siguen las reglas de §1.

| Lugar | Texto |
|---|---|
| S09: fila de la serie (esfuerzo) | Ninguna más · 1 más · 2 o 3 más · 4 o más · ¿Cuántas más? (falta elegir) · Ahora (serie actual) · Editando |
| S09: encabezado de la serie actual | Serie {n} de {total} · Ejercicio completo · Ejercicio {n} de {total} |
| S09: acción principal | Hecho · Siguiente ejercicio · Finalizar entrenamiento |
| S09: menú del ejercicio | Sustituir ejercicio · Saltear ejercicio · Agregar serie |
| S09: menú del entrenamiento | Entrenamiento · {día} · Finalizar entrenamiento · Descartar entrenamiento |
| S09: temporizador | +15 s · Reiniciar · Saltear (nombre accesible: "Saltear descanso") · ¡Descanso terminado! · Siguiente: {ejercicio} · {carga} × {reps} · Último ejercicio terminado |
| S09: calibración | Falta esfuerzo · Elegí una opción arriba para seguir. |
| S09: ejercicio no disponible | Lo podés sustituir por otro del mismo músculo o saltearlo. |
| S09: editar serie | Eliminar serie · Guardar · Aceptar (teclado numérico) |
| S09: paso de carga (nombre accesible) | {campo}: {valor} {unidad}. Tocá para escribir |
| S09: lista de ejercicios | Ejercicios de hoy · {hechas}/{total} · Salteado |
| S09: unilateral dividido | Reps izq. · Reps der. · Izq · Der · Distinto por lado · Repeticiones en reserva (RIR) · 0 = no podías hacer ni una más. |
| S09: peso corporal y cierre | Sin carga: peso corporal · Completo (ejercicio terminado) |
| S09: editar serie y carga | Editar serie {n} · Carga · Serie {n} · {ejercicio} · Cancelar · La carga tiene que estar entre 0 y 1000 kg. |
| Botón central de la barra de pestañas | Empezar · Continuar · {tiempo} (dentro del botón). Nombre accesible: "Empezar {día}" · "Continuar entrenamiento, {tiempo}" · "Empezar, no disponible" (deshabilitado) |
| S07 | Hoy toca · {n} ejercicios · {n} series · ~{min} min · Esta semana · {hechos} de {meta} · Hoy · Lo de hoy · Sube en {n} · suma reps en {n} · Calibrar · En curso · {tiempo} · Arrancá hoy |
| S09: encabezado | Ver todos · {n} de {total} · Tocá uno para ir (lista) · Guardar cambios (editar serie) · Se respalda al finalizar (solo con cuenta, 08 §5) |
| S08 | Elegir día (título de la hoja) · {rutina} · {n} días · Elegir {día} · Recomendado · Hecho hace {n} días · Nunca hecho |
| S12 | Entrenamiento · {día} · Terminado · Duración · Series · Ejercicios · {hechos} de {total} · Récords de hoy · Nuevo récord · Mayor carga · Nuevo récord · Máximo estimado · {valor} (aprox. si corresponde) · Lo que hiciste · {n} series · mejor {carga} × {reps} · Salteado · Próximo: {día} · Listo |
| S10 | ¿Por qué {carga} × {reps}? · La última vez · Esfuerzo medio · Subida · En qué nos basamos: {principio} · Entendido · *Avanzado:* La última vez · RIR medio · Reserva media · Máximo estimado (aprox.) · Tope del rango · Días sin entrenar · W anterior · Ajuste. Títulos por motivo: ¿Por qué elegís vos el peso? (calibración) |
| S09: lista de ejercicios (subtítulo) | {día} · {n} de {total} |
| S01 | Cada serie, con el peso justo. · Te sugerimos la carga de cada serie y te explicamos por qué. Funciona sin conexión. · Continuar sin cuenta · Crear cuenta · Iniciar sesión |
| S05 | Paso {n} de 3 · Saltear · Atrás · Siguiente · Ver mi rutina |
| S06 | Te recomendamos · {n} días · ~{min} min · Máquinas y mancuernas · ¿Por qué? |
| S23 | {hechos} de {total} registros · Si se corta la conexión, lo que ya bajó queda guardado y seguimos solos después. · Se cortó la conexión · Podés seguir usando la app. Terminamos de restaurar solos cuando vuelva la conexión. · Continuar |
| S09: notas de los pasos | Subimos {n} kg · Bajamos {p} % · Mismo peso · Volvés a {piso}: piso del rango · {n} más que el tope · Rango {piso} a {tope} |
| S09: calibración y sustitución | Primera vez (etiqueta) · Contanos cuántas más podías hacer en la serie {n}: con eso calculamos tu peso. · Serie {n} de {total} · hecha · Sustituto · En lugar de {ejercicio}. Solo para hoy. · Siguiente: serie {n} de {total} · {carga} × {reps} |
| S11 | Sustituir ejercicio · En lugar de {ejercicio} · Buscar ejercicio · Mismo músculo · Otros ejercicios · No encontramos ejercicios · Probá con otra palabra o elegí uno del mismo músculo. · Ver el mismo músculo |
| Errores de lectura (S07, S13, S18) | No pudimos cargar {tu inicio / tus rutinas / tu historial} · Tus datos siguen guardados en este teléfono. Probá de nuevo. · Reintentar |
| Arranque: error al preparar los datos | No pudimos preparar tus datos · Tus entrenamientos están a salvo. Cerrá y volvé a abrir la app, o probá de nuevo. · Reintentar |
| S17 no disponible todavía | Ejercicio no disponible todavía. Lo estamos actualizando: cuando tengas conexión aparece completo. |
| S19 edición | Listo (sale de la edición) · Eliminar entrenamiento (en el menú) |
| S13 | Rutinas · Mis rutinas · Plantillas · Rutina activa · Recomendada para vos · Crear rutina · {n} días · {nivel} · ~{min} min · Las plantillas se copian a Mis rutinas cuando las usás: después podés cambiarlas sin afectar el original. · Menú: Editar · Activar · Duplicar · Eliminar rutina |
| S14 | Plantilla · ¿Por qué esta rutina? · Prescripción calculada para tu objetivo: {objetivo} ({rango} repeticiones, dejando {rir} en reserva). · Día {x} · {n} ejercicios · {n} series × {rango} · Principal · Accesorio · Usar esta rutina · Ver las fuentes completas |
| S15 (editor) | Editar rutina · Nombre de la rutina · + Día · Agregar ejercicio · Arrastrá desde el asa o usá las flechas para cambiar el orden. · Guardar · Este día no tiene ejercicios · Agregá al menos uno, o quitá el día. · El {día} no tiene ejercicios · Agregá al menos uno para poder guardar, o quitá el día. · reserva {n} (en las filas, en lugar de "RIR {n}") · El mínimo no puede ser mayor que el máximo. · {n} = terminás cada serie sintiendo que podías hacer {n} más. · Los ejercicios principales suelen ir primero para rendir más en fuerza. (RF-RUT-05 AC4) |
| S16 / S17 | Agregar al {día} · {n} ejercicios · Más filtros · Cómo se hace · Principales · Secundarios · Ver mi progreso · Fuente: {fuente} · {licencia} · Este ejercicio ya no está en el catálogo. Tus rutinas y registros que lo usan se conservan. · No disponible |
| S18 | Progreso · Historial · Volumen · {mes} {año} · {duración} min · {n} series · {n} récords · Pendiente · Esta semana · {fecha} – {fecha} · {n} de {meta} entrenamientos · Series por semana · Referencia: 10 · Rango guía: 8 a 12 series por músculo. Contamos 1 por cada serie de un músculo principal y 0,5 si es secundario. · ¿Por qué 10 series? |
| S19 | Entrenamiento · Editar entrenamiento · {día_semana} {d} de {mes} · Sustituye a {ejercicio} · Salteado · Tocá una serie para corregirla. Tus sugerencias se recalculan solas. · Agregar serie · Eliminar entrenamiento |
| S20 | Máximo estimado · Mayor carga · Mejor serie · récord · aproximado · 4 semanas · 3 meses · Todo · Máximo estimado en {unidad} · Precisión alta · Aproximada · Récord · Calculado con el peso y las repeticiones que hiciste. Los puntos huecos son aproximados (series largas). El punto lima es tu récord. · Sin e1RM: Repeticiones totales · Repeticiones de la mejor serie ({carga}) · Con más de 15 repeticiones no podemos estimar tu máximo con precisión, así que te mostramos tu mejor serie. · Mejor serie de cada entrenamiento · Máximas reps · Reps totales · Máximas repeticiones por entrenamiento · Es un ejercicio de peso corporal: seguimos tus repeticiones, sin máximo estimado. |
| Récord | Nuevo récord |
| S21 | Perfil · Invitado · Sin cuenta · Entrenamiento · Nivel · Objetivo · Días por semana · Preferencias · Unidad de peso · Esfuerzo · Escala simple · Incrementos de peso · Por equipamiento · Notificaciones del descanso · Te avisamos aunque la pantalla esté bloqueada. · Acerca de y créditos · Cerrar sesión · Respaldar ahora · Están bloqueadas en los ajustes del teléfono. Activalas ahí para que te avisemos con la pantalla bloqueada. · Abrir ajustes del teléfono · Alarmas exactas desactivadas: sin ellas no te avisamos con la pantalla bloqueada. · Permitir · Incrementos: Usamos estos saltos para que las sugerencias sean pesos que existen en tu gimnasio. · En kg · Peso de la barra · Si cambiás a lb usamos otros saltos (5 lb, 10 lb): no se convierten. |
| S22 | Acerca de · Versión {versión} · Créditos · Catálogo de ejercicios · Fotos · Tipografías · En qué nos basamos · {n} principios · Los principios detrás de las sugerencias y sus fuentes científicas. |
| S25 | Cambios sin respaldar · No pudimos respaldar estos cambios. Tocá uno para ver qué pasó y qué podés hacer. · Todo respaldado · No hay cambios pendientes. |
| S16 | Buscar ejercicio · Mismo músculo |
| S15 | Series · Reps mín. · Reps máx. · Repeticiones en reserva (en avanzado puede decir "Esfuerzo objetivo (RIR)") · Descanso · Agregar ejercicio |
| S02 / S03 | Continuar con Google · o con tu email · Iniciar sesión · Olvidé mi contraseña · Mostrar contraseña · Ingresando… · No tengo cuenta · Crear cuenta · Ya tengo cuenta · Iniciar sesión · Respaldá tus entrenamientos y usalos en otro teléfono. · Al menos 8 caracteres. · Tiene que tener al menos 8 caracteres. · Revisá el email: falta el dominio (por ejemplo, .com). |
| S04 / S24 | Recuperar contraseña · Te mandamos un enlace para crear una nueva. · Enviar enlace · Revisá tu correo · Enlace enviado · Volver a iniciar sesión · Nueva contraseña · Elegí una contraseña de al menos 8 caracteres. · Guardar y entrar · Los enlaces vencen después de un tiempo o cuando ya se usaron. |
| S09 hoja "Ajustar serie" | Tocá para ajustar · Serie {n} de {total} · Es una serie de calentamiento · ¿Cuántas más podías hacer? · Distinto por lado · Hecho |
| S09 descanso | Descanso · de 2:00 · +15 s · Reiniciar · Saltear descanso · Minimizar · Abrir temporizador · Siguiente: serie {n} de {total} · {carga} × {reps} · ¡Descanso terminado! · Listo para la serie {n} · Ir a la serie {n} |
| S09 menú del entrenamiento y calibración | Entrenamiento · Día A · 18:42 · Finalizar entrenamiento · Descartar entrenamiento · Respondé para seguir: con esto calculamos tu peso para la serie 2. · Siguiente: serie 2 de 3 · peso según tu respuesta · Era mucho peso: en la serie 2 probá con 16 kg. |
| S21 hojas de ajustes | Nivel · Objetivo · Días por semana · Unidad de peso · Esfuerzo · Guardar · Tu rutina no cambia sola: después te preguntamos si querés ajustarla. · Kilos (kg) · Como se ve hoy. · Libras (lb) · Para discos y mancuernas en libras. · Tus datos no cambian: solo cómo se muestran y cómo cargás los pesos. Si cambiás a lb usamos otros saltos (5 lb, 10 lb): no se convierten. · Escala simple · «¿Cuántas más podías hacer?» · Ninguna · 1 · 2 o 3 · 4 o más · RIR numérico · Repeticiones en reserva, de 0 a 5+. Para quien ya lo usa. · Si después cambiás tu nivel, esta elección se mantiene. |
