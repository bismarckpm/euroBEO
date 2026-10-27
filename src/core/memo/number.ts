export const MEMO_SEQUENCE_KEY = "memo";

/** Siguiente entero libre, sin consumir el último emitido. */
export function proposeNextMemoNumber(lastNumber: number, taken: readonly string[] = []): string {
  if (!Number.isInteger(lastNumber) || lastNumber < 0) {
    throw new Error("El último número de memorándum debe ser un entero mayor o igual a cero.");
  }
  const used = new Set(taken.map((value) => value.trim()).filter(Boolean));
  let cursor = lastNumber;
  let candidate = "";
  do {
    cursor += 1;
    candidate = String(cursor);
  } while (used.has(candidate));
  return candidate;
}

export function parseMemoNumber(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }
  const number = Number(value.trim());
  return Number.isSafeInteger(number) ? number : null;
}
