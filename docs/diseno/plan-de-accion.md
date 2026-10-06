# Plan de acción: del documento de especificación al prototipo en Figma

**Estado:** Borrador · **Fecha:** 2026-09-30
**Entrada:** [08-flujos-y-pantallas.md](../especificacion/08-flujos-y-pantallas.md) (pantallas, estados, checklist), [13-textos.md](../especificacion/13-textos.md) (textos), RNF-16/17/18 (accesibilidad).
**Salida:** archivo de Figma con tokens, componentes, las 25 pantallas en todos sus estados, los 15 diálogos y un prototipo navegable del flujo principal y el de cuenta.

---

## 0. Método acordado (2026-10-01)

1. **Lienzo de exploración** (claude.ai, "OneRM identidad agresiva"): solo para decidir rápido lo que en Figma es caro de cambiar (identidad, lenguaje de componentes, pantallas con problemas de diseño abiertos). No es el entregable.
2. **Figma es la versión final:** variables, componentes con variantes y **todas las pantallas armadas con instancias** de esos componentes, más el prototipo navegable.
3. Si una pantalla nueva tiene un problema de diseño difícil, se exploran 2–3 variantes en el lienzo y la elegida pasa a Figma.

**Decidido en el lienzo:** identidad Peligro → **Kinetic en lima** (#C5F04A) desde el 2026-10-01 (marca.md §10), lenguaje V3 "Placas" (sistema v5), botón principal A (esquinas cortadas + franjas), logo "placa cortada", solo modo oscuro. Detalle en [marca.md](marca.md).

## 1. Herramienta: cómo escribimos en Figma

| Opción | ¿Puede crear pantallas? | Decisión |
|---|---|---|
| **Figma MCP remoto** (`https://mcp.figma.com/mcp`) con la herramienta `use_figma` | Sí. Ejecuta JavaScript de la Plugin API: frames, componentes, variantes, variables, auto layout, textos | **Elegida** |
| API REST de Figma | No. Solo lee archivos y escribe comentarios (las variables solo en Enterprise) | Descartada |
| CLI | No hay una oficial que cree nodos | Descartada |
| Plugin propio | Sí, pero hay que programarlo y mantenerlo | Innecesaria: `use_figma` ya es eso |

**Skills oficiales** (repo `figma/mcp-server-guide`; vienen incluidas con el plugin de Figma para Claude Code):

| Skill | Para qué | Fase |
|---|---|---|
| `figma-use` | Base obligatoria: cómo escribir en el canvas sin romper nada | Todas |
| `figma-create-new-file` | Crear el archivo del proyecto | 0 |
| `figma-generate-library` | Variables (tokens), estilos y componentes con variantes | 2 |
| `figma-generate-design` | Armar pantallas reutilizando los componentes y variables del archivo | 3 |
| `figma-generate-diagram` | Pasar los flujos mermaid de 08 a FigJam (opcional, suma al §4.9 del TPO) | 3 |
| `figma-implement-design` / `figma-code-connect` | Pasar de Figma a React Native | Etapa 2, no ahora |

No usamos skills de terceros: son instrucciones que el agente ejecuta con acceso de escritura al archivo, y las oficiales cubren todo lo que necesitamos.

**Limitaciones conocidas** (la escritura en el canvas está en beta):
- Hay un límite de salida por llamada: trabajamos en **lotes chicos** (un componente o una pantalla por vez).
- No admite fuentes propias: la tipografía tiene que estar disponible en Figma (Google Fonts).
- Los límites de uso dependen del plan y del tipo de asiento. **Hay que verificarlos antes de empezar** (ver §7).
- Lo que genera el agente se revisa a mano: el usuario es el ojo del ciclo.

---

## 2. Principios de trabajo

1. **La especificación es la fuente de verdad.** Los textos salen literales de 13-textos; los estados, de 08 §6. Si al diseñar aparece un hueco, se anota en la especificación (preguntas abiertas) y no se inventa en Figma.
2. **Tokens antes que pantallas, componentes antes que pantallas.** Ninguna pantalla usa un color o un tamaño suelto: todo sale de variables.
3. **Tokens en el repo, también.** `docs/diseno/tokens.json` es la fuente; Figma la refleja. En la etapa 2 los mismos tokens alimentan el tema de React Native.
4. **Datos realistas.** Las pantallas usan los casos de referencia de sugerencias (A, G, M, O…), no "Lorem ipsum".
5. **Trazabilidad.** Cada frame se nombra `S09 · Serie en curso` o `D07 · Reemplazar rutina activa`, y lleva en la descripción los RF que cubre.
6. **Lotes con revisión.** Cada lote termina con una captura, la revisás y recién ahí seguimos.

---

## 3. Fases

### Fase 0 — Preparación (½ día) · ✅ Completa (2026-09-30)

**Archivo:** [OneRM — Prototipo](https://www.figma.com/design/73VZUZ69JtHsIzM4vgIlHZ) · plan Education (tier `student`), equipo "Ivan Miyashiro's team".

- [x] Verificar el plan y el asiento de Figma (ver §7).
- [x] Instalar el plugin de Figma en Claude Code (`figma@claude-plugins-official` v2.2.120: MCP remoto + 14 skills) y autenticar.
- [x] Crear el archivo con `figma-create-new-file` y sus páginas:
  `00 Portada` · `01 Fundamentos` · `02 Componentes` · `03 Entrada y cuenta` · `04 Inicio y entrenamiento` · `05 Rutinas y catálogo` · `06 Progreso` · `07 Perfil y sync` · `08 Diálogos` · `09 Prototipo`
- [x] **Prueba de humo:** un frame con auto layout, una variable con modo claro y oscuro, un texto con la fuente candidata y una conexión de prototipo. Si algo de esto falla, se ajusta el plan acá y no a mitad de camino.
  - Resultado: todo funcionó (11 páginas, colección con modos Claro/Oscuro, variable ligada a relleno, texto en Inter, reacción `ON_CLICK → NAVIGATE`). Las familias candidatas (Inter, Manrope, DM Sans, Plus Jakarta Sans, Space Grotesk, IBM Plex Sans, Geist, Outfit, Sora, Figtree, Onest, Barlow, Archivo, JetBrains Mono) están disponibles. La página de prueba se borró.
  - Nota: `whoami` informa asiento `View`, pero las escrituras (`use_figma`) funcionan. Las capturas se toman con `node.screenshot()` dentro de `use_figma`, sin usar `get_screenshot`, que es de lectura y sí cuenta para el límite.

### Fase 1 — Identidad visual (lo que querés hacer primero)
Se itera en **páginas HTML** comparables lado a lado (rápido y barato) y solo la dirección elegida pasa a Figma.

1. **Brief de marca** (1 página): personalidad (basada en evidencia, precisa y tranquila, no "bro de gimnasio"), contexto de uso (gimnasio con luz variable, a distancia de brazo, manos transpiradas, una mano) y competidores de referencia (Strong, Hevy, Fitbod) para diferenciarnos.
2. **3 direcciones de color**, cada una con primario, acento, neutros y semánticos, mostradas sobre maquetas de S07 y S09 en claro y oscuro.
3. **Elección y ajuste** con vos.
4. **Tokens:**
   - *Primitivos:* escalas de color (50–950), tipografía, espaciado (grilla de 4), radios y elevación.
   - *Semánticos:* fondo, superficie, texto, primario, éxito, advertencia, error, **estados de sync** (respaldado, pendiente, conflicto, sesión vencida), **escala de esfuerzo** y **lado limitante**.
   - *Modos:* claro y oscuro.
5. **Tipografía:** una familia con **números tabulares** (las cargas y repeticiones no "bailan" al cambiar) y los tamaños grandes que pide S09.
6. **Validación automática:** un script comprueba el contraste ≥ 4,5:1 (RNF-17) de cada par texto/fondo en ambos modos.

**Entregables:** `docs/diseno/marca.md`, `docs/diseno/tokens.json`, reporte de contraste.

### Fase 2 — Sistema de diseño en Figma (`figma-generate-library`) · ✅ Completa (2026-10-01)
**Estado:** 3 colecciones de variables (Primitivos 36 · Color 40, modo Oscuro · Medidas 25), 23 estilos de texto (Archivo variable con eje de ancho 125/100/75 % + JetBrains Mono), 11 estilos de efecto y 37 componentes en «02 Componentes» (íconos, botón con chapa cortada, controles, entrenamiento, hoja inferior, diálogo, barras, tarjeta de Inicio con foto). Portada y «01 Fundamentos» documentados. Solo modo oscuro (00 §6).

- Variables: colecciones *Primitivos* y *Semánticos* (con modos claro y oscuro); estilos de texto.
- Componentes, con variantes por estado (lista de 08 §7 más los genéricos):

| Componente | Variantes clave |
|---|---|
| Paso de carga / repeticiones (±) | normal · deshabilitado · peso corporal · 56 dp |
| Selector de esfuerzo | escala simple · RIR · por lado |
| Fila de serie | pendiente · en curso · hecha · calentamiento · editada |
| Tarjeta de ejercicio | con sugerencia · calibración · no disponible · unilateral |
| Temporizador | corriendo · pausado · terminado |
| Indicador de sync | los 9 estados de S21 |
| Genéricos | botones, campos, barra de pestañas, hoja modal, diálogo, snackbar, lista, estado vacío, esqueleto de carga |

### Fase 3 — Pantallas (`figma-generate-design`) · En curso
**Estado (2026-10-01):** lote 1 en «04 Inicio y entrenamiento»: S07 Inicio, S09 Primera serie, S09 Descanso terminado + Deshacer y S09 con hoja de menú. Lote 1b: S09 en calibración, unilateral + RIR, peso corporal, carga con error (hoja + teclado), no disponible, editar serie (hoja), finalizar y «Ver todos» (hoja), y S10 novato y avanzado. Lote 2: S08 Elegir día (hoja), S12 con récords, S12 sin récords y sin conexión, S12 invitado con D13, y D10 Finalizar con pendientes. Lote 3 (página «03 Entrada y cuenta»): S01 Bienvenida y sin conexión, S05 pasos 1–3, S06 recomendación + variantes novato 4+ días y objetivo fuerza, S23 restaurando y cortada. Lote 4 (página «05 Rutinas y catálogo»): S13 mis rutinas, plantillas, vacía, menú y D11; S14 detalle, ¿por qué? y D07; S15 editor reordenando, prescripción, RIR 0 + error, día vacío, aviso de orden, D08 y D15; S16 buscador y sin resultados; S17 detalle y obsoleto. Lote 5 (página «06 Progreso»): S18 historial, volumen semanal y vacío; S19 detalle, edición, editar serie y D16; S20 con gráfico de e1RM, un solo punto y peso corporal. Lote 6 (página «07 Perfil y sync»): S21 registrado, invitado y sesión vencida, tablero con los 9 estados de sync, incrementos de peso, D06, D03 y D14; S22 acerca de y créditos; S25 con cambios, vacío y D12. Lote 7 (página «03 Entrada y cuenta», filas 2 y 3): S02 iniciar sesión, ingresando, credenciales incorrectas, otro método y sin conexión; S03 crear cuenta, validación y email existente; S04 pedir enlace y enviado; S24 nueva contraseña y enlace no válido; D01 y D01b. Lote 8 (página «08 Diálogos»): D02, D05, D09, permiso de notificaciones rechazado, snackbar Deshacer e índice de todos los diálogos. Revisión (auditoría automática + 2 jueces ciegos) y lote 9 con los estados que faltaban: S07 sin rutina, restauración incompleta, en curso, cargando y error; S09 descanso corriendo, calibración hacia abajo, repeticiones extra, sustituido, salteado y entrada en calor; S11 sustituir (con y sin resultados); S10 para ADD_REP, CALIBRATION y REENTRY (novato y avanzado); S02 otra cuenta; S04 y S24 cargando, error y sin conexión; error al preparar datos; S06 intermedio; S13, S16, S18 y S20 cargando o error; barra de entrenamiento en curso; S17 no disponible todavía; S20 sin e1RM; S19 D16 de una serie y error de validación; S21 permiso denegado; S07, S09 y S21 con la fuente al 150 %. Frame usado: 390 × 844 (el mismo del lienzo). El orden real sigue el método del §0: S09 + S07 primero.

Frame base **393 × 852** (iPhone 15/16) y comprobación de S07 y S09 en **360 × 800** (Android chico), porque es donde más aprieta el espacio.

Orden por riesgo y valor (lo más difícil primero, para que el sistema se ajuste temprano):

| Lote | Pantallas | Por qué en este orden |
|---|---|---|
| 1 | **S09** en todos sus estados + S10 | Es la pantalla crítica y la que más exige a los componentes |
| 2 | S07, S08, S12 | Completa el flujo principal |
| 3 | S01, S05, S06, S23 | Entrada y onboarding |
| 4 | S13–S17 | Rutinas y catálogo |
| 5 | S18–S20 | Progreso |
| 6 | S21, S22, S25 | Perfil y sync |
| 7 | S02–S04, S24 | Auth |
| 8 | D01–D03, D05–D16 + snackbar | Diálogos |

Cada lote: modo claro; al final, una pasada de modo oscuro sobre S07, S09 y S21 (el resto se resuelve por variables).

### Fase 4 — Prototipo
- Conexiones (reacciones de la Plugin API) para:
  - **Flujo principal:** S01 → S05 → S06 → S07 → S09 → S12.
  - **Flujo de cuenta:** registro desde S21/D13 → D01 → S23; cierre de sesión con D03 y D14.
- Hojas modales y diálogos como *overlays*.
- Revisión manual en el modo presentación de Figma: si alguna conexión no queda bien por código, se ajusta a mano.

**Hecho (página `09 Prototipo`, 32 copias de pantallas, 4 flujos de inicio):**
- [x] **1 · Flujo principal (invitado):** S01 → S05 (3 pasos, con Atrás y Saltear) → S06 → S07 → S09 primera serie → descanso (avanza solo a los 3 s) → descanso terminado → último ejercicio → S12. El menú del ejercicio abre y cierra tocando el fondo.
- [x] **2 · Pestañas:** la TabBar navega entre Inicio, Rutinas, Progreso y Perfil. También funcionan las pestañas internas (Mis rutinas/Plantillas, Historial/Volumen), plantilla → detalle → "Usar esta rutina", rutina → editor, historial → detalle → progreso del ejercicio, y Perfil → Acerca de.
- [x] **3 · Cuenta:** Bienvenida → Iniciar sesión / Crear cuenta (con cruce entre las dos) → Recuperar contraseña → enlace enviado. Google entra directo.
- [x] **4 · Invitado → cuenta:** S12 → D13 → crear cuenta; Perfil invitado → Iniciar sesión → D01 (sumar o descartar con D01b) → S23 (2 s) → Perfil registrado; Cerrar sesión → D03 → Bienvenida.
- Los diálogos y las hojas son pantallas completas con el fondo oscurecido, con transición de fundido: se ven igual que un *overlay*.
- Las pantallas de `09` son **copias**: si se corrige una pantalla original, hay que volver a copiarla y reenlazarla.
- [x] **Bloque 1 · desde S09** (fila superior de `09 Prototipo`, "B1 ·"): "¿Por qué?" → S10; "Ver todos" → lista de ejercicios (Peso muerto → calibración); menú del ejercicio → Sustituir (S11 → sustituido), Saltear, Agregar serie; tocar una serie hecha → Editar serie; menú del entrenamiento → D10 (→ Resumen) y D09 (→ Inicio); primera serie → D05 antes del descanso; calibración: primera serie → descanso con esfuerzo obligatorio → respondido → serie 2 con 16 kg (o minimizado → pregunta fija).
- [x] **Bloque 2 · Inicio y onboarding** (fila "B2 ·"): "Cambiar día" → S08 (las opciones de día se marcan al tocarlas; "Elegir Día B" vuelve a Inicio); S06 "¿Por qué?" → hoja "¿Por qué esta rutina?"; "Ver otras rutinas" → Plantillas; "Ahora no" → Inicio sin rutina (desde ahí, Elegir una rutina / Crear rutina y la TabBar). Las opciones de día y las tarjetas del onboarding son de **selección única**: cada opción lleva a una copia de la pantalla con esa opción marcada (copias "· elegida N", a la derecha de `09 Prototipo`). Lo mismo en las hojas de Nivel, Objetivo, Unidad y Esfuerzo. El paso 3 (días por semana) usa frames sueltos y no cambia al tocarlo.
- [x] **Bloque 3 · Rutinas** (fila "B3 ·"): menú "•••" de cada rutina (Editar → editor, Activar, Duplicar, Eliminar → D11); detalle de plantilla: "¿Por qué esta rutina?" y "Usar esta rutina" → D07 → Inicio; editor: tocar un ejercicio → Prescripción, "Agregar ejercicio" → buscador (resultado → editor, "Ver detalle" → S17 → "Agregar al Día A"), Atrás → D08, Guardar → D15.
- [x] **Bloque 4 · Perfil y respaldo** (fila "B4 ·"): estado de respaldo → S25 → D12; Nivel, Objetivo y Días por semana → D06; Incrementos de peso → su pantalla. **Flujo 5 · Entrenamiento en curso:** botón central "Continuar" (desde cualquier pestaña) o pestaña Perfil → Cerrar sesión → D14 → "Ir al entrenamiento".
- [x] **Hojas de ajustes de Perfil** (fila "B4 · Hoja"): Nivel y Objetivo → Guardar → D06; Días, Unidad de peso y Esfuerzo → Guardar vuelve a Perfil. El interruptor de notificaciones se puede tocar.
- Las listas largas (Inicio, Resumen, Perfil, detalle de plantilla, etc.) se desplazan en el prototipo.
- Sin conectar: los estados de carga, error, sin conexión y vacío (se revisan en la página de cada pantalla), "Ver las fuentes completas" (la pantalla "En qué nos basamos" no está diseñada) y el paso 3 del onboarding (los días no son componente).

### Fase 5 — Revisión y cierre
- [x] Checklist de 08 §7 completo.
- [x] Accesibilidad: contraste (script), blancos táctiles de 48 y 56 dp, S07, S09 y S21 con la fuente al 150 %.
- [x] Revisión crítica con una mirada independiente (skill `design-critique` o un juez ciego sobre las capturas).
- [x] Actualizar 09-trazabilidad (entregable 11) con el enlace al archivo.
- **Resultado (2026-10-01):**
  - **Checklist 08 §7:** se encontraron y diseñaron tres huecos: snackbar "Serie eliminada · Deshacer", S09 con notificaciones rechazadas (aviso con "Activar" sobre la barra del descanso) y calibración hacia arriba (`CALIBRATION_STEP`).
  - **Calibración corregida según RN-SUG-06/07 y RN-ENT-04:** la serie 1 arranca con carga vacía ("—", Hecho deshabilitado) y se elige el peso en la hoja; el ejemplo es 20 kg × 12 con "4 o más" (RTF 16 > 15) → 24 kg × 8. "Calibración hacia abajo" vuelve a mostrar 0 repeticiones, que es la única condición para bajar un 20 %.
  - **Auditoría automática** (03 a 08, unos 2300 textos): 0 contrastes insuficientes (el único aviso es el logo dentro de la pantalla al 150 %, sin componente), 0 colores sin variable, 0 blancos táctiles menores a 48 px salvo el interruptor (52 × 32, estándar; en código el área táctil es toda la fila de 48 px). Los ± y Hecho de S09 miden 56 y 64 px.
  - **Fuente al 150 %:** S07, S09 y S21 rehechas (marca.md §11).
  - **Revisión con mirada independiente:** se hizo antes de los cambios de S09 (marca.md §11). Las pantallas nuevas (hoja de ajustar, descanso a pantalla completa, hojas de Perfil) se revisaron con capturas durante el diseño, sin un juez ciego.

---

## 4. Cómo trabajamos cada lote

1. Leo la especificación de las pantallas del lote (08 §5–6, 13-textos).
2. Construyo en Figma con `use_figma`, un frame por llamada.
3. Saco captura y te la muestro.
4. Ajustamos. Si el cambio es de sistema (color, componente), se corrige en el componente o la variable, nunca en la pantalla.
5. Si la pantalla revela un hueco de la especificación, lo anoto y lo resolvemos antes de seguir.

---

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| La escritura en el canvas es beta y puede fallar o cambiar | Prueba de humo en la fase 0; lotes chicos; plan B: construir componentes a mano y dejar al agente solo las pantallas |
| Límite de llamadas del plan o asiento | Plan Education (§7); agrupar trabajo por llamada; capturas solo al cerrar cada lote |
| Resultado genérico o "con cara de IA" | Identidad definida antes; revisión en cada lote; componentes propios, no de un kit |
| Deriva entre Figma y la especificación | Textos literales de 13; nombres con IDs; huecos se anotan en la especificación |
| Tiempo: 25 pantallas + estados + 15 diálogos | Priorizar el flujo principal (lotes 1–3) para la preentrega; el resto después |

---

## 6. Cronograma estimado

| Fase | Esfuerzo |
|---|---|
| 0 Preparación | ½ día |
| 1 Identidad | 1–2 días (depende de las iteraciones) |
| 2 Sistema de diseño | 1–2 días |
| 3 Pantallas | 3–5 días |
| 4 Prototipo | 1 día |
| 5 Revisión | ½–1 día |

---

## 7. Decisiones pendientes antes de arrancar

1. **Plan de Figma.** El plan actual es **Starter** y no alcanza para este trabajo:

   | Límite de Starter | Impacto en el plan |
   |---|---|
   | **20 llamadas al MCP por mes** (solo están exentas `create_new_file`, `add_code_connect_map` y `whoami`) | Cada lote necesita varias llamadas de escritura y de captura: se agota en la primera pantalla |
   | **3 páginas por archivo** y 3 archivos de equipo | No entra la estructura de 10 páginas de la fase 0 |
   | **Sin modos de variables** | No hay claro y oscuro por variables (fase 1, punto 4) |

   **Decisión propuesta:** pedir el **plan Education** (gratis para estudiantes universitarios verificados, con email de la facultad; equivale a Professional: 200 llamadas por día y 10 por minuto, páginas ilimitadas y modos de variables). Se renueva cada año. La fase 1 (identidad en HTML) no depende de Figma y puede avanzar mientras se tramita.
2. **Nombre de la app.** No es imprescindible para los colores, pero sí para el logo, el ícono y la portada. Se puede definir en paralelo a la fase 1.
