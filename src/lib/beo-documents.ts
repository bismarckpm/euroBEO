import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import PizZip from "pizzip";
import { formatCents } from "../core/beo/format";
import type { BeoSettings } from "../core/beo/presentation";
import { validatePrintable } from "../core/documents/validate-beo";
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
import { planNumbers, repeatedNumbers, nextFreeNumbers } from "../core/documents/numbers";
import { documentSnapshot } from "../core/history/compare";
import { parseBeoNumber } from "../core/config/sequence";
import { renderDocx } from "../core/documents/render-docx";
import type { JsonValue } from "./audit";
import { recordAudit } from "./audit";
import { getBeoSettings, getFixedTexts } from "./catalog-db";
import { getPrisma } from "./db";
import { getEventReview, ReviewError, type ReviewBeo } from "./event-review";
import { peekNextNumber } from "./sequence-number";
import { BEO_SEQUENCE_KEY } from "./sequence-lock";
import { activeBeoTemplate } from "./template-store";
import { markMemosStale } from "./event-memos";
import { regenerateEventMemo, writePendingMemos } from "./memo-documents";
import {
  currentDriveMessage,
  publishGeneratedDocuments,
  type PublicDriveState,
  type UploadOptions,
} from "./drive-archive";

export type GeneratedFile = {
  id: string;
  fileName: string;
  number: string;
  exceedsPage: boolean;
  kind: string;
  driveStatus: string;
  driveUrl: string | null;
  version: number;
  createdAt: string;
  beoId: string | null;
  voided: boolean;
  earlier: { id: string; version: number; createdAt: string }[];
};

export type GenerationResult = {
  started: true;
  documents: number;
  files: GeneratedFile[];
  driveMessage: string | null;
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
  settings: BeoSettings,
): BeoPrintSource {
  const guarantee = fieldValue(beo, "guarantee");
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
    guarantee,
    rent: rentLabel(fieldValue(beo, "rentCents")),
    billboard: fieldValue(beo, "billboard"),
    setup: fieldValue(beo, "setup"),
    specialInstructions: fieldValue(beo, "specialInstructions"),
    servicePreparation: fieldValue(beo, "servicePreparation"),
    iniciales,
    preparedOn,
    number,
    settings,
    blockPax: /^\d+$/.test(guarantee) ? Number(guarantee) : null,
    lines: beo.lines.map((line) => ({
      section: line.section,
      groupName: line.groupName,
      text: line.text,
      description: line.description,
      qty: line.qty,
      unitPriceCents: line.unitPriceCents,
    })),
  };
}

function formatStoredDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function snapshotOf(beo: ReviewBeo): Prisma.InputJsonValue {
  return documentSnapshot({ fields: beo.fields, lines: beo.lines });
}

async function latestFiles(eventId: string): Promise<GeneratedFile[]> {
  const rows = await getPrisma().generatedDocument.findMany({
    where: { eventId },
    orderBy: { version: "desc" },
    include: { beo: { select: { status: true } } },
  });
  const seen = new Set<string>();
  const files: GeneratedFile[] = [];
  for (const row of rows) {
    const key = row.memoId ? `memo:${row.memoId}` : `${row.beoId ?? row.id}:${row.kind}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const earlier = rows
      .filter((item) => {
        const itemKey = item.memoId
          ? `memo:${item.memoId}`
          : `${item.beoId ?? item.id}:${item.kind}`;
        return itemKey === key && item.id !== row.id;
      })
      .map((item) => ({
        id: item.id,
        version: item.version,
        createdAt: formatStoredDate(item.createdAt),
      }));
    files.push({
      id: row.id,
      fileName: row.fileName,
      number: row.number,
      exceedsPage: row.exceedsPage,
      kind: row.kind,
      driveStatus: row.driveStatus,
      driveUrl: row.driveUrl,
      version: row.version,
      createdAt: formatStoredDate(row.createdAt),
      beoId: row.beoId,
      voided: row.beo?.status === "voided",
      earlier,
    });
  }
  return files.sort((left, right) => left.number.localeCompare(right.number, "es"));
}

export async function listEventDocuments(eventId: string): Promise<{
  suggested: string[];
  files: GeneratedFile[];
  driveMessage: string | null;
}> {
  const review = await getEventReview(eventId);
  let suggested: string[] = [];
  try {
    const { last } = await peekNextNumber();
    const used = await getPrisma().generatedDocument.findMany({ select: { number: true } });
    const active = review.beos.filter((beo) => beo.status !== "voided").length;
    suggested = nextFreeNumbers(
      last,
      Math.max(active, 1),
      used.map((row) => row.number),
    );
  } catch {
    suggested = [];
  }
  return { suggested, files: await latestFiles(eventId), driveMessage: currentDriveMessage() };
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

export async function eventDocumentZip(
  eventId: string,
): Promise<{ bytes: Buffer; fileName: string }> {
  const review = await getEventReview(eventId);
  const files = (await latestFiles(eventId)).filter((file) => !file.voided);
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
  if (review.issues.length > 0) {
    throw new ReviewError(review.issues.map((issue) => issue.message).join(" "), 409);
  }
  const overrides = options.numbers ?? [];
  for (const value of overrides) {
    if (value.trim() && !parseBeoNumber(value)) {
      throw new ReviewError("El número debe tener la forma 0.NNN/AA.", 400);
    }
  }

  const texts = await getFixedTexts();
  const settings = await getBeoSettings();
  const preparedOn = formatPreparationDate(new Date());
  const template = await activeBeoTemplate();
  const templateBytes = await readFile(template.filePath);
  const render = (data: BeoTemplateData) => renderDocx(templateBytes, data);
  const toPdf = options.toPdf ?? convertToPdf;

  const layouts: { beoId: string; parts: RenderedBeo[] }[] = [];
  try {
    for (const beo of review.beos) {
      if (beo.status === "voided") {
        continue;
      }
      const data = toTemplateData(
        reviewSource(review.title, beo, texts.footerInitials, preparedOn, "0.000/00", settings),
      );
      const printable = validatePrintable(`${beo.salon} ${beo.date}`, data);
      if (printable.length > 0) {
        throw new ReviewError(printable.map((issue) => issue.message).join(" "), 409);
      }
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
    const voided = await tx.generatedDocument.findFirst({
      where: { number: { in: numbers }, beo: { status: "voided" } },
      select: { number: true },
    });
    if (voided) {
      throw new ReviewError(`El número ${voided.number} está anulado.`, 409);
    }
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
        const number = assigned.find(
          (item) => item.id === layout.beoId && item.copy === index,
        )?.number;
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
            snapshot: snapshotOf(
              review.beos.find((beo) => beo.id === layout.beoId) ?? {
                id: layout.beoId,
                date: "",
                salon: "",
                kind: "",
                needsReview: false,
                pendingCount: 0,
                status: "generated",
                version: previous + 1,
                fields: [],
                lines: [],
              },
            ),
          },
        });
        await prisma.beo.update({
          where: { id: layout.beoId },
          data: { status: "generated", version: previous + 1 },
        });
        files.push({
          id: saved.id,
          fileName,
          number,
          exceedsPage: pages > 1,
          kind: part.kind,
          driveStatus: "pendiente",
          driveUrl: null,
          version: previous + 1,
          createdAt: formatStoredDate(saved.createdAt),
          beoId: layout.beoId,
          voided: false,
          earlier: [],
        });
      }
    }
    if (previousBeoDocs > 0) {
      await markMemosStale(eventId);
    }
    files.push(
      ...(await writePendingMemos(eventId, review.title, toPdf)).map((file) => ({
        ...file,
        driveStatus: "pendiente" as const,
        driveUrl: null,
      })),
    );
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

  let publication: { message: string | null; byId: Record<string, PublicDriveState> } = {
    message: null,
    byId: {},
  };
  try {
    publication = await publishGeneratedDocuments(files.map((file) => file.id));
  } catch {
    publication = {
      message: "No se pudo subir los documentos a Drive.",
      byId: Object.fromEntries(
        files.map((file) => [file.id, { driveStatus: "error", driveUrl: null }]),
      ),
    };
  }
  const published = files.map((file) => ({
    ...file,
    ...(publication.byId[file.id] ?? { driveStatus: "pendiente", driveUrl: null }),
  }));

  return {
    started: true,
    documents: published.length,
    files: published,
    driveMessage: publication.message,
  };
}

/** Regenera las B.E.O. y memorándums elegidos, conservando el número y subiendo otra versión. */
export async function regenerateSelectedDocuments(
  eventId: string,
  options: GenerationOptions & {
    beoIds?: string[];
    memoIds?: string[];
    archive?: UploadOptions;
  } = {},
): Promise<GenerationResult> {
  const beoIds = options.beoIds ?? [];
  const memoIds = options.memoIds ?? [];
  if (beoIds.length === 0 && memoIds.length === 0) {
    throw new ReviewError("Selecciona al menos un documento.", 400);
  }
  const review = await getEventReview(eventId);
  const selected = review.beos.filter((beo) => beoIds.includes(beo.id));
  if (selected.length !== beoIds.length) {
    throw new ReviewError("No se encontró la B.E.O.", 404);
  }
  if (selected.some((beo) => beo.status !== "generated")) {
    throw new ReviewError("Solo se puede regenerar una B.E.O. ya generada.", 409);
  }
  const pending = selected.reduce((sum, beo) => sum + beo.pendingCount, 0);
  if (pending > 0) {
    throw new ReviewError(`Faltan ${pending} campos.`, 409);
  }

  const texts = await getFixedTexts();
  const settings = await getBeoSettings();
  const preparedOn = formatPreparationDate(new Date());
  const template = await activeBeoTemplate();
  const templateBytes = await readFile(template.filePath);
  const render = (data: BeoTemplateData) => renderDocx(templateBytes, data);
  const toPdf = options.toPdf ?? convertToPdf;
  const prisma = getPrisma();
  const dir = path.join(process.cwd(), "data", "generated", eventId);
  await mkdir(dir, { recursive: true });
  const written: string[] = [];
  const files: GeneratedFile[] = [];

  try {
    for (const beo of selected) {
      const blocked = review.issues.filter((issue) => issue.beo === `${beo.salon} ${beo.date}`);
      if (blocked.length > 0) {
        throw new ReviewError(blocked.map((issue) => issue.message).join(" "), 409);
      }
      const parts = await layoutBeo(
        toTemplateData(
          reviewSource(review.title, beo, texts.footerInitials, preparedOn, "0.000/00", settings),
        ),
        { render, toPdf, pages: countPages },
      );
      const previousRows = await prisma.generatedDocument.findMany({
        where: { beoId: beo.id },
        orderBy: { version: "desc" },
      });
      const numberByKind = new Map<string, string>();
      for (const row of previousRows) {
        if (!numberByKind.has(row.kind)) {
          numberByKind.set(row.kind, row.number);
        }
      }
      for (const part of parts) {
        const number = numberByKind.get(part.kind);
        if (!number) {
          throw new ReviewError("No hay un número para regenerar.", 409);
        }
        const docx = render({ ...part.data, numero: number });
        const pdf = await toPdf(docx);
        const pages = await countPages(pdf);
        const id = randomUUID();
        const docxPath = path.join(dir, `${id}.docx`);
        const pdfPath = path.join(dir, `${id}.pdf`);
        await writeFile(docxPath, docx);
        await writeFile(pdfPath, pdf);
        written.push(docxPath, pdfPath);
        const fileName = beoDownloadName(number, review.title, "docx");
        const previous = previousRows.filter((row) => row.kind === part.kind).length;
        const saved = await prisma.generatedDocument.create({
          data: {
            id,
            eventId,
            beoId: beo.id,
            kind: part.kind,
            version: previous + 1,
            number,
            fileName,
            docxPath,
            pdfPath,
            sha256: createHash("sha256").update(docx).digest("hex"),
            exceedsPage: pages > 1,
            templateId: template.id,
            snapshot: snapshotOf(beo),
          },
        });
        await prisma.beo.update({
          where: { id: beo.id },
          data: { status: "generated", version: previous + 1 },
        });
        files.push({
          id: saved.id,
          fileName,
          number,
          exceedsPage: pages > 1,
          kind: part.kind,
          driveStatus: "pendiente",
          driveUrl: null,
          version: previous + 1,
          createdAt: formatStoredDate(saved.createdAt),
          beoId: beo.id,
          voided: false,
          earlier: [],
        });
      }
    }
    if (selected.length > 0) {
      await markMemosStale(eventId);
    }
    for (const memoId of memoIds) {
      const memo = await regenerateEventMemo(eventId, memoId, toPdf);
      files.push({ ...memo, driveStatus: "pendiente", driveUrl: null });
    }
  } catch (error) {
    await Promise.all(written.map((file) => rm(file, { force: true })));
    if (error instanceof PdfConversionError) {
      throw new ReviewError(error.message, 500);
    }
    throw error;
  }

  await recordAudit({
    action: "event.regenerate",
    entity: "Event",
    entityId: eventId,
    after: jsonValue({ documents: files.map((file) => file.number) }),
  });

  let publication: { message: string | null; byId: Record<string, PublicDriveState> } = {
    message: null,
    byId: {},
  };
  try {
    publication = await publishGeneratedDocuments(
      files.map((file) => file.id),
      options.archive,
    );
  } catch {
    publication = {
      message: "No se pudo subir los documentos a Drive.",
      byId: Object.fromEntries(
        files.map((file) => [file.id, { driveStatus: "error", driveUrl: null }]),
      ),
    };
  }
  const published = files.map((file) => ({
    ...file,
    ...(publication.byId[file.id] ?? { driveStatus: "pendiente", driveUrl: null }),
  }));
  return {
    started: true,
    documents: published.length,
    files: published,
    driveMessage: publication.message,
  };
}
