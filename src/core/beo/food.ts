import { formatCents } from "./format";

export type StructuredFood = {
  title: string;
  lines: string[];
  includes?: string;
  note?: string;
  paxLabel?: string;
  unitPrice: string;
  priceSuffix: string;
  needsReview: boolean;
};

function isNote(line: string): boolean {
  return /^se calculan\b/i.test(line.trim());
}

/** Separa título, menú, Incluye y nota. El N° pax solo si la cantidad es el pax del bloque. */
export function structureFood(input: {
  description: string;
  qty: number;
  unitPriceCents: number | null;
  blockPax: number | null;
  setup: string | null;
  tableCalculation: boolean;
}): StructuredFood {
  const rawLines = input.description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const title = rawLines[0] ?? input.description.trim();
  const rest = rawLines.slice(1);
  const menu: string[] = [];
  const includeLines: string[] = [];
  let note: string | undefined;
  let inIncludes = false;

  for (const line of rest) {
    const include = line.match(/^incluye\s*:\s*(.*)$/i);
    if (include) {
      inIncludes = true;
      if (include[1]?.trim()) {
        includeLines.push(include[1].trim());
      }
      continue;
    }
    if (isNote(line)) {
      note = line.replace(/\.\s*$/, "");
      inIncludes = false;
      continue;
    }
    if (inIncludes) {
      includeLines.push(line.replace(/\.\s*$/, "") + (line.endsWith(".") ? "." : ""));
      continue;
    }
    menu.push(line);
  }

  const samePax = input.blockPax !== null && input.qty === input.blockPax;
  const needsReview = input.blockPax !== null && input.qty !== input.blockPax;
  const completed = input.tableCalculation ? completeTableNote(note, input.setup, input.blockPax) : note;

  return {
    title,
    lines: menu,
    ...(includeLines.length > 0 ? { includes: includeLines.join(" ").replace(/\s+/g, " ").trim() } : {}),
    ...(completed ? { note: completed } : {}),
    ...(samePax ? { paxLabel: String(input.qty) } : {}),
    unitPrice: input.unitPriceCents === null ? "" : formatCents(input.unitPriceCents),
    priceSuffix: "c/u x pax",
    needsReview,
  };
}

/** `para N personas` y `Se calculan X por mesa` → mesas = redondeo hacia arriba de pax / N. */
export function completeTableNote(
  note: string | undefined,
  setup: string | null,
  blockPax: number | null,
): string | undefined {
  if (!note || blockPax === null || !setup) {
    return note;
  }
  const perTable = setup.match(/para\s+(\d+)\s+personas/i);
  const count = note.match(/se calculan\s+(\d+)\s+por mesa/i);
  if (!perTable?.[1] || !count?.[1]) {
    return note;
  }
  const seats = Number(perTable[1]);
  if (seats < 1) {
    return note;
  }
  const tables = Math.ceil(blockPax / seats);
  return `Se calculan ${count[1]} tablas por mesa - ${tables} mesas`;
}

export function foodSummary(food: StructuredFood): string {
  const parts = [food.title, ...food.lines];
  if (food.includes) {
    parts.push(`Incluye: ${food.includes}`);
  }
  if (food.note) {
    parts.push(food.note);
  }
  if (food.paxLabel) {
    parts.push(`N° pax: ${food.paxLabel}`);
  }
  if (food.unitPrice) {
    parts.push(`Precio: USD ${food.unitPrice} ${food.priceSuffix}`);
  }
  return parts.join("\n");
}
