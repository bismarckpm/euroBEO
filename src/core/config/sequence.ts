const BEO_NUMBER = /^0\.(\d+)\/(\d{2})$/;

export type SequenceState = {
  lastNumber: number;
  year: number;
};

/** Formato oficial 0.NNN/AA. El correlativo crece sin tope de tres dígitos. */
export function formatBeoNumber(lastNumber: number, year: number): string {
  if (!Number.isInteger(lastNumber) || lastNumber < 0) {
    throw new Error("El número de B.E.O. debe ser un entero mayor o igual a cero.");
  }
  if (!Number.isInteger(year) || year < 0 || year > 99) {
    throw new Error("El año del correlativo debe tener dos dígitos.");
  }
  return `0.${String(lastNumber).padStart(3, "0")}/${String(year).padStart(2, "0")}`;
}

export function parseBeoNumber(value: string): SequenceState | null {
  const match = BEO_NUMBER.exec(value.trim());
  if (!match) {
    return null;
  }
  return { lastNumber: Number(match[1]), year: Number(match[2]) };
}

/** Siguiente número propuesto, sin consumirlo. */
export function proposeNextBeoNumber(lastNumber: number, year: number): string {
  return formatBeoNumber(lastNumber + 1, year);
}
