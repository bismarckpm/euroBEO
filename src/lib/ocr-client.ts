import { z } from "zod";
import { fragmentsFromOcr, type OcrReading } from "../core/budget/ocr-source";
import { BudgetReadError } from "./pdf-text";

const payloadSchema = z.object({
  pages: z.array(
    z.object({
      page: z.number().int(),
      widthPt: z.number(),
      heightPt: z.number(),
      fragments: z.array(
        z.object({
          text: z.string(),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          confidence: z.number(),
          kind: z.enum(["cell", "line", "header"]),
          crop: z.string(),
        }),
      ),
    }),
  ),
  handwriting: z.array(
    z.object({
      page: z.number().int(),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      crop: z.string(),
    }),
  ),
});

export class OcrUnavailableError extends BudgetReadError {
  constructor() {
    super("El escaneo no se puede procesar en este momento. Los PDF digitales siguen disponibles.");
    this.name = "OcrUnavailableError";
  }
}

function ocrUrl(): string {
  return (process.env.OCR_URL ?? "http://ocr:8000").replace(/\/$/, "");
}

/** Pide la lectura al servicio local. No envía el PDF fuera de la red interna. */
export async function readOcr(data: Uint8Array): Promise<OcrReading> {
  const body = new FormData();
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  body.set("file", new Blob([copy], { type: "application/pdf" }), "presupuesto.pdf");
  let response: Response;
  try {
    response = await fetch(`${ocrUrl()}/ocr`, { method: "POST", body });
  } catch {
    throw new OcrUnavailableError();
  }
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      json && typeof json === "object" && "message" in json && typeof json.message === "string"
        ? json.message
        : "No se pudo leer el escaneo.";
    if (response.status >= 500) {
      throw new OcrUnavailableError();
    }
    throw new BudgetReadError(message);
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    throw new BudgetReadError("La respuesta del OCR no tiene el formato esperado.");
  }
  return fragmentsFromOcr(parsed.data);
}
