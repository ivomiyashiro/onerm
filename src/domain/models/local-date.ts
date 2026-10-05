/**
 * A calendar date in the device time zone, as `YYYY-MM-DD` (RN-GEN-01). Instants are stored in
 * UTC; days, weeks and "today" are local. The caller passes it in: the domain never reads the
 * clock (RN-SUG-16).
 */
export type LocalDate = `${number}-${number}-${number}`;
