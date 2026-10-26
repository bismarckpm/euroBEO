const COURTESY = /cortes[ií]a|incluido en el evento|incluido en el/i;

/** True cuando el total del salón es cortesía o va incluido en el evento. */
export function isCourtesyAmount(raw: string): boolean {
  return COURTESY.test(raw);
}

/**
 * Interpreta un monto decorativo como céntimos positivos.
 * Acepta `1.234,56`, `1,234.56`, paréntesis y guiones. Sin separador decimal no es monto.
 */
export function parseAmount(raw: string): number | null {
  const compact = raw.replace(/\s+/g, "");
  if (!compact || compact === "-" || isCourtesyAmount(raw)) {
    return null;
  }

  const match = compact.match(/(\d[\d.,]*)/);
  if (!match) {
    return null;
  }

  let numeric = match[1].replace(/[.,]+$/g, "");
  if (!/[.,]/.test(numeric)) {
    return null;
  }

  const lastComma = numeric.lastIndexOf(",");
  const lastDot = numeric.lastIndexOf(".");
  if (lastComma > lastDot) {
    numeric = numeric.replace(/\./g, "").replace(",", ".");
  } else {
    numeric = numeric.replace(/,/g, "");
  }

  if (!/^\d+(\.\d+)?$/.test(numeric)) {
    return null;
  }

  const [whole, fraction = ""] = numeric.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  return Number.isInteger(cents) ? cents : null;
}

/** Último monto con decimales. Ignora un porcentaje que antecede al importe. */
export function lastAmount(raw: string): number | null {
  const matches = raw.match(/\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}/g);
  const last = matches?.at(-1);
  return last ? parseAmount(last) : null;
}

/** Quita montos con separador y deja el texto del descuento. */
export function stripMoney(raw: string): string {
  return raw
    .replace(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})|\d+[.,]\d{2}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
