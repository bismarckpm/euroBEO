export type DateFormat = "dd/mm/yy" | "dd.mm.yyyy";

export type EventHeaderSource = "client" | "title";

export type BeoPresentation = {
  eventHeaderSource: EventHeaderSource;
  dateFormat: DateFormat;
  uppercaseDayAndContact: boolean;
  setupLabel: string;
  serviceLabel: string;
  teardownLabel: string;
  tableCalculation: boolean;
};

export type EventTypeEntry = {
  label: string;
  keywords: string[];
};

export type BeoSettings = {
  presentation: BeoPresentation;
  eventTypes: EventTypeEntry[];
};

export const defaultPresentation: BeoPresentation = {
  eventHeaderSource: "title",
  dateFormat: "dd.mm.yyyy",
  uppercaseDayAndContact: false,
  setupLabel: "Montaje:",
  serviceLabel: "Servicio Evento:",
  teardownLabel: "Desmontaje:",
  tableCalculation: false,
};

/** Etiquetas que ya imprime la asistente y las palabras que las disparan. */
export const defaultEventTypes: EventTypeEntry[] = [
  { label: "CATA", keywords: ["cata"] },
  { label: "Congreso", keywords: ["congreso"] },
  { label: "Almuerzo", keywords: ["almuerzo"] },
  { label: "Cóctel", keywords: ["cóctel", "coctel"] },
  { label: "Cena", keywords: ["cena"] },
  { label: "Celebración", keywords: ["celebración", "celebracion"] },
  { label: "Reunión", keywords: ["reunión", "reunion"] },
];

export const defaultBeoSettings: BeoSettings = {
  presentation: defaultPresentation,
  eventTypes: defaultEventTypes,
};

export function parsePresentation(body: string): BeoPresentation {
  try {
    const parsed = JSON.parse(body) as Partial<BeoPresentation>;
    return {
      eventHeaderSource: parsed.eventHeaderSource === "client" ? "client" : "title",
      dateFormat: parsed.dateFormat === "dd/mm/yy" ? "dd/mm/yy" : "dd.mm.yyyy",
      uppercaseDayAndContact: Boolean(parsed.uppercaseDayAndContact),
      setupLabel: parsed.setupLabel?.trim() || defaultPresentation.setupLabel,
      serviceLabel: parsed.serviceLabel?.trim() || defaultPresentation.serviceLabel,
      teardownLabel: parsed.teardownLabel?.trim() || defaultPresentation.teardownLabel,
      tableCalculation: Boolean(parsed.tableCalculation),
    };
  } catch {
    return defaultPresentation;
  }
}

export function parseEventTypes(body: string): EventTypeEntry[] {
  try {
    const parsed = JSON.parse(body) as EventTypeEntry[];
    if (!Array.isArray(parsed)) {
      return defaultEventTypes;
    }
    const types = parsed
      .filter((entry) => entry && typeof entry.label === "string" && Array.isArray(entry.keywords))
      .map((entry) => ({
        label: entry.label.trim(),
        keywords: entry.keywords.map((keyword) => keyword.trim()).filter(Boolean),
      }))
      .filter((entry) => entry.label.length > 0 && entry.keywords.length > 0);
    return types.length > 0 ? types : defaultEventTypes;
  } catch {
    return defaultEventTypes;
  }
}
