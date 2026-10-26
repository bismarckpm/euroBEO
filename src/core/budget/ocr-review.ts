import type { TextFragment } from "./fragments";
import type { ParsedBudget } from "./model";

export type OcrReviewField = {
  key: string;
  label: string;
  value: string;
  status: "VALIDATE" | "RULE";
  cropId: string | null;
  amountVerified: boolean;
};

export type HandwritingNote = {
  cropId: string;
  page: number;
  message: string;
};

const HEADER_FIELDS: { key: string; label: string; read: (budget: ParsedBudget) => string | null }[] = [
  { key: "executive", label: "Ejecutiva", read: (budget) => budget.header.executive },
  { key: "company", label: "Empresa", read: (budget) => budget.client.company },
  { key: "contact", label: "Contacto", read: (budget) => budget.client.contact },
  { key: "phone", label: "Teléfono", read: (budget) => budget.client.phones },
  { key: "rif", label: "RIF", read: (budget) => budget.client.rif },
  { key: "eventTitle", label: "Evento", read: (budget) => budget.eventTitle },
];

function cropFor(value: string, fragments: TextFragment[]): string | null {
  const needle = value.trim().toLowerCase();
  if (needle.length < 3) {
    return null;
  }
  let best: { id: string; score: number } | null = null;
  for (const fragment of fragments) {
    if (!fragment.cropId) {
      continue;
    }
    const text = fragment.text.trim().toLowerCase();
    if (text.length < 2) {
      continue;
    }
    if (!needle.includes(text) && !text.includes(needle)) {
      continue;
    }
    const score = Math.min(text.length, needle.length);
    if (!best || score > best.score) {
      best = { id: fragment.cropId, score };
    }
  }
  return best?.id ?? null;
}

/** Campos del escaneo que la asistente debe validar, con el recorte de donde se leyeron. */
export function buildOcrReview(budget: ParsedBudget, fragments: TextFragment[]): OcrReviewField[] {
  const fields: OcrReviewField[] = HEADER_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    value: field.read(budget)?.trim() ?? "",
    status: "VALIDATE",
    cropId: cropFor(field.read(budget) ?? "", fragments),
    amountVerified: false,
  }));
  let index = 0;
  for (const day of budget.days) {
    for (const block of day.blocks) {
      for (const section of block.sections) {
        for (const item of section.items) {
          const label = item.description.split("\n")[0]?.trim() || "Ítem";
          fields.push({
            key: `item-${index}`,
            label,
            value: label,
            status: "VALIDATE",
            cropId: cropFor(label, fragments),
            amountVerified: item.flags.includes("verified"),
          });
          index += 1;
        }
      }
    }
  }
  return fields;
}

export function handwritingNotes(notes: { cropId: string; page: number }[]): HandwritingNote[] {
  return notes.map((note) => ({
    cropId: note.cropId,
    page: note.page,
    message: "Puede haber una corrección manuscrita que no se leyó.",
  }));
}
