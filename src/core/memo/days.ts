const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

type DayParts = { year: number; month: number; day: number };

function parseIsoDate(value: string): DayParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

function joinSpanish(parts: string[]): string {
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }
  if (parts.length === 2) {
    return `${parts[0]} y ${parts[1]}`;
  }
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

/**
 * Lista de días en español: "15, 16 y 17 de octubre de 2026".
 * Acepta fechas ISO `aaaa-mm-dd`, las ordena y no repite.
 */
export function formatSpanishDayList(dates: string[]): string {
  const unique = new Map<string, DayParts>();
  for (const date of dates) {
    const parts = parseIsoDate(date);
    if (parts) {
      unique.set(`${parts.year}-${parts.month}-${parts.day}`, parts);
    }
  }
  const ordered = [...unique.values()].sort((left, right) =>
    left.year - right.year || left.month - right.month || left.day - right.day,
  );
  if (ordered.length === 0) {
    return "";
  }
  const groups: { year: number; month: number; days: number[] }[] = [];
  for (const parts of ordered) {
    const current = groups[groups.length - 1];
    if (current && current.year === parts.year && current.month === parts.month) {
      current.days.push(parts.day);
    } else {
      groups.push({ year: parts.year, month: parts.month, days: [parts.day] });
    }
  }
  const sameYear = groups.every((group) => group.year === groups[0]?.year);
  const phrases = groups.map((group) => {
    const month = MONTHS[group.month - 1] ?? "";
    const phrase = `${joinSpanish(group.days.map(String))} de ${month}`;
    return sameYear ? phrase : `${phrase} de ${group.year}`;
  });
  const listed = joinSpanish(phrases);
  return sameYear ? `${listed} de ${groups[0]?.year ?? ""}` : listed;
}

/** Fecha del memorándum, como en la plantilla: "15 de octubre del 2026". */
export function formatMemoDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const month = value("month").toLowerCase();
  return `${value("day")} de ${month} del ${value("year")}`;
}
