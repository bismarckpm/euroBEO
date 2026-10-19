import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { countPages } from "../core/documents/count-pages";
import { PdfConversionError, convertToPdf } from "../core/documents/convert-pdf";
import { fillDocx } from "../core/documents/render-docx";
import { memoDownloadName, memoTemplateDataSchema } from "../core/memo/template-data";
import { getPrisma } from "./db";
import { refreshMemoFromBeos, MemoFlowError } from "./event-memos";
import { ReviewError } from "./event-review";

export type MemoFile = {
  id: string;
  fileName: string;
  number: string;
  exceedsPage: boolean;
  kind: string;
};

async function templateFor(templateFile: string): Promise<{ id: string; bytes: Buffer }> {
  const preferred = path.resolve(process.cwd(), templateFile);
  const bundled = path.join(process.cwd(), "templates", "memo-estacionamiento.docx");
  let filePath = bundled;
  try {
    await access(preferred);
    filePath = preferred;
  } catch {
    try {
      await access(bundled);
    } catch {
      throw new ReviewError("No está la plantilla del memorándum.", 500);
    }
  }
  const bytes = await readFile(filePath);
  const prisma = getPrisma();
  const type = `memo:${path.basename(filePath)}`;
  const current = await prisma.template.findFirst({
    where: { type, active: true },
    orderBy: { version: "desc" },
  });
  if (current) {
    return { id: current.id, bytes };
  }
  const latest = await prisma.template.findFirst({
    where: { type },
    orderBy: { version: "desc" },
  });
  const created = await prisma.template.create({
    data: { type, version: (latest?.version ?? 0) + 1, filePath, active: true },
  });
  return { id: created.id, bytes };
}

function fieldValue(fields: { key: string; value: string | null }[], key: string): string {
  return fields.find((field) => field.key === key)?.value ?? "";
}

async function writeMemoFile(input: {
  eventId: string;
  eventTitle: string;
  memoId: string;
  version: number;
  templateFile: string;
  fields: { key: string; value: string | null }[];
  toPdf: (docx: Buffer) => Promise<Buffer>;
}): Promise<MemoFile> {
  const data = memoTemplateDataSchema.parse({
    numero: fieldValue(input.fields, "numero"),
    fecha: fieldValue(input.fields, "fecha"),
    para: fieldValue(input.fields, "para"),
    empresa: fieldValue(input.fields, "empresa"),
    de: fieldValue(input.fields, "de"),
    cargo: fieldValue(input.fields, "cargo"),
    referencia: fieldValue(input.fields, "referencia"),
    cuerpo: fieldValue(input.fields, "cuerpo"),
  });
  const template = await templateFor(input.templateFile);
  const docx = fillDocx(template.bytes, data);
  let pdf: Buffer;
  try {
    pdf = await input.toPdf(docx);
  } catch (error) {
    if (error instanceof PdfConversionError) {
      throw new ReviewError(error.message, 500);
    }
    throw error;
  }
  const pages = await countPages(pdf);
  const id = randomUUID();
  const dir = path.join(process.cwd(), "data", "generated", input.eventId);
  await mkdir(dir, { recursive: true });
  const docxPath = path.join(dir, `${id}.docx`);
  const pdfPath = path.join(dir, `${id}.pdf`);
  await writeFile(docxPath, docx);
  await writeFile(pdfPath, pdf);
  const fileName = memoDownloadName(data.numero, input.eventTitle, "docx");
  const saved = await getPrisma().generatedDocument.create({
    data: {
      id,
      eventId: input.eventId,
      memoId: input.memoId,
      kind: "memo",
      version: input.version,
      number: data.numero,
      fileName,
      docxPath,
      pdfPath,
      sha256: createHash("sha256").update(docx).digest("hex"),
      exceedsPage: pages > 1,
      templateId: template.id,
    },
  });
  await getPrisma().memo.update({
    where: { id: input.memoId },
    data: { status: "generated", stale: false, version: input.version },
  });
  return {
    id: saved.id,
    fileName,
    number: data.numero,
    exceedsPage: pages > 1,
    kind: "memo",
  };
}

/** Escribe los memorándums que todavía no tienen archivo. */
export async function writePendingMemos(
  eventId: string,
  eventTitle: string,
  toPdf: (docx: Buffer) => Promise<Buffer>,
): Promise<MemoFile[]> {
  const memos = await getPrisma().memo.findMany({
    where: { eventId, documents: { none: {} } },
    include: { fields: true, memoType: true },
  });
  const files: MemoFile[] = [];
  for (const memo of memos) {
    files.push(
      await writeMemoFile({
        eventId,
        eventTitle,
        memoId: memo.id,
        version: 1,
        templateFile: memo.memoType.templateFile,
        fields: memo.fields,
        toPdf,
      }),
    );
  }
  return files;
}

/** Nueva versión del memorándum con los salones y días de las B.E.O. vigentes. */
export async function regenerateEventMemo(
  eventId: string,
  memoId: string,
  toPdf: (docx: Buffer) => Promise<Buffer> = convertToPdf,
): Promise<MemoFile> {
  try {
    const memo = await refreshMemoFromBeos(eventId, memoId);
    const event = await getPrisma().event.findUnique({ where: { id: eventId }, select: { title: true } });
    return await writeMemoFile({
      eventId,
      eventTitle: event?.title ?? "",
      memoId: memo.id,
      version: memo.version + 1,
      templateFile: memo.memoType.templateFile,
      fields: memo.fields,
      toPdf,
    });
  } catch (error) {
    if (error instanceof MemoFlowError) {
      throw new ReviewError(error.message, error.status);
    }
    throw error;
  }
}
