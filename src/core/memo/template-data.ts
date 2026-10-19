import { z } from "zod";

export const memoTemplateDataSchema = z.object({
  numero: z.string(),
  fecha: z.string(),
  para: z.string(),
  empresa: z.string(),
  de: z.string(),
  cargo: z.string(),
  referencia: z.string(),
  cuerpo: z.string(),
});

export type MemoTemplateData = z.infer<typeof memoTemplateDataSchema>;

/** Marcadores que toda plantilla de memorándum debe contener. */
export const MEMO_MARKERS = [
  "{numero}",
  "{fecha}",
  "{para}",
  "{empresa}",
  "{de}",
  "{cargo}",
  "{referencia}",
  "{cuerpo}",
] as const;

export function missingMemoMarkers(documentXml: string): string[] {
  return MEMO_MARKERS.filter((marker) => !documentXml.includes(marker));
}

function safeFilePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** `89 GRAN ENCUENTRO.docx`, el mismo patrón que los archivos del hotel. */
export function memoDownloadName(number: string, eventName: string, extension: "docx" | "pdf"): string {
  const label = safeFilePart(number) || "memo";
  const title = safeFilePart(eventName).toUpperCase();
  return `${label} ${title}.${extension}`.replace(/\s+/g, " ");
}
