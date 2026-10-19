const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function iso(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function datesBetween(year: number, month: number, start: number, end: number): string[] | null {
  if (end < start) {
    return null;
  }
  const dates: string[] = [];
  for (let day = start; day <= end; day += 1) {
    const value = iso(year, month, day);
    if (!value) {
      return null;
    }
    dates.push(value);
  }
  return dates;
}

/**
 * Fechas de una línea de día. `null` si la línea no es una fecha.
 * "23 y 24" lista esos días; "del 15 al 19" expande el rango.
 */
export function parseDateList(input: string, fallbackYear?: number): string[] | null {
  const text = fold(input).replace(
    /^(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+/,
    "",
  );

  const english = text.match(
    /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(.+?)\s+(\d{4})$/,
  );
  if (english) {
    const month = MONTHS[english[1]];
    const year = Number(english[3]);
    const days = english[2]
      .replace(/\band\b/g, " ")
      .split(/\s+/)
      .map((part) => Number(part.replace(/\D/g, "")))
      .filter((day) => day > 0);
    if (!month || days.length === 0) {
      return null;
    }
    const dates = days.map((day) => iso(year, month, day));
    return dates.every((date): date is string => date !== null) ? dates : null;
  }

  const spanish = text.match(
    /^(?:del\s+)?(\d{1,2})(?:\s+(y|al)\s+(\d{1,2}))?\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?$/,
  );
  if (!spanish) {
    return null;
  }

  const month = MONTHS[spanish[4]];
  const year = spanish[5] ? Number(spanish[5]) : fallbackYear;
  if (!month || !year) {
    return null;
  }

  const start = Number(spanish[1]);
  const end = spanish[3] ? Number(spanish[3]) : start;
  if (spanish[2] === "y") {
    const first = iso(year, month, start);
    const second = iso(year, month, end);
    return first && second ? [first, second] : null;
  }
  return datesBetween(year, month, start, end);
}
