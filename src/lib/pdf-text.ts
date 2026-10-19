import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextFragment } from "../core/budget/fragments";

export class BudgetReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetReadError";
  }
}

/** Lee la capa de texto del PDF. Rechaza un PDF sin texto. */
export async function extractPdfFragments(data: Uint8Array): Promise<TextFragment[]> {
  let doc: Awaited<ReturnType<typeof getDocument>["promise"]>;
  try {
    doc = await getDocument({ data, verbosity: 0 }).promise;
  } catch {
    throw new BudgetReadError("El archivo no es un PDF válido.");
  }

  const fragments: TextFragment[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) {
        continue;
      }
      fragments.push({
        text: item.str,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        width: item.width,
        page: pageNumber,
      });
    }
  }

  if (!fragments.some((fragment) => /\p{L}/u.test(fragment.text))) {
    throw new BudgetReadError("El PDF debe ser digital y no escaneado.");
  }
  return fragments;
}
