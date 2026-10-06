# Brief de marca e identidad visual

**Estado:** Borrador (fase 1 del [plan de acción](plan-de-accion.md)) · **Fecha:** 2026-09-30
**Nombre de trabajo:** OneRM (el nombre definitivo está pendiente; la identidad no depende de él).

---

## 1. Personalidad

| Somos | No somos |
|---|---|
| **Basados en evidencia:** cada sugerencia tiene un porqué ([10-fundamentos](../especificacion/10-fundamentos-cientificos.md)) | Gurús de gimnasio que prometen resultados rápidos |
| **Precisos:** 62,5 kg × 8 es un dato, no un "dale con todo" | Ruidosos ni agresivos ("NO PAIN NO GAIN", rojos saturados, llamas) |
| **Tranquilos:** la app acompaña entre series, no compite por la atención | Una red social, un ranking ni un juego con insignias |
| **Cercanos:** voseo, frases cortas, sin jerga para el novato ([13-textos §1](../especificacion/13-textos.md)) | Un manual técnico ni un laboratorio frío |

**En una frase:** un entrenador que sabe de ciencia, habla claro y te dice exactamente qué hacer hoy.

## 2. Contexto de uso (restricciones de diseño)

| Situación | Consecuencia visual |
|---|---|
| Gimnasio con luz variable: tubos fluorescentes, sótanos, ventanales con sol | Contraste alto en ambos modos; el modo oscuro no es un adorno |
| Teléfono a distancia de brazo, apoyado en un banco o en la máquina | **Números grandes** (carga y repeticiones) con dígitos tabulares; jerarquía que se lea en un vistazo |
| Una mano libre, dedos transpirados, entre series | Blancos táctiles de 48 dp y 56 dp (RNF-16); la acción principal abajo (UX-03) |
| Atención fragmentada: 60–180 s de descanso | Un solo foco por pantalla; el color señala qué hacer ahora, no decora |
| Novato como usuario principal | Calma y confianza antes que intensidad; nada que parezca una app "para expertos" |

## 3. Referencias y diferenciación

| App | Qué hace bien | Dónde nos diferenciamos |
|---|---|---|
| **Strong** | Registro rápido y denso, sin distracciones | Es una planilla: no te dice qué hacer ni por qué. Nuestra identidad pone en primer plano la **sugerencia y su motivo** |
| **Hevy** | Registro fluido y comunidad | Su identidad es social (feed, likes). La nuestra es de un **acompañante personal** sin exposición |
| **Fitbod** | Sugerencias automáticas y visual cuidado | Es una caja negra y su estética es de producto "premium". Nosotros somos **explicables** y sobrios |

## 4. Principios visuales

1. **El número es el héroe.** Carga × repeticiones es lo más grande de S07 y S09. La tipografía de datos es la decisión más importante de la identidad.
2. **Un color para actuar.** El primario marca solo la acción siguiente (Hecho, Empezar, la serie en curso). Si todo es primario, nada lo es.
3. **Un segundo color para el tiempo.** El acento se reserva para el temporizador de descanso y los récords: lo que te llama cuando no estás mirando.
4. **Semántica aparte.** Éxito, advertencia y error no se confunden con la marca (estados de sync, validaciones).
5. **Accesible por defecto.** Todo par texto/fondo ≥ 4,5:1 en claro y oscuro (RNF-17), verificado por script, y legible con la fuente al 150 % (RNF-18).

## 5. Direcciones de color

Se comparan sobre maquetas de S07 (Inicio) y S09 (Entrenamiento en curso), en claro y oscuro, en la página de comparación.

| Dirección | Idea | Primario | Acento | Tipografía (datos / texto) |
|---|---|---|---|---|
| **A · Disco calibrado** | Los discos olímpicos: el azul de 20 kg y el amarillo de 15 kg, sobre neutros de acero | Azul `#1747C8` | Amarillo `#F5C518` | Barlow Semi Condensed / Figtree |
| **B · Bitácora** | El cuaderno de entrenamiento con método: petróleo de tinta y ámbar de resaltador | Petróleo `#0D5C63` | Ámbar `#E8A33D` | IBM Plex Mono / IBM Plex Sans |
| **C · Brasa** | Esfuerzo y calor sobre hierro: naranja quemado y grafito | Naranja `#B93C0B` | Grafito `#24272D` | Archivo (condensada) / Onest |

**Contraste verificado** (WCAG 2.x, script en la fase 1): todos los pares clave superan 4,5:1 en ambos modos. El más justo es C claro (primario sobre fondo 5,1:1).

## 6. Decisión (2026-10-01)

Las direcciones de la §5 (A, B y C "tranquilas") se descartaron: se buscó un **feel agresivo, que se note que es de gimnasio**. Se exploraron tres identidades nuevas (Hierro, Peligro, Voltaje) en el lienzo [OneRM identidad agresiva](https://claude.ai/artifact/1KvunqAEsM64C5Zu6mEbe5).

- [x] **Identidad elegida: Peligro.** Amarillo de cinta de seguridad sobre hormigón; modo oscuro como principal.
- [x] **Lenguaje de componentes: V3 · Placas.** Formas redondas de disco (± como discos, temporizador en anillo, botones en píldora), amarillo en bloques grandes, números condensados.
- [ ] Modo claro derivado: _pendiente_
- [ ] Tokens exportados a `tokens.json` y cargados en Figma: _pendiente_

**Ajuste de personalidad:** lo agresivo vive en lo visual (color, tipografía, formas). Los textos siguen el tono de 13-textos (voseo, cercanos, sin jerga para el novato).

**Versión 2 del sistema (2026-10-01).** La primera hoja de componentes se sintió "poco premium" (bordes anchos, botones con contorno). Cambios:
- Profundidad con **capas de superficie y líneas de 1 px** al 7 % de blanco; sin bordes gruesos.
- **Sin botones con contorno:** primario relleno con brillo superior y halo amarillo; secundario relleno gris; terciario solo texto; destructivo con fondo rojo tenue.
- Radios por tamaño (8 → 28 px); las píldoras quedan solo para chips, etiquetas y pestañas.
- **Movimiento** con 4 tokens (presión 120 ms, estado 200–360 ms, resorte 320 ms, entrada 320 ms) y respeto de "reducir movimiento".
- Se sumaron campos de texto, controles, carga, esqueletos, estados de respaldo, avisos, vacíos, errores, diálogo y hoja inferior.

| Token | Valor | Uso |
|---|---|---|
| `bg` | `#0E0E0D` | Fondo |
| `s1` / `s2` / `s3` | `#161615` / `#1E1E1C` / `#292926` | Tarjetas / campos y controles / secundario y ± |
| `hair` | `rgba(255,255,255,.07)` | Líneas de 1 px |
| `tx` / `mu` | `#F4F4EF` / `#A3A39B` | Texto (17,5:1) / secundario (7,6:1) |
| `y` / `ink` / `ysoft` | `#FFD400` / `#141100` / `rgba(255,212,0,.12)` | Acción y estado actual (13,2:1) / selección |
| `ok` / `warn` / `err` | `#5BC98A` / `#FFA94D` / `#FF6B6B` | Semántica, siempre con ícono |

**Tipografía:** Archivo en tres anchos (125 % display, 75 % números, 100 % texto) y JetBrains Mono para el tiempo.

## 7. Versión 3 del sistema tras la revisión de jueces (2026-10-01)

Dos jueces ciegos revisaron accesibilidad, usabilidad, cobertura de la especificación y consistencia. Decisiones del equipo:

1. **Amarillo disciplinado:** un solo bloque amarillo sólido por pantalla (la acción principal). La serie actual y la opción elegida usan amarillo de estado; progreso, temporizador, enlaces y pestaña activa son grises.
2. **Cinta de peligro con significado:** solo en "¡Descanso terminado!" y "Nuevo récord".
3. **Título del ejercicio** en estilo "título" (20 px, 2 líneas como máximo); el display ancho en mayúsculas queda para la marca ("HOY TOCA"). El número de carga es el protagonista (56 px).
4. **Solo modo oscuro en el MVP** (00 §6).

Correcciones aplicadas: S09 con lista scrolleable y bloque inferior fijo, zonas seguras, blancos de 48/56 px, borde de controles `line #74746C` (≥ 3:1), calentamiento sin opacidad, roles y estados accesibles, temporizador con Reiniciar y Saltear sin aviso, vibración y anuncio al terminar, diálogos con la acción segura destacada, animaciones decorativas de una sola pasada, textos nuevos registrados en 13-textos §10. Se agregaron los estados de S09 (calibración, unilateral + RIR, peso corporal, error de carga, no disponible, edición, finalizar), de S07 (continuar, restauración incompleta, sin rutina) y dos hojas nuevas: "Datos y navegación" y "Editor y onboarding".

Tokens agregados: `line #74746C`, `ph #8C8C85`, `ycur #1B1A10`, `s4 #1D1D1B` (hojas y diálogos), `inv #F4F4EF` / `oninv #141100`, `tape`, `target-min 48`, `target-main 56`, `safe-top 54`, `safe-bottom 34`, tipos `title 20`, `num-hero 56`, `num-m 26`, `label 12`.

## 8. Versión 4 (2026-10-01): ajustes del equipo

- **± de carga y repeticiones en amarillo** (acción del entrenamiento, junto con Hecho).
- **Botón principal con carácter:** esquinas cortadas en diagonal (como chapa) y franjas de peligro en el extremo derecho, texto en mayúsculas. Alternativas en la hoja de Acciones: solo esquinas cortadas, o inclinado.
- **Una sola hoja inferior** para todo (menús de S09, lista de ejercicios, editar serie, teclado de carga, S08, S10). Fondo negro al 74 % con desenfoque y la pantalla de atrás apagada; superficie #242422 con filo de luz.
- **Cinta de peligro solo como marca** (logo y franjas del botón). El fin del descanso invierte la tarjeta (fondo claro) y el récord usa el trofeo con brillo de una pasada: la cinta en un aviso se leía como advertencia.
- **S09:** encabezado sin flechas (título de hasta 2 líneas + menú, "Ver todos" abre la lista); editar una serie abre una hoja; borrar muestra "Serie eliminada · Deshacer" sobre el bloque inferior.
- **Inicio rediseñado:** menos texto. Tarjeta "Hoy toca" con el mapa de músculos del día como imagen, números clave, semana en curso y una lista compacta (peso sugerido + ícono de qué cambia; el motivo vive en S09 y S10).
- **Logo:** tres propuestas (placa cortada, barra, cinta). La app usa por ahora la placa cortada.

**Pendiente de especificar:** la franja "Esta semana" de Inicio muestra los entrenamientos de la semana contra los días de la rutina. Es nueva: requiere un AC en RF-ENT-01 o RF-PROG si se confirma.

## 9. Inicio: tarjeta con foto (2026-10-01)

Elegida la variante **B · Foto** para la tarjeta principal de Inicio. Para que el contraste no dependa de la foto ni del nombre del día:

| Regla | Valor |
|---|---|
| Tratamiento de la foto | Blanco y negro, brillo máximo 70 % (`grayscale(1) brightness(.7)`) |
| Velo oscuro donde hay texto | ≥ 65 % de `bg` desde el 30 % de la altura hacia abajo; 15 % arriba, donde no hay texto |
| Contraste garantizado (peor caso: píxel blanco) | Texto 8,4:1 · amarillo 6,6:1 · gris #C9C9C2 5,6:1 |
| Nombre del día | 72 px si tiene hasta 6 caracteres; 46 px si es más largo; 2 líneas como máximo. La última palabra en amarillo solo en "Día X" |
| Fotos | Una por tipo de día (pierna, torso, cuerpo completo), sin marcas visibles. Fuente: Unsplash (licencia libre, también comercial) |

Fotos de prueba: Eduardo Cano Photo Co., Alora Griffiths y Victor Freitas, en Unsplash.

## 10. Cambio de color primario: lima kinetic (2026-10-01)

**Motivo:** la combinación de negro con amarillo/naranja se asocia con una marca conocida de contenido para adultos. Primero se probó azul rey (comparado con eléctrico y cian); después se buscó algo más **cyberpunk** y se compararon tres limas (Volt #D4FF00, Lima ácida #B6FF2E y Lima kinetic #C5F04A). Se eligió **Lima kinetic**: neón, pero un poco menos saturado para no cansar la vista durante una hora de entrenamiento.

**Identidad:** pasa a llamarse **Kinetic** (sistema v5). "Peligro" quedó atado al amarillo de la cinta de seguridad. Se mantienen el lenguaje de componentes V3 "Placas", el logo de placa cortada y las franjas del botón principal, ahora como textura de marca.

| Token | Antes (amarillo) | Ahora (lima kinetic) | Contraste |
|---|---|---|---|
| `accent` (bg/accent) | `#FFD400` | `#C5F04A` | Texto oscuro 14,2:1 · sobre el fondo 14,7:1 |
| `accent-top` / `accent-bottom` (degradado) | `#FFE14A` / `#F2C500` | `#D3F574` / `#AEDB2E` | Texto oscuro 15,2:1 / 11,6:1 |
| `accent-hover` | `#FFDD33` | `#CDF462` | — |
| `on-accent` (texto sobre el bloque) | `#141100` | `#101400` | — |
| `accent-text` (lima sobre fondo oscuro) | `#FFD400` | `#C5F04A` | 14,7:1 sobre el fondo · 13,7:1 sobre tarjetas |
| `current` (serie actual) | `#1B1A10` | `#14180A` | Texto 16,3:1 |
| `accent-soft` / `accent-border-soft` | amarillo 12 % / 55 % | lima 12 % / 55 % | — |
| `oninv` (texto sobre tarjetas claras) | `#141100` | `#111214` | — |
| `ok` (éxito) | verde `#5BC98A` | turquesa `#3DD6C4` | 10,7:1 · se cambió para no confundirse con el lima |

**Reglas que siguen igual:** un solo bloque de color sólido por pantalla (la acción principal); la serie actual y lo elegido usan el color de estado; progreso, temporizador, enlaces y pestaña activa son grises; los ± van en el color de la acción.

**En la foto de Inicio** (§9), la letra del día en lima sobre el peor caso del velo da 6,9:1.

**Figma:** la colección Color tiene un único modo (Oscuro). Los degradados del botón principal y de los ± están atados a variables (`accent-top`, `accent`, `accent-bottom`), y los nombres CSS pasaron de `--y*` a `--accent*`. El lienzo HTML de exploración quedó en amarillo y no se actualiza: Figma es la versión final.

**Ajustes posteriores (2026-10-01):**
- **Interruptor encendido en lima** (fondo `accent`, perilla `on-accent`). Es una excepción a "un solo bloque sólido por pantalla": el interruptor es chico y su estado tiene que leerse de un vistazo.
- **Pestañas de sección** (Mis rutinas/Plantillas, Historial/Volumen) con el componente `Tabs`: texto e indicador lima de 3 px abajo. El control segmentado queda solo para elegir una opción dentro del contenido (período, kg/lb, días, esfuerzo).

## 11. Revisión con jueces (2026-10-01)

Auditoría automática del archivo de Figma más dos jueces ciegos (usabilidad y cobertura de la especificación). Decisiones aplicadas:

- **Opción elegida en lima suave** en todos los controles (segmentado, esfuerzo, RIR, días): fondo `accent-soft`, borde `accent-border-soft` y texto `accent-text`. El blanco sólido competía con la acción principal.
- **Diálogos:** la acción destacada va primero y rellena (lima si avanza, gris si es la opción segura). Las demás van como texto, y la destructiva en rojo. Es la regla de 13-textos §8, ahora aplicada en todos.
- **Sin jerga para el novato:** "Máximo estimado" sin la sigla e1RM, sin "RTF", "reserva 2" en lugar de "RIR 2" en el editor y "La última vez" en lugar de "Última W". La versión técnica queda para el detalle avanzado.
- **Acciones destructivas fuera del lugar de la principal:** en la edición de S19 abajo va "Listo", y "Eliminar entrenamiento" pasa al menú. En las hojas de editar serie, "Eliminar serie" queda más separada.
- **Un solo verbo:** "Respaldar ahora" (antes "Sincronizar ahora"). La acción del estado de respaldo va debajo del mensaje, para que no se aplaste con la fuente grande.
- **Calibración:** la pregunta de esfuerzo aparece dentro del panel inferior, encima de Hecho, y no queda escondida en la lista.
- **Inicio más compacto:** la tarjeta con foto baja a 250 px, así se ven al menos 3 ejercicios de "Lo de hoy".
- **Google** en superficie gris con borde, para no competir con el lima.
- **Contraste:** el gris terciario (#6B6B65) queda solo para lo deshabilitado. Los textos de ayuda, ejes y atribuciones usan el gris secundario.
- **Se mantiene:** los ± en lima (pedido explícito, §8), aunque un juez los marcó como exceso de lima.

**Fuente al 150 % (rehecho el 2026-10-01):** las pantallas A11y de S07, S09 y S21 se rehicieron desde las pantallas actuales, con instancias desacopladas para poder mostrar el comportamiento esperado. Reglas para el código:
- **Escala:** el texto de hasta 20 px crece ×1,5; el de 21 a 39 px, ×1,3; los números y títulos de 40 px o más, ×1,15 (como los títulos grandes del sistema).
- **Ningún texto se corta:** los textos de más de una palabra ocupan el ancho disponible y pasan a la línea siguiente (aviso de respaldo, nombre del ejercicio, motivo, notas de los pasos, valores de Perfil).
- **Filas que se reacomodan:** "Lo de hoy" y su leyenda se apilan; en S09, "Ver todos" baja a la línea siguiente si no entra junto a "Ejercicio 2 de 6".
- **Contenedores sin alto fijo:** filas y tarjetas crecen con el texto; el alto de diseño es un mínimo.
- **Notas de los pasos de carga y repeticiones:** hasta dos líneas, centradas (también al 100 %, por ejemplo el error "La carga tiene que estar entre 0 y 1000 kg.").

## 12. S09: la serie actual se ajusta en una hoja (2026-10-01)

Los pasos de carga y repeticiones ocupaban unos 357 px fijos abajo (más del 40 % de la pantalla) y la lista de series quedaba cortada. Se probaron tres alternativas en el lienzo: panel compacto, pasos dentro de la fila y tocar para ajustar. Se eligió la última:

- **Pantalla:** la lista muestra todas las series. La fila actual dice "Tocá para ajustar". Abajo quedan solo el temporizador (si corre) y **Hecho**.
- **Caso común en un toque:** Hecho registra la sugerencia sin abrir nada (UX-01).
- **Hoja "Ajustar serie"** (componente `SheetBody/Ajustar serie`, variantes Normal, Error, Peso corporal y Unilateral): carga, repeticiones con sus notas, calentamiento, esfuerzo opcional y Hecho. Ajustar y registrar queda en el mismo lugar, junto con el esfuerzo.
- **Costo aceptado:** corregir repeticiones pasa de un toque a tres (fila → − → Hecho).
- **Calibración:** sin cambios, la pregunta de esfuerzo sigue fija encima de Hecho porque bloquea la serie siguiente.
- El interruptor de calentamiento sale de la pantalla y pasa a la hoja.

## 13. S09: descanso a pantalla completa (2026-10-01)

Después de registrar una serie, lo que más le importa al usuario es cuánto descanso le queda. Por eso:
- **Hecho abre el descanso a pantalla completa:** cuenta regresiva grande (estilo `Mono/Hero`, 60 px) dentro de un anillo lima, +15 s y Reiniciar, la serie recién hecha con la pregunta de esfuerzo, la serie siguiente y "Saltear descanso".
- **Minimizar** vuelve a S09 con una **barra mínima** sobre Hecho (variante `RestTimer` State=Mini, 64 px): anillo, tiempo, siguiente serie, +15 s y un chevron. Tocarla reabre la pantalla completa.
- **Al terminar:** el anillo pasa a turquesa, "¡Descanso terminado!" y el botón principal "Ir a la serie 2".
- **Esfuerzo:** la pantalla completa es el lugar natural para responderlo, porque el usuario la está mirando durante el descanso.
- **Calibración a pantalla completa:** después de Hecho en la primera serie de calibración, el descanso muestra la tarjeta de la serie resaltada en lima y "Respondé para seguir: con esto calculamos tu peso para la serie 2.". Al responder, la nota pasa a explicar el nuevo peso ("Era mucho peso: en la serie 2 probá con 16 kg.") y "Siguiente" muestra la carga calculada. Si se minimiza sin responder, la pregunta queda fija encima de Hecho, como antes.
- **Menú del entrenamiento** (el "•••" del encabezado): hoja con "Finalizar entrenamiento" y "Descartar entrenamiento" (en rojo), que llevan a D10 o D09.

## 14. S21: hojas de ajustes (2026-10-01)

Cada ajuste de Perfil abre una hoja con el componente `SheetBody/Ajuste de perfil` (variantes Nivel, Objetivo, Días, Unidad y Esfuerzo):
- **Nivel y Objetivo:** las mismas tarjetas del onboarding y la nota "Tu rutina no cambia sola: después te preguntamos si querés ajustarla." Guardar lleva a D06 (RF-PERF-03 AC2).
- **Días por semana:** los números de 2 a 6 del onboarding (RF-PERF-03 AC3).
- **Unidad de peso:** kg o lb, con la aclaración de que los datos no cambian y los saltos no se convierten (RF-PERF-04, RN-PERF-05 y 06).
- **Esfuerzo:** escala simple o RIR numérico, con "Si después cambiás tu nivel, esta elección se mantiene." (RF-PERF-05 AC2).
- **Notificaciones del descanso:** no lleva hoja, es un interruptor en la fila. `Switch` es un componente interactivo en el prototipo.
- **Selección única (2026-10-02):** `OptionCard` y `DayOption` se eligen de a uno (onboarding, elegir día y hojas de Perfil). En el prototipo cada opción lleva a una copia de la pantalla con esa opción marcada, porque los componentes interactivos permitían marcar varias a la vez.
- **Plantillas sin "+":** crear una rutina solo se ofrece en "Mis rutinas"; en "Plantillas" no hay nada que crear.

## 15. Inicio: botón central en la barra de pestañas (2026-10-06)

La barra fija "Empezar" sobre las pestañas ocupaba unos 87 px (≈ 10 % de la pantalla) y dejaba ver solo dos ejercicios y medio de "Lo de hoy". La acción principal pasa a un **botón circular en el centro de la barra de pestañas**: Inicio · Rutinas · ● · Progreso · Perfil.

| Regla | Valor |
|---|---|
| Forma | Círculo de 64 px (un disco), sobresale 24 px por encima de la barra. Aro de 5 px del color de la barra (`bg/tabbar`) para separarlo del contenido y sombra suave |
| Color | Degradado `accent-top` → `accent-bottom`: es el único bloque lima sólido de la pantalla. Deshabilitado: `bg/raised` con el ícono y la etiqueta en `text/tertiary`, sin sombra |
| Ícono | `Icon/dumbbell` en `on-accent`: 30 px con trazo de 2,75 en Empezar; 22 px sobre el tiempo (13 px, negrita) en Continuar |
| Etiqueta | Debajo, alineada con las de las pestañas, en negrita y `text/primary`: "Empezar" o "Continuar" |
| Estados (`TabBar` → propiedad `Acción`) | **Empezar** (próximo día) · **Continuar** (entrenamiento en curso, con el tiempo) · **Deshabilitado** (Inicio cargando, error de lectura o sin rutina activa) |
| Alcance | Visible en las cuatro pestañas. Reemplaza a la barra de acción de S07 y a `ActiveWorkoutBar`, que se quitó del archivo |
| Sin rutina activa | El botón queda deshabilitado y "Elegir una rutina" pasa al estado vacío de S07, como botón principal debajo de la tarjeta |
| Blanco táctil | 64 px, por encima de los 56 dp de los controles principales (UX-02) |

Con el espacio liberado, "Lo de hoy" muestra cuatro ejercicios en lugar de dos y medio. La placa cortada sigue siendo el botón principal dentro de las pantallas (S09, hojas, estados vacíos); el círculo es solo la acción global de la barra.

