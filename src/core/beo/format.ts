const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** Reparte céntimos en partes iguales. El residuo queda en el último día. */
export function splitCents(total: number, parts: number): number[] {
  if (parts < 1) {
    throw new Error("La renta se reparte en al menos un día.");
  }
  const base = Math.trunc(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, index) =>
    base + (index === parts - 1 ? remainder : 0),
  );
}

/** `2026-10-23` → `23.10.2026`, sin depender de la zona horaria. */
export function formatBeoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new Error("La fecha de la B.E.O. debe ser ISO.");
  }
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export function spanishWeekday(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new Error("La fecha de la B.E.O. debe ser ISO.");
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return WEEKDAYS[date.getUTCDay()] ?? "Día";
}

const AMOUNT = /\d{1,3}(?:\.\d{3})*,\d{2}/g;

/** Monto de céntimos como `1.234,56`. */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const whole = String(Math.trunc(absolute / 100));
  const fraction = String(absolute % 100).padStart(2, "0");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped},${fraction}`;
}

/** Antepone USD a cada monto. El guion de cortesía no es un monto. */
export function labelAmount(value: string): string {
  const text = value.trim();
  if (!text || text === "—" || text === "-") {
    return text;
  }
  return text.replace(AMOUNT, (amount, offset: number) => {
    const before = text.slice(Math.max(0, offset - 4), offset);
    return /USD\s*$/i.test(before) ? amount : `USD ${amount}`;
  });
}

/** Quita "Salón" solo cuando abre el nombre. */
export function displaySalon(name: string): string {
  return name.replace(/^sal[oó]n\s*:?\s*/i, "").replace(/\s+/g, " ").trim();
}

export function personnelLine(qty: number, description: string, unitPriceCents: number | null): string {
  const price = unitPriceCents === null ? "—" : formatCents(unitPriceCents);
  return `${String(qty).padStart(2, "0")} ${description} USD ${price} c/u`;
}
