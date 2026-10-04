/** 13-textos §1 «Plurales»: "1 día", "3 días". */
export function count(n: number, one: string, other: string): string {
  return `${n} ${n === 1 ? one : other}`;
}
