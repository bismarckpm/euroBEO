import type { SalonCatalogEntry } from "../config/resolve";
import { resolveSalonText } from "../config/resolve";
import { tracked, type FieldStatus, type Tracked } from "./model";

const EMPTY_MARKER = /^(?:\.{2,}|…+|-|—|–)$/;
const CLOCK = /\d{1,2}\s*[:.]\s*\d{2}/;

/** "...", "…" , "-" o blanco: el presupuesto no trajo el dato. */
export function isEmptyMarker(text: string | null | undefined): boolean {
  const value = text?.replace(/\s+/g, " ").trim() ?? "";
  return value.length === 0 || EMPTY_MARKER.test(value);
}

/** Resuelto queda en Regla; ausente o marcador vacío, en Sin dato; otro texto, en Pendiente. */
export function statusForText(text: string | null | undefined, resolved: boolean): FieldStatus {
  if (resolved) {
    return "RULE";
  }
  return isEmptyMarker(text) ? "ABSENT" : "PENDING";
}

export function readSchedule(text: string | null): { value: string | null; status: FieldStatus } {
  const value = text?.replace(/\s+/g, " ").trim() ?? "";
  if (isEmptyMarker(value)) {
    return { value: null, status: "ABSENT" };
  }
  if (CLOCK.test(value)) {
    return { value, status: "RULE" };
  }
  return { value, status: "PENDING" };
}

export function readSetup(text: string | null): { value: string | null; status: FieldStatus } {
  const value = text?.replace(/\s+/g, " ").trim() ?? "";
  if (isEmptyMarker(value)) {
    return { value: null, status: "ABSENT" };
  }
  if (/^por definir$/i.test(value)) {
    return { value, status: "PENDING" };
  }
  return { value, status: "RULE" };
}

function isScheduleLine(line: string): boolean {
  return /horario de montaje|setup schedule|horario de evento|^horario\s*:|^hora\s*:/i.test(line);
}

function isSetupLine(line: string): boolean {
  return /tipo de montaje|setup style|^montaje\s*:/i.test(line);
}

function isPaxLine(line: string): boolean {
  return /\bpax\b|personas?\b|\bcapacity\b|n[°ºo]\s*pax/i.test(line);
}

function isBoundary(line: string): boolean {
  return isScheduleLine(line) || isSetupLine(line) || isPaxLine(line);
}

/** Quita "Salón" solo al inicio, y los sufijos de plantilla que ya unifica el catálogo. */
export function cleanPlace(text: string): string {
  return text
    .replace(/^sal[oó]n\s*:?\s*/i, "")
    .replace(/\s+room$/i, "")
    .replace(/\s*-\s*caracas$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Una etiqueta de espacio, no una frase del servicio. */
function looksLikePlaceLabel(text: string): boolean {
  const value = cleanPlace(text);
  if (!value || value.length > 32) {
    return false;
  }
  if (/[,:;]/.test(value)) {
    return false;
  }
  return value.split(" ").filter(Boolean).length <= 5;
}

/**
 * Lugar del bloque: el valor de "Salón:" si existe;
 * si no, la primera etiqueta antes de horario, montaje o pax.
 * Una línea que empieza por "Salón" gana sobre un texto anterior.
 */
export function readBlockPlace(lines: string[]): string | null {
  let fallback: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isEmptyMarker(trimmed)) {
      continue;
    }
    if (isBoundary(trimmed)) {
      break;
    }
    if (/^sal[oó]n\b/i.test(trimmed) || /\broom$/i.test(trimmed)) {
      const value = cleanPlace(trimmed);
      if (value && looksLikePlaceLabel(value)) {
        return value;
      }
      continue;
    }
    if (!fallback && looksLikePlaceLabel(trimmed)) {
      fallback = cleanPlace(trimmed);
    }
  }
  return fallback;
}

function paxRemainder(line: string): string {
  return line
    .replace(/n[°ºo]\s*pax\s*:?\s*/gi, " ")
    .replace(/\bpax\s*:?\s*/gi, " ")
    .replace(/\bpersonas?\b\s*:?\s*/gi, " ")
    .replace(/\bcapacity\s*:?\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function readPax(lines: string[]): { value: number | null; status: FieldStatus } {
  let unread = false;
  for (const line of lines) {
    if (/montaje|setup style/i.test(line) && !/\bpax\b|personas/i.test(line)) {
      continue;
    }
    const match =
      line.match(/(\d+)\s*personas?\b/i) ||
      line.match(/pax\s*:\s*(\d+)/i) ||
      line.match(/capacity\s*:\s*(\d+)/i) ||
      line.match(/n[°ºo]\s*(?:pax\s*)?(\d+)/i);
    if (match?.[1]) {
      return { value: Number(match[1]), status: "RULE" };
    }
    if (!isPaxLine(line)) {
      continue;
    }
    if (!isEmptyMarker(paxRemainder(line))) {
      unread = true;
    }
  }
  return { value: null, status: unread ? "PENDING" : "ABSENT" };
}

/** Catálogo si coincide; si no, el texto tal cual. Sin texto, Sin dato. Siempre Regla cuando hay lugar. */
export function assignPlace(raw: string | null, salons: SalonCatalogEntry[]): Tracked<string | null> {
  const cleaned = raw ? cleanPlace(raw) : "";
  if (isEmptyMarker(cleaned)) {
    return tracked(null, "ABSENT");
  }
  const resolved = resolveSalonText(cleaned, salons);
  if (resolved.status === "resolved") {
    return tracked(resolved.name, "RULE");
  }
  return tracked(cleaned, "RULE");
}

/** Clave de partición: minúsculas y sin acentos. */
export function placeKey(name: string): string {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}
