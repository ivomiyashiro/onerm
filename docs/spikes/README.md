# Spikes

Un spike responde **una pregunta técnica** con código exploratorio y tiempo acotado, antes de construir encima. Cada spike deja una nota en esta carpeta, aunque el resultado sea "no funcionó".

## Índice

| Nota | Pregunta | Issue | Decisión |
|---|---|---|---|
| [11-sqlite-drizzle](11-sqlite-drizzle.md) | ¿Drizzle sobre expo-sqlite cubre ADR-0010 y cómo se testean los repositorios en Jest? | #11 | Se confirma. WAL y FK se activan al abrir; tests de integración con `better-sqlite3` |

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
