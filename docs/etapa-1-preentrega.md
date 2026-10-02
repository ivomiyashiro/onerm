# TPO 2026 — Etapa 1: Preentrega de análisis y diseño

> **Materia:** Desarrollo de Aplicaciones I — Facultad de Ingeniería y Cs. Exactas, UADE (Departamento de Tecnología Informática)
> **Documento fuente:** `TPOA_2026.pdf` — *Trabajo Práctico Obligatorio: Diseño y Desarrollo de una Aplicación Móvil* (v.1.0)
> **Modalidad:** trabajo en equipo.

La Etapa 1 **debe ser aprobada antes de comenzar formalmente la implementación** (Etapa 2).

---

## 0. Contexto general del TPO (aplica a ambas etapas)

### 0.1 Consigna general

Diseñar y desarrollar una **aplicación Android** que responda a un **problema real, concreto y plausible de ser abordado mediante una solución móvil**. El trabajo tiene dos etapas:

1. **Etapa 1 — Preentrega de análisis y diseño:** definir problema, usuario, propuesta de valor, alcance, requisitos, experiencia, arquitectura y estrategia tecnológica. Debe aprobarse antes de implementar.
2. **Etapa 2 — Entrega final de implementación:** desarrollar una versión funcional, demostrarla y defenderla técnicamente.

### 0.2 Objetivos del trabajo

- Identificar un problema real y formularlo **desde la necesidad del usuario, no desde la tecnología**.
- Diseñar una solución móvil coherente con el contexto de uso.
- Integrar criterios de **UI, UX y CX**.
- Diseñar una arquitectura basada en **MVVM** y principios de **Clean Architecture**.
- Tomar decisiones **justificadas** sobre persistencia, conectividad, APIs y capacidades del dispositivo.
- Aplicar una estrategia **Offline First** cuando el problema lo requiera.
- Implementar una aplicación funcional con **Kotlin, Android y Jetpack Compose o React Native**.
- Documentar y defender las decisiones de diseño y desarrollo.

El objetivo **no** es producir la mayor cantidad de pantallas, funcionalidades o tecnologías, sino recorrer un proceso completo: **comprender un problema, diseñar una solución acotada, construirla, probarla y justificar las decisiones tomadas**.

### 0.3 Principio rector

- La aplicación debe surgir de un **problema** y **no** de una tecnología.
  - ❌ Incorrecto: *"Queremos hacer una aplicación que use GPS."*
  - ✅ Correcto: *"Las personas que utilizan determinados espacios recreativos desconocen cuáles poseen servicios disponibles, accesibilidad o condiciones adecuadas para ciertas actividades."*
- A partir del problema se analiza si ubicación, conectividad, persistencia local, cámara, sensores u otras capacidades móviles aportan valor.
- ⚠️ **No se evaluará positivamente agregar tecnologías solamente para "cumplir".** El equipo debe poder explicar qué problema resuelve cada decisión técnica.

### 0.4 Cambios posteriores a la aprobación

La aprobación de la preentrega **no congela** las decisiones. Pueden surgir cambios durante el desarrollo, pero **toda modificación significativa de alcance, arquitectura, experiencia o tecnología deberá poder ser explicada y justificada** por el equipo.

---

## 1. Definición del problema (§4.1)

Identificar una situación problemática **real, concreta y suficientemente acotada** como para trabajarla durante la cursada.

La descripción **debe responder**:

- [ ] ¿Qué problema existe?
- [ ] ¿Quién experimenta ese problema?
- [ ] ¿En qué contexto ocurre?
- [ ] ¿Cómo se resuelve actualmente?
- [ ] ¿Qué dificultades presenta la solución actual?
- [ ] ¿Por qué una aplicación móvil podría mejorar esa situación?

**Regla:** el problema debe redactarse **en términos del usuario y su necesidad**.

---

## 2. Usuario y contexto de uso (§4.2)

Identificar **al menos un perfil de usuario principal**. Para ese usuario describir:

- [ ] Características relevantes
- [ ] Necesidad principal
- [ ] Contexto de uso
- [ ] Frecuencia estimada de uso
- [ ] Posibles restricciones
- [ ] Condiciones de conectividad
- [ ] Condiciones ambientales o situacionales relevantes
- [ ] Dificultades actuales

El análisis **debe considerar** que una app móvil puede usarse:

- en movimiento,
- durante períodos breves,
- con conectividad intermitente,
- con una sola mano,
- mientras el usuario realiza otra actividad.

> **Mirada de computación ubicua (Mark Weiser):** la tecnología debería integrarse de manera natural en la actividad del usuario y reducir, cuando sea posible, la carga cognitiva necesaria para utilizarla. La solución debe acompañar el contexto y no obligar al usuario a adaptarse innecesariamente a la tecnología.

---

## 3. Propuesta de solución (§4.3)

Describir brevemente la aplicación. La definición **debe incluir**:

- [ ] Nombre provisorio
- [ ] Descripción breve de la solución
- [ ] Usuario principal
- [ ] Propuesta de valor
- [ ] Escenario principal de uso
- [ ] Beneficio esperado

Además, **responder explícitamente**:

> **¿Por qué esta solución tiene sentido como aplicación móvil y no simplemente como sitio web o sistema de escritorio?**

Capacidades que pueden considerarse **cuando aporten valor**:

- ubicación
- cámara
- sensores
- almacenamiento local
- notificaciones
- conectividad
- funcionamiento offline
- interacción contextual
- integración con otras aplicaciones del dispositivo

---

## 4. Caso de negocio y propuesta de valor (§4.4)

Explicar **qué valor genera** la aplicación. No es obligatorio que sea un proyecto comercial. El valor puede ser:

- económico
- operativo
- educativo
- social
- ambiental
- organizacional
- de accesibilidad
- de experiencia

La propuesta **debe poder resumirse** con la relación:

> **Problema → Usuario → Solución → Valor generado**

---

## 5. Alcance y fuera de alcance (§4.5)

- [ ] Definir qué **incluirá** la primera versión del producto.
- [ ] Definir qué quedará **explícitamente fuera de alcance**.

Se espera una solución **acotada y desarrollable**, priorizando **pocos flujos completos** antes que muchas funcionalidades incompletas.

> ⚠️ Una solución pequeña, coherente y completamente funcional tendrá **mayor valoración** que una propuesta excesivamente ambiciosa que no logre completar sus casos de uso principales.

---

## 6. Requisitos funcionales (§4.6)

- La preentrega debe incluir **entre 3 y 4 requisitos funcionales principales** (ni menos de 3, ni más de 4).
- Cada requisito **debe incluir**:
  - [ ] Identificador (ej. `RF01`)
  - [ ] Descripción
  - [ ] Usuario involucrado
  - [ ] Criterio de aceptación

**Ejemplo provisto por la cátedra:**

> **RF01 — Registrar una observación**
> **Descripción:** el usuario podrá registrar una observación seleccionando una categoría, ingresando una descripción y confirmando su ubicación.
> **Criterio de aceptación:** al confirmar la operación, la observación deberá quedar disponible en la aplicación aun cuando el dispositivo pierda posteriormente la conexión.

**Otros ejemplos posibles:**

- consultar información previamente descargada sin conexión;
- registrar información asociada a la ubicación actual;
- consultar el detalle de un elemento;
- filtrar información según criterios definidos.

### Plantilla sugerida

```md
### RFxx — <Título>
- **Usuario involucrado:** ...
- **Descripción:** ...
- **Criterio de aceptación:** ...
```

---

## 7. Requisitos no funcionales (§4.7)

Definir los RNF **relevantes para el proyecto**. Pueden contemplarse:

- usabilidad
- accesibilidad
- rendimiento
- seguridad
- privacidad
- mantenibilidad
- confiabilidad
- compatibilidad
- comportamiento offline
- recuperación ante errores
- consumo de batería
- uso responsable de sensores
- protección de datos del usuario

**Regla:** los requisitos deben formularse de manera **observable o verificable**.

- ❌ Evitar: *"La aplicación será rápida y fácil de usar."*
- ✅ Preferir: *"Las operaciones principales de consulta deberán poder realizarse sin conexión cuando exista información previamente sincronizada."*

---

## 8. Diseño de experiencia — UI, UX y CX (§4.8)

Realizar un **diseño inicial de la experiencia en Figma**. La entrega debe incluir:

- [ ] Principales pantallas
- [ ] Navegación
- [ ] Componentes principales
- [ ] Jerarquía visual
- [ ] Acciones disponibles
- [ ] Estados relevantes

**No** se espera una colección de pantallas aisladas: debe poder comprenderse **cómo una persona recorre la aplicación para alcanzar un objetivo**.

Cuando corresponda, representar **distintos estados de una misma pantalla**:

> **Carga → Contenido → Vacío → Error → Offline**

Se tendrá en cuenta:

- claridad de navegación
- consistencia
- feedback del sistema
- prevención y recuperación de errores
- accesibilidad
- carga cognitiva
- contexto real de utilización

---

## 9. Flujo de pantallas (§4.9)

Presentar un **diagrama** que permita comprender el flujo principal de interacción. Como mínimo debe incluir:

- [ ] Punto de entrada
- [ ] Pantallas principales
- [ ] Decisiones
- [ ] Navegación
- [ ] Operaciones críticas
- [ ] Posibles finales del recorrido

Como mínimo debe documentarse el **flujo correspondiente al caso de uso principal**.

---

## 10. Tecnologías previstas (§4.10)

La aplicación debe ser **Android** y desarrollarse con **uno** de estos dos stacks (ambos válidos):

- **Opción A:** Kotlin + Jetpack Compose
- **Opción B:** React Native

> ✅ **Aclaración confirmada:** React Native es una alternativa válida a Kotlin + Jetpack Compose (coincide con los objetivos §1: *"Kotlin, Android y Jetpack Compose **o** React Native"*). Donde el enunciado menciona Jetpack Compose, ViewModel, Room o Retrofit, con React Native se usan sus **equivalentes** en ese ecosistema y se justifica la elección. Los requisitos de arquitectura (MVVM, Clean Architecture, capas, estado explícito, abstracción de datos) aplican igual.

Según las necesidades del proyecto pueden utilizarse (herramientas del stack Kotlin/Compose; en React Native, sus equivalentes):

- Navigation Compose
- ViewModel
- Coroutines
- Flow / StateFlow
- Room
- Retrofit
- DataStore
- APIs externas
- Sensores del dispositivo
- Servicios de ubicación
- Otras APIs del ecosistema Android

**Regla:** cada tecnología relevante debe incluir una **breve justificación**.

---

## 11. Arquitectura propuesta (§4.11)

Diseñar aplicando los principios de la materia:

- separación de responsabilidades
- MVVM
- principios de Clean Architecture
- gestión explícita del estado
- abstracción de fuentes de datos
- mantenibilidad
- testabilidad

La preentrega **debe incluir un diagrama de arquitectura** en **dos niveles**:

- [ ] **Flujo de datos**
- [ ] **Topología de infraestructura**

Como mínimo deben distinguirse estas responsabilidades:

| Capa | Responsabilidades esperadas |
|---|---|
| **Presentación** | UI con Jetpack Compose (o componentes React Native), estado de pantalla y ViewModel. |
| **Dominio** | Modelos de dominio, reglas del negocio, casos de uso (cuando correspondan) e interfaces. |
| **Datos** | Repositorios, fuentes locales, fuentes remotas y mappers (cuando sean necesarios). |

> Con React Native, el rol de **ViewModel** lo cumple la pieza que mantenga el estado de pantalla y la lógica de presentación separada de la vista (p. ej. hooks o stores dedicados); lo importante es respetar la separación MVVM.

Esquema conceptual posible:

> **UI → ViewModel → Use Case → Repository → Local / Remote Data Source**

> ⚠️ El diagrama **no debe ser decorativo**. El equipo debe poder explicar por qué cada responsabilidad está en determinada capa y cómo circulan los datos.

---

## 12. Persistencia y estrategia de datos (§4.12)

Identificar **qué información requiere persistencia**. Cuando corresponda, indicar:

- [ ] Entidades principales
- [ ] Relaciones
- [ ] Información proveniente de APIs
- [ ] Información generada por el usuario
- [ ] Información que deberá almacenarse localmente

Cuando exista una necesidad real de persistencia estructurada, **se espera utilizar Room** (en React Native, una base de datos local estructurada equivalente, justificada).

---

## 13. Estrategia Offline First (§4.13)

Analizar **explícitamente** qué ocurrirá cuando el dispositivo:

- [ ] Tenga conexión
- [ ] Pierda conexión
- [ ] Recupere conexión
- [ ] Disponga de información local desactualizada
- [ ] No posea todavía información local

Cuando el problema lo requiera, plantear una estrategia **Offline First**. La preentrega debe explicar:

- [ ] Qué información se almacenará localmente
- [ ] Cuál será la fuente remota
- [ ] Cuándo se actualizarán los datos
- [ ] Qué verá el usuario sin conexión
- [ ] Cómo se manejarán errores o conflictos de sincronización

---

## 14. Repositorio y forma de trabajo (§4.14)

**Antes de realizar la preentrega debe existir un repositorio del proyecto.** El equipo debe declarar:

- [ ] URL del repositorio
- [ ] Integrantes
- [ ] Estrategia básica de trabajo
- [ ] Ramas utilizadas (si correspondiera)
- [ ] Criterio para commits y pull requests

Se observará la **evolución real** del trabajo a través del repositorio.

> ⚠️ La concentración artificial de todo el desarrollo en uno o pocos commits previos a la entrega podrá considerarse evidencia de una **metodología de trabajo deficiente**.

---

## 15. Roles y responsabilidades (§4.15)

Cada integrante debe tener **responsabilidades identificables**. La preentrega debe indicar:

- [ ] Nombre del integrante
- [ ] Rol principal
- [ ] Responsabilidades
- [ ] Áreas del proyecto en las que participará
- [ ] Cambios en los miembros del equipo (si los hubiere)

Ejemplos de responsabilidades: Arquitectura, UI, UX, Persistencia, Sensores, Testing, Documentación, Integración.

Los roles **no implican exclusividad**: todos los integrantes deben comprender el funcionamiento general de la aplicación.

---

## 16. Entregables de la preentrega — checklist oficial (§5)

La preentrega debe contener **como mínimo**:

1. [ ] Nombre provisorio de la aplicación.
2. [ ] Descripción del problema.
3. [ ] Usuario o usuarios principales.
4. [ ] Contexto de uso.
5. [ ] Propuesta de solución.
6. [ ] Justificación de por qué la solución debe ser móvil.
7. [ ] Caso de negocio o propuesta de valor.
8. [ ] Alcance y fuera de alcance.
9. [ ] Entre 3 y 4 requisitos funcionales.
10. [ ] Requisitos no funcionales.
11. [ ] Diseño en Figma.
12. [ ] Flujo de pantallas.
13. [ ] Diagrama de arquitectura (flujo de datos + topología de infraestructura).
14. [ ] Estrategia Offline First, cuando corresponda.
15. [ ] Tecnologías previstas y justificación.
16. [ ] Repositorio.
17. [ ] Integrantes, roles y responsabilidades.

### Criterio de aprobación

La preentrega se aprueba cuando existe **coherencia suficiente** entre:

> **Problema → Usuario → Experiencia → Funcionalidades → Arquitectura → Tecnología**

Puede requerir **correcciones** si:

- el problema es demasiado amplio;
- el alcance es excesivo;
- la experiencia no responde al contexto de uso;
- los requisitos no son verificables;
- la arquitectura y las tecnologías no están suficientemente justificadas.

---

## 17. Defensa de la preentrega (§6)

- Cada equipo **podrá ser convocado** a una breve presentación de su propuesta.
- **Todos los integrantes** podrán ser consultados.
- La defensa **no debe limitarse a leer** la documentación entregada.

El equipo debe ser capaz de explicar:

- [ ] Qué problema intenta resolver
- [ ] Quién tiene ese problema
- [ ] Por qué la solución propuesta tiene sentido
- [ ] Por qué se eligió una aplicación móvil
- [ ] Cuáles son los requisitos principales
- [ ] Cómo será la experiencia de uso
- [ ] Cómo se organizarán los datos
- [ ] Cómo funcionará la arquitectura
- [ ] Qué ocurrirá sin conectividad
- [ ] Por qué se eligieron determinadas tecnologías

---

## 18. Uso de inteligencia artificial (§8 — aplica a todo el TPO)

- Se **permite** usar asistentes de IA como herramienta de consulta, revisión, diagnóstico y apoyo.
- El equipo debe poder **comprender, justificar y modificar** todo lo que integra al proyecto.
- En la defensa puede pedirse explicar fragmentos generados/asistidos por IA, sus responsabilidades y por qué se incorporaron.
- **Una respuesta generada por IA no constituye por sí misma una justificación técnica.**

Antes de incorporar una solución propuesta por IA, el equipo debería poder responder:

- ¿Qué problema intenta resolver este código?
- ¿Qué capa o responsabilidad modifica?
- ¿Qué dependencias agrega?
- ¿Existe una alternativa más simple?
- ¿Cómo comprobamos que funciona?
- ¿Qué ocurriría si falla?

---

## 19. Criterios generales de evaluación (§9 — aplica a todo el TPO)

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

### Cierre

El éxito del TPO **no** está determinado por la cantidad de pantallas, calidad de la UI/UX, funcionalidades o tecnologías. Se valora especialmente construir una solución **pequeña, coherente, defendible y funcional**, donde las decisiones de experiencia, arquitectura y tecnología se vinculen con necesidades reales del usuario.

> **Comprender el problema. Diseñar con intención. Implementar con criterio. Validar y poder explicarlo.**
