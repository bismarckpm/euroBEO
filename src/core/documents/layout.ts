import type { BeoTemplateData } from "./beo-template-data";
import { splitForPage } from "./page-fit";

export type RenderedBeo = {
  kind: "beo" | "systems";
  data: BeoTemplateData;
  docx: Buffer;
  pdf: Buffer;
  exceedsPage: boolean;
};

export type DocumentIo = {
  render: (data: BeoTemplateData) => Buffer;
  toPdf: (docx: Buffer) => Promise<Buffer>;
  pages: (pdf: Buffer) => Promise<number>;
};

/**
 * Genera la B.E.O. y, si pasa de una página y hay Sistemas,
 * la vuelve a emitir en dos documentos de una página.
 */
export async function layoutBeo(data: BeoTemplateData, io: DocumentIo): Promise<RenderedBeo[]> {
  const probe = io.render(data);
  const probePdf = await io.toPdf(probe);
  const probePages = await io.pages(probePdf);
  const pieces = splitForPage(data, probePages);
  const rendered: RenderedBeo[] = [];

  for (const [index, piece] of pieces.entries()) {
    const docx = pieces.length === 1 ? probe : io.render(piece);
    const pdf = pieces.length === 1 ? probePdf : await io.toPdf(docx);
    const pages = pieces.length === 1 ? probePages : await io.pages(pdf);
    rendered.push({
      kind: pieces.length > 1 && index === 1 ? "systems" : "beo",
      data: piece,
      docx,
      pdf,
      exceedsPage: pages > 1,
    });
  }

  return rendered;
}
