import { lineText, type TextLine } from "./fragments";

export type ColumnName = "cantidad" | "descripcion" | "noches" | "moneda" | "tarifa" | "total";

export type ColumnBounds = Record<ColumnName, [number, number]>;

export const FALLBACK_COLUMNS: ColumnBounds = {
  cantidad: [0, 120],
  descripcion: [120, 310],
  noches: [310, 365],
  moneda: [365, 420],
  tarifa: [420, 495],
  total: [495, 720],
};

const HEADER_PATTERNS: { name: ColumnName; pattern: RegExp }[] = [
  { name: "cantidad", pattern: /^cantidad$/i },
  { name: "descripcion", pattern: /^descripci[oó]n$/i },
  { name: "noches", pattern: /^(noches|d[ií]a)$/i },
  { name: "moneda", pattern: /^moneda$/i },
  { name: "tarifa", pattern: /^(tarifa|sub\s*-?\s*total)$/i },
  { name: "total", pattern: /^total$/i },
];

export function isTableHeader(text: string): boolean {
  const folded = text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return folded.includes("cantidad") && folded.includes("descrip") && /\btotal\b/.test(folded);
}

/** Límites de columna a partir de la fila Cantidad / Descripción / Total. */
export function columnsFromHeader(line: TextLine): ColumnBounds | null {
  const found = new Map<ColumnName, number>();
  for (const fragment of line.fragments) {
    const text = fragment.text.trim().replace(/\s+/g, " ");
    const match = HEADER_PATTERNS.find((candidate) => candidate.pattern.test(text));
    if (match && !found.has(match.name)) {
      found.set(match.name, fragment.x);
    }
  }

  const ordered = HEADER_PATTERNS.map((candidate) => {
    const x = found.get(candidate.name);
    return x === undefined ? null : { name: candidate.name, x };
  }).filter((entry): entry is { name: ColumnName; x: number } => entry !== null);

  if (ordered.length < 4 || !found.has("cantidad") || !found.has("total")) {
    return null;
  }

  const bounds = {} as ColumnBounds;
  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];
    const previous = ordered[index - 1];
    const next = ordered[index + 1];
    const start = previous ? (previous.x + current.x) / 2 : 0;
    const end = next ? (current.x + next.x) / 2 : Math.max(current.x + 80, 720);
    bounds[current.name] = [start, end];
  }

  for (const candidate of HEADER_PATTERNS) {
    if (!bounds[candidate.name]) {
      return null;
    }
  }
  return bounds;
}

function columnAt(columns: ColumnBounds, x: number): ColumnName | null {
  const names = Object.keys(columns) as ColumnName[];
  return names.find((name) => x >= columns[name][0] && x < columns[name][1]) ?? null;
}

/**
 * Un fragmento largo que empieza en Cantidad pero vive en Descripción
 * se lee como descripción. Los montos cortos se quedan en la columna de su borde izquierdo.
 */
export function textInColumn(line: TextLine, columns: ColumnBounds, name: ColumnName): string {
  return line.fragments
    .filter((fragment) => {
      const left = columnAt(columns, fragment.x);
      const center = columnAt(columns, fragment.x + fragment.width / 2);
      if (fragment.width > 40 && center && left && center !== left) {
        return center === name;
      }
      return left === name;
    })
    .map((fragment) => fragment.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function minX(line: TextLine): number {
  return Math.min(...line.fragments.map((fragment) => fragment.x));
}

export function joinedText(line: TextLine): string {
  return lineText(line);
}
