/** Tolerancia de RN-GEN-02: absorbe el redondeo de la conversión kg ↔ lb. */
export const LOAD_EQUALITY_TOLERANCE_KG = 0.05;

// En coma flotante 60.05 - 60 = 0.04999999999999716: sin este margen, una diferencia
// de exactamente 0,05 kg contaría como igual.
const FLOAT_EPSILON = 1e-9;

/** RN-GEN-02: dos cargas (en kg) son iguales si difieren en menos de 0,05 kg. */
export function areLoadsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < LOAD_EQUALITY_TOLERANCE_KG - FLOAT_EPSILON;
}
