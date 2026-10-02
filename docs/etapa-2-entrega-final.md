# TPO 2026 — Etapa 2: Implementación y entrega final

> **Materia:** Desarrollo de Aplicaciones I — Facultad de Ingeniería y Cs. Exactas, UADE (Departamento de Tecnología Informática)
> **Documento fuente:** `TPOA_2026.pdf` — *Trabajo Práctico Obligatorio: Diseño y Desarrollo de una Aplicación Móvil* (v.1.0)
> **Modalidad:** trabajo en equipo.
> **Requisito previo:** la **Etapa 1 (preentrega) debe estar aprobada** para comenzar formalmente esta etapa. Ver `etapa-1-preentrega.md`.

---

## 0. Contexto general del TPO (aplica a ambas etapas)

### 0.1 Consigna general

Diseñar y desarrollar una **aplicación Android** que responda a un **problema real, concreto y plausible de ser abordado mediante una solución móvil**. En esta segunda etapa el equipo **desarrolla una versión funcional** de la aplicación y realiza una **demostración y defensa técnica**.

### 0.2 Objetivos del trabajo

- Identificar un problema real y formularlo desde la necesidad del usuario, no desde la tecnología.
- Diseñar una solución móvil coherente con el contexto de uso.
- Integrar criterios de UI, UX y CX.
- Diseñar una arquitectura basada en **MVVM** y principios de **Clean Architecture**.
- Tomar decisiones justificadas sobre persistencia, conectividad, APIs y capacidades del dispositivo.
- Aplicar una estrategia **Offline First** cuando el problema lo requiera.
- **Implementar una aplicación funcional con Kotlin, Android y Jetpack Compose o React Native.**
- Documentar y defender las decisiones de diseño y desarrollo.

El objetivo es recorrer un proceso completo: **comprender un problema, diseñar una solución acotada, construirla, probarla y justificar las decisiones tomadas** — no maximizar pantallas, features o tecnologías.

### 0.3 Principio rector

- La app surge de un **problema**, no de una tecnología.
- ⚠️ **No se evaluará positivamente agregar tecnologías solamente para "cumplir".** Cada decisión técnica debe poder explicarse en función del problema que resuelve.

### 0.4 Cambios respecto de la preentrega

La aprobación de la preentrega **no congela** las decisiones. Durante el desarrollo pueden surgir cambios, pero **toda modificación significativa de alcance, arquitectura, experiencia o tecnología deberá poder ser explicada y justificada** por el equipo (conviene documentarlas en el README → "Decisiones relevantes").

---

## 1. Implementación mínima esperada (§7.1)

- [ ] La versión final debe **implementar correctamente los requisitos funcionales comprometidos** en la preentrega (los 3–4 RF aprobados).
- [ ] **No** alcanza con una app que sólo permita recorrer pantallas: **las operaciones deben producir efectos reales y consistentes**.

La aplicación debe **demostrar integración** de los principales conceptos de la materia:

- [ ] Android
- [ ] Stack elegido: **Kotlin + Jetpack Compose** *o* **React Native**
- [ ] Navegación
- [ ] Estado
- [ ] ViewModel
- [ ] MVVM
- [ ] Principios de Clean Architecture
- [ ] Repositorios
- [ ] Persistencia
- [ ] Room *(cuando corresponda)*
- [ ] Retrofit *(cuando exista comunicación remota)*
- [ ] Manejo de errores
- [ ] Funcionamiento offline *(cuando corresponda)*
- [ ] Sensores o capacidades del dispositivo *(cuando aporten valor)*

> ✅ **Aclaración confirmada:** React Native es una alternativa válida a Kotlin + Jetpack Compose. El texto de §7.1 nombra las herramientas del stack Kotlin (Compose, ViewModel, Room, Retrofit); con React Native se usan y justifican sus **equivalentes** (UI en componentes RN, capa de estado tipo ViewModel, base local estructurada, cliente HTTP). MVVM, Clean Architecture, repositorios, manejo de errores y offline aplican igual.

### Arquitectura esperada (heredada de la Etapa 1, §4.11)

| Capa | Responsabilidades esperadas |
|---|---|
| **Presentación** | UI con Jetpack Compose (o componentes React Native), estado de pantalla y ViewModel (o su equivalente en RN). |
| **Dominio** | Modelos de dominio, reglas del negocio, casos de uso (cuando correspondan) e interfaces. |
| **Datos** | Repositorios, fuentes locales, fuentes remotas y mappers (cuando sean necesarios). |

> **UI → ViewModel → Use Case → Repository → Local / Remote Data Source**

Principios a respetar: separación de responsabilidades, MVVM, Clean Architecture, gestión explícita del estado, abstracción de fuentes de datos, mantenibilidad y testabilidad.

---

## 2. Calidad funcional (§7.2)

Se verificará especialmente:

- [ ] Funcionamiento de los casos de uso principales
- [ ] Manejo de errores
- [ ] Navegación consistente
- [ ] Actualización correcta del estado
- [ ] Persistencia
- [ ] Comportamiento con conectividad limitada
- [ ] Consistencia entre UI y datos

---

## 3. Calidad de experiencia (§7.3)

La versión final debe contemplar, **cuando corresponda**, los siguientes estados:

- [ ] Estado de carga
- [ ] Contenido disponible
- [ ] Contenido vacío
- [ ] Error
- [ ] Ausencia de conectividad
- [ ] Permisos rechazados
- [ ] Recuperación ante errores

**Regla:** la aplicación debe **comunicar claramente qué ocurre y qué acciones puede realizar el usuario** en cada caso.

### Comportamiento Offline First esperado (heredado de la Etapa 1, §4.13)

La implementación debe respetar lo planteado en la preentrega para cada escenario:

- [ ] Con conexión
- [ ] Al perder conexión
- [ ] Al recuperar conexión
- [ ] Con información local desactualizada
- [ ] Sin información local todavía

Y cumplir con lo definido sobre: qué se guarda localmente, cuál es la fuente remota, cuándo se actualizan los datos, qué ve el usuario sin conexión y cómo se manejan errores/conflictos de sincronización.

---

## 4. Entrega técnica (§7.4)

La entrega final debe incluir:

- [ ] Repositorio completo
- [ ] README
- [ ] Instrucciones de ejecución
- [ ] Arquitectura final
- [ ] Tecnologías utilizadas
- [ ] Funcionalidades implementadas
- [ ] Requisitos funcionales alcanzados
- [ ] Decisiones relevantes
- [ ] Limitaciones conocidas

**Regla del README:** debe permitir que **una persona externa al equipo** comprenda:

1. qué hace la aplicación,
2. cómo está organizada,
3. cómo ejecutarla.

### Estructura sugerida del README

```md
# <Nombre de la app>
## Problema y propuesta de valor
## Funcionalidades implementadas
## Requisitos funcionales alcanzados (RF01…RF04 — estado)
## Arquitectura final (diagrama + capas + flujo de datos)
## Tecnologías utilizadas (y por qué)
## Estrategia offline / persistencia
## Instrucciones de ejecución (requisitos, build, run, API keys si aplica)
## Decisiones relevantes (incluye cambios vs. preentrega y su justificación)
## Limitaciones conocidas
## Equipo, roles y responsabilidades
```

### Repositorio y proceso (continúa desde la Etapa 1, §4.14)

- Se observará la **evolución real** del trabajo en el repositorio (commits, participación, integración del equipo).
- ⚠️ Concentrar artificialmente todo el desarrollo en uno o pocos commits previos a la entrega puede considerarse **metodología de trabajo deficiente**.
- Respetar la estrategia de ramas y el criterio de commits / pull requests declarados en la preentrega.

---

## 5. Demo y defensa final (§7.5)

- [ ] El equipo debe realizar una **demostración funcional** de la aplicación.

Estructura **recomendada** de la demo:

> **Problema → Escenario → Acción del usuario → Respuesta de la aplicación → Valor generado**

Durante la defensa pueden hacerse **preguntas individuales** sobre:

- [ ] Código
- [ ] Arquitectura
- [ ] Estado
- [ ] Navegación
- [ ] Persistencia
- [ ] Networking
- [ ] Sincronización
- [ ] Sensores
- [ ] Decisiones de UX
- [ ] Organización del trabajo

**Todos los integrantes** deben poder explicar el funcionamiento general de la aplicación (los roles no implican exclusividad).

---

## 6. Uso de inteligencia artificial (§8)

- Se **permite** usar asistentes de IA como herramienta de consulta, revisión, diagnóstico y apoyo.
- El equipo debe poder **comprender, justificar y modificar** el código que integra al proyecto.
- En la defensa puede solicitarse **explicar fragmentos generados o asistidos por IA**, identificar sus responsabilidades y justificar por qué fueron incorporados.
- **Una respuesta generada por IA no constituye por sí misma una justificación técnica.**

Antes de incorporar una solución propuesta por IA, el equipo debería poder responder:

- [ ] ¿Qué problema intenta resolver este código?
- [ ] ¿Qué capa o responsabilidad modifica?
- [ ] ¿Qué dependencias agrega?
- [ ] ¿Existe una alternativa más simple?
- [ ] ¿Cómo comprobamos que funciona?
- [ ] ¿Qué ocurriría si falla?

---

## 7. Criterios generales de evaluación (§9)

Se evalúa tanto el **producto** como el **proceso de desarrollo**.

| Dimensión | Qué se observará |
|---|---|
| Problema y usuario | Claridad, pertinencia, contexto y comprensión de la necesidad. |
| Diseño de solución | Coherencia entre problema, valor, funcionalidades y experiencia. |
| Alcance | Capacidad de priorizar y definir un producto realizable. |
| UI / UX / CX | Claridad, navegación, feedback, estados, accesibilidad y adecuación al contexto móvil. |
| Arquitectura | Separación de responsabilidades, dependencias, mantenibilidad y aplicación de MVVM / Clean Architecture. |
| Datos y persistencia | Coherencia entre fuentes locales, remotas y necesidades de persistencia. |
| Offline First | Comportamiento frente a conectividad intermitente o inexistente, cuando corresponda. |
| Implementación | Correcto uso de Kotlin, Android y Jetpack Compose (o de React Native, si se eligió ese stack). |
| Capacidades móviles | Uso pertinente de sensores, ubicación u otras APIs del dispositivo. |
| Repositorio | Evolución del trabajo, commits, participación e integración del equipo. |
| Defensa técnica | Capacidad individual y grupal para explicar decisiones, código y funcionamiento. |

---

## 8. Cierre (§10)

El éxito del TPO **no** está determinado por la cantidad de pantallas, calidad de la UI/UX, funcionalidades o tecnologías utilizadas.

Se valora especialmente la capacidad de construir una solución **pequeña, coherente, defendible y funcional**, donde las decisiones de experiencia, arquitectura y tecnología puedan vincularse con necesidades reales del usuario.

> **Comprender el problema. Diseñar con intención. Implementar con criterio. Validar y poder explicarlo.**

---

## Checklist rápido de entrega final

- [ ] Todos los RF comprometidos funcionan con efectos reales (no sólo navegación).
- [ ] Arquitectura MVVM + Clean (Presentación / Dominio / Datos) implementada y explicable.
- [ ] Persistencia local (Room, o equivalente en RN, si hay datos estructurados) funcionando.
- [ ] Networking (Retrofit, o cliente HTTP equivalente en RN) si hay fuente remota.
- [ ] Offline First según lo planteado en la preentrega.
- [ ] Estados de UI: carga, contenido, vacío, error, sin conexión, permisos rechazados, recuperación.
- [ ] Capacidades del dispositivo sólo donde aportan valor, y justificadas.
- [ ] README completo (qué hace, cómo está organizada, cómo ejecutarla + secciones de §7.4).
- [ ] Historial de commits distribuido en el tiempo y entre integrantes.
- [ ] Cambios vs. preentrega documentados y justificados.
- [ ] Demo armada: Problema → Escenario → Acción → Respuesta → Valor.
- [ ] Cada integrante puede explicar código, arquitectura, estado, navegación, persistencia, networking, sync, sensores y UX.
