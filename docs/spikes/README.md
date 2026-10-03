# Spikes

Un spike responde **una pregunta técnica** con código exploratorio y tiempo acotado, antes de construir encima. Cada spike deja una nota en esta carpeta, aunque el resultado sea "no funcionó".

## Índice

| Nota | Pregunta | Issue | Decisión |
|---|---|---|---|
| [11-sqlite-drizzle](11-sqlite-drizzle.md) | ¿Drizzle sobre expo-sqlite cubre ADR-0010 y cómo se testean los repositorios en Jest? | #11 | Se confirma. WAL y FK se activan al abrir; tests de integración con `better-sqlite3` |
| [12-supabase-local](12-supabase-local.md) | ¿RLS y triggers imponen solos las reglas de 07 §3, y se testea con dos usuarios? | #12 | Se confirma. Trigger compartido, pgTAP + supabase-js, job de CI |
| [13-push-pull](13-push-pull.md) | ¿La sync propia de ADR-0002 entra en el tiempo? (plan B) | #13 | Se confirma la sync propia. Plan B descartado. F8 ≈ 6 días |
| [14-rest-notification](14-rest-notification.md) | ¿La notificación programada avisa con ≤ 5 s de retraso con la pantalla bloqueada? | #14 | Sí con alarmas exactas (0,5 s). Sin el permiso de alarmas exactas no se programa el aviso: se pide al usuario. Medición en un dispositivo físico: limitación conocida |
| [15-secure-session](15-secure-session.md) | ¿La sesión cifrada (clave en el Keystore) funciona como `storage` de supabase-js? | #15 | Se confirma, con `expo-crypto` AES-GCM, `expo-secure-store` y `expo-sqlite/kv-store` |

## Plantilla

Copiar en `NN-nombre-corto.md`:

```md
# Spike NN — <pregunta en una línea>

- **Issue:** #N
- **Fecha:** AAAA-MM-DD
- **Tiempo acotado:** N horas · **Tiempo real:** N horas
- **ADR / RNF relacionados:** …

## Pregunta
Qué necesitamos saber y por qué bloquea el desarrollo.

## Criterio de éxito
Qué tiene que pasar para responder "sí".

## Qué se hizo
Pasos, versiones de las librerías y enlaces a la documentación consultada.

## Resultado
Qué funcionó, qué no, mediciones.

## Decisión
Se confirma / se ajusta / se descarta. Si cambia un ADR, enlace al ADR nuevo.

## Código
Rama o carpeta. Se indica si se conserva o se descarta.
```
