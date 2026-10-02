# ADR-0003 — Modo invitado con migración a cuenta

- **Estado:** Aceptado
- **Fecha:** 2026-09-30
- **Relacionado:** RF-AUTH-01, RF-AUTH-05, RN-AUTH-04, RN-SYNC-09

## Contexto

Si el login fuera obligatorio, **el primer uso necesitaría conexión**, y eso contradice el discurso de Offline First. Además agrega fricción justo cuando el novato decide si la app le sirve.

## Decisión

- La app se puede usar **completa como invitado**, con datos solo locales y sin sincronización.
- Al **registrarse**, los datos del invitado pasan automáticamente a la cuenta.
- Al **iniciar sesión en una cuenta existente** teniendo datos de invitado, se pregunta si **sumar** o **descartar**. Descartar requiere confirmación.
- Al sumar, **nada se sobrescribe**: se agregan registros, y el perfil y la rutina activa de la cuenta prevalecen (RN-AUTH-04).
- La migración es **local** (reasigna la propiedad de los registros) y después se sincroniza normalmente. No depende de que la subida se complete en el momento.

## Alternativas consideradas

| Alternativa | A favor | En contra |
|---|---|---|
| **Invitado + migración** (elegida) | Primer uso sin red, poca fricción | Hay que implementar la migración y la fusión |
| Login obligatorio | Más simple: siempre hay usuario | Primer uso con red; fricción; contradice Offline First |
| Invitado sin migración | Simple | Pierde los datos al crear la cuenta: inaceptable |

## Consecuencias

- ✅ Coherente con el contexto de uso y con Offline First.
- ⚠️ Los registros tienen que admitir "sin dueño remoto" hasta la migración.
- ⚠️ Hay un nuevo estado de interfaz: "sin respaldo".

## Riesgos y mitigaciones

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | El invitado pierde el teléfono y pierde todo. | Aviso permanente en el perfil y recordatorio no intrusivo (RF-AUTH-01, AC4 y AC5). |
| R2 | Al sumar aparecen rutinas duplicadas (por ejemplo, la misma plantilla adoptada dos veces). | Se acepta: el usuario puede eliminar una. No se deduplica automáticamente. |
| R3 | Los entrenamientos del invitado y de la cuenta se intercalan en fechas y afectan las sugerencias. | Es el comportamiento correcto: el historial es de la misma persona. Los derivados se recalculan (RN-SYNC-10). |
