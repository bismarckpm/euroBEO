export type EventStatusLabel = "en revisión" | "generado";

export type HistoryEvent = {
  id: string;
  title: string;
  company: string;
  locator: string;
  dates: string[];
  beoStatuses: string[];
};

export type HistoryQuery = {
  text?: string;
  date?: string;
  page?: number;
  pageSize?: number;
};

export const HISTORY_PAGE_SIZE = 20;

/** Estado del evento en el historial. */
export function eventListStatus(statuses: readonly string[]): EventStatusLabel {
  if (statuses.length === 0) {
    return "en revisión";
  }
  const settled = statuses.every((status) => status === "generated" || status === "voided");
  return settled ? "generado" : "en revisión";
}

/** Convierte `dd/mm/aaaa` o `dd.mm.aaaa` a ISO. Devuelve null si no es una fecha. */
export function searchDateIso(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const match = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

export function formatHistoryDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return iso;
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function includesText(event: HistoryEvent, text: string): boolean {
  const needle = text.trim().toLocaleLowerCase("es");
  if (!needle) {
    return true;
  }
  return [event.company, event.title, event.locator].some((value) =>
    value.toLocaleLowerCase("es").includes(needle),
  );
}

/** Filtra y pagina el historial. La fecha vacía no filtra; una fecha inválida no devuelve eventos. */
export function searchEvents(events: readonly HistoryEvent[], query: HistoryQuery): HistoryEvent[] {
  const pageSize = query.pageSize ?? HISTORY_PAGE_SIZE;
  const page = Math.max(1, query.page ?? 1);
  const dateText = query.date?.trim() ?? "";
  const iso = dateText ? searchDateIso(dateText) : null;
  if (dateText && !iso) {
    return [];
  }
  const matched = events.filter((event) => {
    if (query.text && !includesText(event, query.text)) {
      return false;
    }
    if (iso && !event.dates.includes(iso)) {
      return false;
    }
    return true;
  });
  const start = (page - 1) * pageSize;
  return matched.slice(start, start + pageSize);
}
