import { formatBeoNumber, parseBeoNumber, type SequenceState } from "../config/sequence";

export type PlannedNumber = {
  id: string;
  copy: number;
  number: string;
};

/** Siguientes correlativos, sin consumirlos. */
export function consecutiveBeoNumbers(last: SequenceState, count: number): string[] {
  return Array.from({ length: count }, (_, index) => formatBeoNumber(last.lastNumber + 1 + index, last.year));
}

/**
 * Asigna un número por documento, en el orden recibido.
 * El primer ejemplar de cada B.E.O. usa el número editado si tiene la forma oficial.
 * El ejemplar de Sistemas, si existe, toma el siguiente.
 */
export function planNumbers(input: {
  last: SequenceState;
  parts: { id: string; copies: number }[];
  overrides: string[];
}): { documents: PlannedNumber[]; lastNumber: number } {
  const year = input.last.year;
  let cursor = input.last.lastNumber;
  const used = new Set<string>();
  const documents: PlannedNumber[] = [];

  function take(preferred: string | null): string {
    if (preferred) {
      const parsed = parseBeoNumber(preferred);
      if (parsed && parsed.year === year && !used.has(preferred)) {
        used.add(formatBeoNumber(parsed.lastNumber, parsed.year));
        cursor = Math.max(cursor, parsed.lastNumber);
        return formatBeoNumber(parsed.lastNumber, parsed.year);
      }
    }
    let number = "";
    do {
      cursor += 1;
      number = formatBeoNumber(cursor, year);
    } while (used.has(number));
    used.add(number);
    return number;
  }

  input.parts.forEach((part, index) => {
    const preferred = input.overrides[index]?.trim() || null;
    for (let copy = 0; copy < part.copies; copy += 1) {
      documents.push({
        id: part.id,
        copy,
        number: take(copy === 0 ? preferred : null),
      });
    }
  });

  return { documents, lastNumber: cursor };
}

/** Números del lote que ya existen o que se repiten dentro del lote. */
export function repeatedNumbers(planned: string[], alreadyUsed: readonly string[]): string[] {
  const used = new Set(alreadyUsed);
  const seen = new Set<string>();
  const repeated: string[] = [];
  for (const number of planned) {
    if (used.has(number) || seen.has(number)) {
      repeated.push(number);
    }
    seen.add(number);
  }
  return repeated;
}
