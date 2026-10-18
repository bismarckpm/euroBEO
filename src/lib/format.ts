const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

function assertValidDate(date: Date): void {
  if (Number.isNaN(date.getTime())) {
    throw new Error("La fecha es inválida.");
  }
}

function dateParts(date: Date): { day: string; month: string; year: string } {
  assertValidDate(date);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()),
  };
}

/** Formatea un monto en céntimos enteros como `1.234,56`. */
export function formatAmount(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error("El monto debe expresarse en céntimos enteros.");
  }

  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const whole = String(Math.trunc(absolute / 100));
  const fraction = String(absolute % 100).padStart(2, "0");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped},${fraction}`;
}

/** Fecha de interfaz: `dd/mm/aaaa`. Usa el calendario local. */
export function formatDateSlash(date: Date): string {
  const { day, month, year } = dateParts(date);
  return `${day}/${month}/${year}`;
}

/** Fecha de la fila de la B.E.O.: `dd.mm.aaaa`. Usa el calendario local. */
export function formatDateDots(date: Date): string {
  const { day, month, year } = dateParts(date);
  return `${day}.${month}.${year}`;
}

/** Día de la semana en español, con mayúscula inicial. */
export function formatWeekday(date: Date): string {
  assertValidDate(date);
  return WEEKDAYS[date.getDay()] ?? "Domingo";
}
