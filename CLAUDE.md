# OneRM

App móvil (React Native + Expo) que le dice a quien entrena fuerza qué peso, series y repeticiones hacer, y registra el entrenamiento en el gimnasio, con o sin señal. Proyecto del TPO de Desarrollo de Aplicaciones I (UADE). Una sola persona con asistencia de IA: **todo el código tiene que poder explicarse en la defensa**.

## Fuentes de verdad

| Qué | Dónde |
|---|---|
| Qué hace la app (RF, RN, RNF) | `docs/especificacion/` — empezar por `README.md` |
| Decisiones técnicas | `docs/especificacion/adr/` |
| Fases y criterios de salida | `docs/plan-de-implementacion.md` |
| Ramas, commits, PR, tablero, Definición de Hecho | `docs/convenciones.md` |
| Textos de la UI | `docs/especificacion/13-textos.md` |
| Diseño | Figma (enlace en `docs/especificacion/09-trazabilidad.md` §3) y `docs/diseno/marca.md` |
| Tareas y su estado | GitHub Issues + Project «OneRM MVP» (`gh issue view N`) |

Si el código contradice la especificación, **no se inventa**: se señala el hueco y se corrige primero la especificación (o se escribe un ADR nuevo).

## Cómo se trabaja una card

Usar la skill `/card <número>` (o `/card F3` para tomar la próxima card abierta de una fase). Resumen: leer la card y la especificación → publicar el plan en el issue → rama → TDD tarea por tarea → verificar → PR con `Closes #N`. El tablero se mueve con `tools/board.sh`.

**Merge automático:** si todas las verificaciones las completó el agente (incluida la prueba en el emulador) y la CI está en verde, el agente mergea el PR con squash y sigue con la próxima card sin frenar. Al terminar una fase se corren dos jueces sobre todo lo hecho y las correcciones van en un PR aparte. Detalle en la skill `/card` §5–§6.

## Arquitectura (ADR-0011, 12-arquitectura)

```
app/                 Expo Router: solo composición de pantallas
src/domain/          TypeScript puro: modelos, reglas (motor), casos de uso, interfaces de repositorio
src/data/            Drizzle/SQLite, supabase-js, repositorios, mappers, sync
src/presentation/    componentes, ViewModels (useXViewModel), tema, strings
src/di/              composition root: crea implementaciones y las provee por Context
```

- Las dependencias apuntan **hacia el dominio**. `domain` no importa React, Expo, Supabase ni Drizzle. `presentation` no importa `data`. Lo verifica el lint (RNF-11): no se desactiva la regla.
- El **ViewModel** es un hook que expone `{ state, actions }`. El estado es una unión discriminada (`loading | content | empty | error | …`). Llama casos de uso, nunca repositorios ni SDKs.
- **SQLite es la fuente de verdad** de la UI. Toda escritura va primero a la base local (RN-SYNC-01). La UI observa la base; nunca espera a la red.
- El **motor de sugerencias** es una función pura en `src/domain/rules/` (ADR-0009). Sin fechas implícitas: el "ahora" entra como parámetro.
- Los textos de la UI salen de `src/presentation/strings` (RNF-21). Nunca escritos en el componente.

## TDD

1. **Rojo:** escribir primero el test que falla, derivado del AC o del caso de referencia de la especificación. Nombrar el test con el ID (`RF-SUG-03.AC1`, `caso A`).
2. **Verde:** el código mínimo para pasarlo.
3. **Refactor** con los tests en verde.

- Dominio: tests unitarios sin red ni base (RNF-12). Los casos de referencia de `sugerencias.md` son tests literales (RNF-15).
- Datos y sync: tests de integración (`*.int.test.ts`). Cómo se corren contra SQLite lo define el spike #11, y contra Supabase local el spike #12; al cerrarlos se completa esta sección.
- ViewModels: siempre con test, con repositorios falsos inyectados, cubriendo cada estado de la unión.
- Pantallas: un test con Testing Library por estado (`loading`, `content`, `empty`, `error`…) que verifica qué se muestra y que las acciones llaman al ViewModel. Lo visual fino se revisa contra Figma, no con tests.
- Los tests van junto al archivo: `foo.ts` → `foo.test.ts`.
- **Nada de tests en `app/`:** Expo Router toma cada archivo de `app/` como una ruta. La pantalla vive en `src/presentation/features/<feature>/<x>-screen.tsx` (con su test al lado) y el archivo de `app/` solo la reexporta.
- No se escribe código de producción sin un test que lo pida, salvo configuración y componentes puramente visuales.

## Comandos

```bash
bun install
bun run typecheck
bun run lint           # ESLint, falla con cualquier advertencia
bun run format         # Prettier (format:check en CI)
bun run test           # Jest (jest-expo); test:watch, test:coverage
bun run android        # development build en el emulador (expo run:android)
bun run start          # solo Metro, con la app ya instalada
```

No lanzar Metro con `CI=1`: desactiva la vigilancia de archivos y Fast Refresh.

## Reglas

- Commits en Conventional Commits, en español (`feat(sug): …`). Un commit por paso de TDD terminado, no uno gigante al final.
- Archivos en kebab-case (`log-set.ts`, `workout-screen.tsx`); los símbolos en PascalCase (tipos, componentes, casos de uso) o camelCase (funciones, variables).
- Código e identificadores en inglés, con los nombres del glosario (`docs/especificacion/01-glosario.md`). Documentación, commits, issues y PR en español.
- "Sesión" nunca va sola: "sesión de autenticación" o "entrenamiento".
- No agregar dependencias sin justificarlas en el PR (qué problema resuelven, alternativa más simple). Las del stack están en el plan §4.
- La clave `service_role` de Supabase nunca entra en la app (RNF-08).
- No editar `android/` ni `ios/`: se generan con prebuild.
