# ADR — Registro de decisiones de arquitectura

Cada decisión técnica relevante se registra con su **contexto, alternativas, consecuencias y riesgos**. Así se cumple el principio rector del TPO: cada tecnología se justifica por el problema. Además, este registro es material directo para la defensa.

## Estados

`Propuesto` → `Aceptado` → (`Reemplazado por ADR-XXXX` | `Obsoleto`)

## Índice

| ADR | Decisión | Estado |
|---|---|---|
| [0001](0001-supabase-directo-sin-backend-propio.md) | La app habla directo con Supabase, sin backend propio | Aceptado |
| [0002](0002-estrategia-de-sincronizacion.md) | Sync local primero: LWW por registro, borrado lógico, derivados sin sincronizar | Aceptado |
| [0003](0003-modo-invitado.md) | Modo invitado con migración a cuenta | Aceptado |
| [0004](0004-catalogo-canonico-y-seed-multifuente.md) | Catálogo con modelo canónico y seed multifuente (adaptadores) | Aceptado |
| [0005](0005-tipos-de-carga.md) | Tipos de carga del MVP: externa y peso corporal | Aceptado |
| [0006](0006-rotacion-de-dias.md) | Rotación de días derivada del historial, con cambio manual | Aceptado |
| [0007](0007-react-native-con-expo.md) | React Native con Expo (development build, sin Expo Go) | Aceptado |
| [0008](0008-registro-unilateral.md) | Registro de series unilaterales por lado, con el lado limitante para el motor | Aceptado |
| [0009](0009-motor-como-funcion-pura.md) | El motor de sugerencias es una función pura (fold) sobre el historial y no se persiste | Aceptado |
| [0010](0010-base-local-sqlite-drizzle.md) | Base local: expo-sqlite + Drizzle ORM | Aceptado |
| [0011](0011-mvvm-clean-en-react-native.md) | MVVM + Clean en RN: ViewModel como hook, Zustand y DI por Context | Aceptado |
| [0012](0012-soporte-ios.md) | iOS ejecutable (simulador), sin publicar; Android como referencia | Aceptado |

## Plantilla

```md
# ADR-NNNN — Título

- **Estado:** Propuesto
- **Fecha:** AAAA-MM-DD
- **Relacionado:** RF-…, RN-…, ADR-…

## Contexto
Qué problema o fuerza obliga a decidir.

## Decisión
Qué se decide, de forma concreta.

## Alternativas consideradas
| Alternativa | A favor | En contra |

## Consecuencias
Positivas y negativas.

## Riesgos y mitigaciones
| # | Riesgo | Mitigación |

## Cuándo revisar esta decisión
Condiciones que la invalidarían.
```
