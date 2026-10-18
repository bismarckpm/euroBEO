import type { DriveClient } from "./client";
import { DOCX_MIME, PDF_MIME, driveYear, nextVersionedName } from "./names";

const DEFAULT_DELAYS_MS = [1_000, 2_000];
const DEFAULT_ATTEMPTS = 3;

export class DriveArchiveError extends Error {
  readonly attempts: number;

  constructor(attempts: number) {
    super("No se pudo subir el documento a Drive.");
    this.name = "DriveArchiveError";
    this.attempts = attempts;
  }
}

export type ArchiveInput = {
  client: DriveClient;
  rootFolderId: string;
  now: Date;
  fileName: string;
  docx: Buffer;
  pdf?: Buffer | null;
  uploadPdf: boolean;
  wait?: (milliseconds: number) => Promise<void>;
  delaysMs?: number[];
  maxAttempts?: number;
};

export type ArchiveResult = {
  status: "subido";
  attempts: number;
  folderId: string;
  name: string;
  fileId: string;
  url: string;
};

export function driveRecord(
  currentAttempts: number,
  outcome: { ok: true; attempts: number; url: string } | { ok: false; attempts: number },
): { driveStatus: "subido" | "error"; driveUrl: string | null; driveAttempts: number } {
  const driveAttempts = currentAttempts + outcome.attempts;
  if (outcome.ok) {
    return { driveStatus: "subido", driveUrl: outcome.url, driveAttempts };
  }
  return { driveStatus: "error", driveUrl: null, driveAttempts };
}

async function ensureYearFolder(client: DriveClient, rootFolderId: string, year: string) {
  const existing = await client.findFolder(rootFolderId, year);
  if (existing) {
    return existing;
  }
  return client.createFolder(rootFolderId, year);
}

/** Sube el .docx (y el PDF si está activado) a la carpeta del año, reintentando con espera creciente. */
export async function archiveDocument(input: ArchiveInput): Promise<ArchiveResult> {
  const wait =
    input.wait ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const delays = input.delaysMs ?? DEFAULT_DELAYS_MS;
  const maxAttempts = input.maxAttempts ?? DEFAULT_ATTEMPTS;
  const year = driveYear(input.now);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const folder = await ensureYearFolder(input.client, input.rootFolderId, year);
      const names = await input.client.listNames(folder.id);
      const docxName = nextVersionedName(names, input.fileName);
      const uploaded = await input.client.upload({
        folderId: folder.id,
        name: docxName,
        mimeType: DOCX_MIME,
        body: input.docx,
      });
      if (!uploaded.id) {
        throw new Error("Drive no devolvió el archivo.");
      }
      if (input.uploadPdf && input.pdf) {
        const pdfName = docxName.replace(/\.docx$/i, ".pdf");
        await input.client.upload({
          folderId: folder.id,
          name: pdfName,
          mimeType: PDF_MIME,
          body: input.pdf,
        });
      }
      return {
        status: "subido",
        attempts: attempt,
        folderId: folder.id,
        name: docxName,
        fileId: uploaded.id,
        url: uploaded.webViewLink ?? `https://drive.google.com/file/d/${uploaded.id}/view`,
      };
    } catch {
      if (attempt < maxAttempts) {
        await wait(delays[attempt - 1] ?? delays[delays.length - 1] ?? DEFAULT_DELAYS_MS[0]);
      }
    }
  }

  throw new DriveArchiveError(maxAttempts);
}
