import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import { formatCents } from "../core/beo/format";
import {
  beoDownloadName,
  eventZipName,
  formatPreparationDate,
  toTemplateData,
  type BeoPrintSource,
  type BeoTemplateData,
} from "../core/documents/beo-template-data";
import { PdfConversionError, convertToPdf } from "../core/documents/convert-pdf";
import { countPages } from "../core/documents/count-pages";
import { layoutBeo, type RenderedBeo } from "../core/documents/layout";
import { planNumbers, repeatedNumbers, consecutiveBeoNumbers } from "../core/documents/numbers";
import { parseBeoNumber } from "../core/config/sequence";
import { renderDocx } from "../core/documents/render-docx";
import type { JsonValue } from "./audit";
import { recordAudit } from "./audit";
import { getFixedTexts } from "./catalog-db";
import { getPrisma } from "./db";
import { getEventReview, ReviewError, type ReviewBeo } from "./event-review";
import { peekNextNumber } from "./sequence-number";
import { BEO_SEQUENCE_KEY } from "./sequence-lock";
import { activeBeoTemplate } from "./template-store";
import { markMemosStale } from "./event-memos";
import { writePendingMemos } from "./memo-documents";

export type GeneratedFile = {
  id: string;
  fileName: string;
  number: string;
  exceedsPage: boolean;
  kind: string;
};

export type GenerationResult = {
  started: true;
  documents: number;
  files: GeneratedFile[];
};

export type GenerationOptions = {
  numbers?: string[];
  acknowledge?: boolean;
  toPdf?: (docx: Buffer) => Promise<Buffer>;
};

function fieldValue(beo: ReviewBeo, key: string): string {
  return beo.fields.find((field) => field.key === key)?.value ?? "";
}

function rentLabel(value: string): string {
  return /^-?\d+$/.test(value) ? formatCents(Number(value)) : value;
}

function reviewSource(
  title: string,
  beo: ReviewBeo,
  iniciales: string,
  preparedOn: string,
  number: string,
): BeoPrintSource {
  return {
    eventTitle: title,
    company: fieldValue(beo, "company"),
    contact: fieldValue(beo, "contact"),
    phone: fieldValue(beo, "phone"),
    address: fieldValue(beo, "address"),
    weekday: fieldValue(beo, "weekday"),
    formattedDate: fieldValue(beo, "formattedDate"),
    schedule: fieldValue(beo, "schedule"),
    eventType: fieldValue(beo, "eventType"),
    salonName: fieldValue(beo, "salonName"),
    guarantee: fieldValue(beo, "guarantee"),
    rent: rentLabel(fieldValue(beo, "rentCents")),
    billboard: fieldValue(beo, "billboard"),
    setup: fieldValue(beo, "setup"),
    specialInstructions: fieldValue(beo, "specialInstructions"),
    servicePreparation: fieldValue(beo, "servicePreparation"),
    iniciales,
    preparedOn,
    number,
    lines: beo.lines.map((line) => ({
      section: line.section,
      groupName: line.groupName,
      text: line.text,
    })),
  };
}

async function latestFiles(eventId: string): Promise<GeneratedFile[]> {
  const rows = await getPrisma().generatedDocument.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });
  const seen = new Set<string>();
  const files: GeneratedFile[] = [];
  for (const row of rows) {
    const key = row.memoId ? `memo:${row.memoId}` : `${row.beoId ?? row.id}:${row.kind}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    files.push({
      id: row.id,
      fileName: row.fileName,
      number: row.number,
      exceedsPage: row.exceedsPage,
      kind: row.kind,
    });
  }
  return files.sort((left, right) => left.number.localeCompare(right.number, "es"));
}

export async function listEventDocuments(eventId: string): Promise<{
  suggested: string[];
  files: GeneratedFile[];
}> {
  const review = await getEventReview(eventId);
  let suggested: string[] = [];
  try {
    const { last } = await peekNextNumber();
    suggested = consecutiveBeoNumbers(last, review.beos.length);
  } catch {
    suggested = [];
  }
  return { suggested, files: await latestFiles(eventId) };
}

export async function readGeneratedFile(
  eventId: string,
  documentId: string,
  format: "docx" | "pdf",
): Promise<{ bytes: Buffer; fileName: string; contentType: string }> {
  const row = await getPrisma().generatedDocument.findFirst({
    where: { id: documentId, eventId },
  });
  if (!row) {
    throw new ReviewError("No se encontró el documento.", 404);
  }
  const filePath = format === "pdf" ? row.pdfPath : row.docxPath;
  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch {
    throw new ReviewError("No se encontró el archivo.", 404);
  }
  const fileName = format === "pdf" ? row.fileName.replace(/\.docx$/i, ".pdf") : row.fileName;
  return {
    bytes,
    fileName,
    contentType:
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

export async function eventDocumentZip(eventId: string): Promise<{ bytes: Buffer; fileName: string }> {
  const review = await getEventReview(eventId);
  const files = await latestFiles(eventId);
  if (files.length === 0) {
    throw new ReviewError("Este evento todavía no tiene documentos.", 404);
  }
  const prisma = getPrisma();
  const zip = new PizZip();
  for (const file of files) {
    const row = await prisma.generatedDocument.findFirst({ where: { id: file.id, eventId } });
    if (!row) {
      continue;
    }
    const docx = await readFile(row.docxPath);
    const pdf = await readFile(row.pdfPath);
    zip.file(row.fileName, docx);
    zip.file(row.fileName.replace(/\.docx$/i, ".pdf"), pdf);
  }
  const generated = zip.generate({ type: "nodebuffer" });
  const bytes = Buffer.isBuffer(generated) ? generated : Buffer.from(generated);
  return { bytes, fileName: eventZipName(review.title) };
}

function jsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

/** Confirma el evento, asigna correlativos y escribe el .docx y el PDF de cada B.E.O. */
export async function generateEventDocuments(
  eventId: string,
  options: GenerationOptions = {},
): Promise<GenerationResult> {
  const review = await getEventReview(eventId);
  if (review.pendingCount > 0) {
    throw new ReviewError(`Faltan ${review.pendingCount} campos.`, 409);
  }
  const overrides = options.numbers ?? [];
  for (const value of overrides) {
    if (value.trim() && !parseBeoNumber(value)) {
      throw new ReviewError("El número debe tener la forma 0.NNN/AA.", 400);
    }
  }

  const texts = await getFixedTexts();
  const preparedOn = formatPreparationDate(new Date());
  const template = await activeBeoTemplate();
  const templateBytes = await readFile(template.filePath);
  const render = (data: BeoTemplateData) => renderDocx(templateBytes, data);
  const toPdf = options.toPdf ?? convertToPdf;

  const layouts: { beoId: string; parts: RenderedBeo[] }[] = [];
  try {
    for (const beo of review.beos) {
      const data = toTemplateData(reviewSource(review.title, beo, texts.footerInitials, preparedOn, "0.000/00"));
      const parts = await layoutBeo(data, { render, toPdf, pages: countPages });
      layouts.push({ beoId: beo.id, parts });
    }
  } catch (error) {
    if (error instanceof PdfConversionError) {
      throw new ReviewError(error.message, 500);
    }
    throw error;
  }

  const prisma = getPrisma();
  const previousBeoDocs = await prisma.generatedDocument.count({
    where: { eventId, beoId: { not: null } },
  });
  const assigned = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ lastNumber: number; year: number }[]>`
      SELECT "lastNumber", "year"
      FROM "Sequence"
      WHERE "key" = ${BEO_SEQUENCE_KEY}
      FOR UPDATE
    `;
    const current = rows[0];
    if (!current) {
      throw new ReviewError("No hay correlativo configurado.", 500);
    }
    const planned = planNumbers({
      last: current,
      parts: layouts.map((layout) => ({ id: layout.beoId, copies: layout.parts.length })),
      overrides,
    });
    const numbers = planned.documents.map((item) => item.number);
    const used = await tx.generatedDocument.findMany({
      where: { number: { in: numbers } },
      select: { number: true },
    });
    const repeated = repeatedNumbers(
      numbers,
      used.map((row) => row.number),
    );
    const duplicate = repeated[0];
    if (duplicate && !options.acknowledge) {
      throw new ReviewError(`El número ${duplicate} ya fue usado.`, 409);
    }
    const highest = planned.documents.reduce((max, item) => {
      const parsed = parseBeoNumber(item.number);
      return parsed && parsed.year === current.year ? Math.max(max, parsed.lastNumber) : max;
    }, current.lastNumber);
    if (highest !== current.lastNumber) {
      await tx.sequence.update({
        where: { key: BEO_SEQUENCE_KEY },
        data: { lastNumber: highest },
      });
    }
    return planned.documents;
  });

  const dir = path.join(process.cwd(), "data", "generated", eventId);
  await mkdir(dir, { recursive: true });
  const written: string[] = [];
  const files: GeneratedFile[] = [];

  try {
    for (const layout of layouts) {
      for (const [index, part] of layout.parts.entries()) {
        const number = assigned.find((item) => item.id === layout.beoId && item.copy === index)?.number;
        if (!number) {
          throw new ReviewError("No se pudo asignar el correlativo.", 500);
        }
        const data = { ...part.data, numero: number };
        const docx = render(data);
        const pdf = await toPdf(docx);
        const pages = await countPages(pdf);
        const id = randomUUID();
        const docxPath = path.join(dir, `${id}.docx`);
        const pdfPath = path.join(dir, `${id}.pdf`);
        await writeFile(docxPath, docx);
        await writeFile(pdfPath, pdf);
        written.push(docxPath, pdfPath);
        const fileName = beoDownloadName(number, review.title, "docx");
        const previous = await prisma.generatedDocument.count({
          where: { beoId: layout.beoId, kind: part.kind },
        });
        const saved = await prisma.generatedDocument.create({
          data: {
            id,
            eventId,
            beoId: layout.beoId,
            kind: part.kind,
            version: previous + 1,
            number,
            fileName,
            docxPath,
            pdfPath,
            sha256: createHash("sha256").update(docx).digest("hex"),
            exceedsPage: pages > 1,
            templateId: template.id,
          },
        });
        await prisma.beo.update({ where: { id: layout.beoId }, data: { status: "generated" } });
        files.push({
          id: saved.id,
          fileName,
          number,
          exceedsPage: pages > 1,
          kind: part.kind,
        });
      }
    }
    if (previousBeoDocs > 0) {
      await markMemosStale(eventId);
    }
    files.push(...(await writePendingMemos(eventId, review.title, toPdf)));
  } catch (error) {
    await Promise.all(written.map((file) => rm(file, { force: true })));
    if (error instanceof PdfConversionError) {
      throw new ReviewError(error.message, 500);
    }
    throw error;
  }

  await recordAudit({
    action: "event.generate",
    entity: "Event",
    entityId: eventId,
    after: jsonValue({ documents: files.map((file) => file.number) }),
  });

  return { started: true, documents: files.length, files };
}
