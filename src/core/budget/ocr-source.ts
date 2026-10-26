import type { TextFragment } from "./fragments";

export type OcrFragmentDto = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  kind: "cell" | "line" | "header";
  crop: string;
};

export type OcrHandwritingDto = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  crop: string;
};

export type OcrPayload = {
  pages: {
    page: number;
    widthPt: number;
    heightPt: number;
    fragments: OcrFragmentDto[];
  }[];
  handwriting: OcrHandwritingDto[];
};

export type OcrCrop = {
  id: string;
  pngBase64: string;
};

export type OcrReading = {
  fragments: TextFragment[];
  crops: OcrCrop[];
  handwriting: { cropId: string; page: number }[];
};

/** Adapta la respuesta del servicio al mismo fragmento que devuelve pdfjs. */
export function fragmentsFromOcr(payload: OcrPayload): OcrReading {
  const fragments: TextFragment[] = [];
  const crops: OcrCrop[] = [];
  payload.pages.forEach((page) => {
    page.fragments.forEach((fragment, index) => {
      const text = fragment.text.replace(/\s+/g, " ").trim();
      if (!text) {
        return;
      }
      const cropId = `p${page.page}-f${index}`;
      if (fragment.crop) {
        crops.push({ id: cropId, pngBase64: fragment.crop });
      }
      fragments.push({
        text,
        x: fragment.x,
        y: fragment.y,
        width: fragment.width,
        height: fragment.height,
        page: page.page,
        confidence: fragment.confidence,
        kind: fragment.kind,
        cropId,
      });
    });
  });
  const handwriting = payload.handwriting.map((note, index) => {
    const cropId = `h${note.page}-${index}`;
    if (note.crop) {
      crops.push({ id: cropId, pngBase64: note.crop });
    }
    return { cropId, page: note.page };
  });
  return { fragments, crops, handwriting };
}
