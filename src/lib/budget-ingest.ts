import { parseBudget, type BudgetCatalog } from "../core/budget/parse-budget";
import { extractPdfFragments } from "./pdf-text";

export async function readBudgetPdf(data: Uint8Array, catalog: BudgetCatalog) {
  const fragments = await extractPdfFragments(data);
  return parseBudget(fragments, { catalog });
}
