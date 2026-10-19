import { PDFDocument } from "pdf-lib";

export async function countPages(pdf: Buffer): Promise<number> {
  const document = await PDFDocument.load(pdf);
  return document.getPageCount();
}
