import { markVerifiedRows } from "../core/budget/arithmetic";
import type { ParsedBudget } from "../core/budget/model";
import { handwritingNotes, buildOcrReview, type HandwritingNote, type OcrReviewField } from "../core/budget/ocr-review";
import { parseBudget, type BudgetCatalog } from "../core/budget/parse-budget";
import type { OcrCrop } from "../core/budget/ocr-source";
import { readOcr } from "./ocr-client";
import { BudgetReadError, extractPdfFragments } from "./pdf-text";

export type BudgetDocument = {
  budget: ParsedBudget;
  crops: OcrCrop[];
  ocrFields: OcrReviewField[];
  handwriting: HandwritingNote[];
};

/** Lee un PDF digital directo o, si no tiene texto, por el servicio de OCR. */
export async function readBudgetDocument(data: Uint8Array, catalog: BudgetCatalog): Promise<BudgetDocument> {
  try {
    const fragments = await extractPdfFragments(data);
    return { budget: parseBudget(fragments, { catalog }), crops: [], ocrFields: [], handwriting: [] };
  } catch (error) {
    if (!(error instanceof BudgetReadError) || !error.message.includes("escaneado")) {
      throw error;
    }
  }
  const ocr = await readOcr(data);
  const budget = parseBudget(ocr.fragments, { catalog });
  budget.origin = "scan";
  markVerifiedRows(budget);
  const readable = budget.days.some((day) =>
    day.blocks.some((block) => block.sections.some((section) => section.items.length > 0)),
  );
  if (readable) {
    budget.structureErrors = budget.structureErrors.filter(
      (error) => error.section !== "tabla" && error.section !== "cabecera",
    );
  }
  return {
    budget,
    crops: ocr.crops,
    ocrFields: buildOcrReview(budget, ocr.fragments),
    handwriting: handwritingNotes(ocr.handwriting),
  };
}

export async function readBudgetPdf(data: Uint8Array, catalog: BudgetCatalog): Promise<ParsedBudget> {
  return (await readBudgetDocument(data, catalog)).budget;
}
