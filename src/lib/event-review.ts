import { formatCents, personnelLine } from "../core/beo/format";
import { recordAudit, type JsonValue } from "./audit";
import { createBeoProposal } from "./beo-store";
import { listMemos } from "./catalog-db";
import { getPrisma } from "./db";
import {
  addEventMemo,
  MemoFlowError,
  syncEventMemos,
  updateMemoField,
  validateMemoField,
  type EventMemo,
} from "./event-memos";
import { NormalizationInputError, saveLearnedNormalization } from "./normalization";

const OPEN_STATUS = new Set(["PENDING", "AI", "REVIEW"]);
const SHARED_KEYS = ["billboard", "company", "contact", "phone"] as const;
const KIND_ORDER: Record<string, number> = { MONTAJE: 0, EVENTO: 1, DESMONTAJE: 2 };

export class ReviewError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReviewError";
    this.status = status;
  }
}

export type ReviewField = {
  id: string;
  key: string;
  value: string | null;
  status: string;
  source: string;
};

export type ReviewLine = {
  id: string;
  section: string;
  groupName: string;
  qty: number;
  description: string;
  unitPriceCents: number | null;
  text: string;
  status: string;
  source: string;
};

export type ReviewBeo = {
  id: string;
  date: string;
  salon: string;
  kind: string;
  needsReview: boolean;
  status: string;
  version: number;
  pendingCount: number;
  fields: ReviewField[];
  lines: ReviewLine[];
};

export type ReviewMemo = EventMemo;

export type EventReview = {
  eventId: string;
  title: string;
  pendingCount: number;
  shared: Record<(typeof SHARED_KEYS)[number], string | null>;
  beos: ReviewBeo[];
  memos: ReviewMemo[];
  memoTypes: { id: string; name: string }[];
};

function isOpen(status: string): boolean {
  return OPEN_STATUS.has(status);
}

function pendingOf(fields: { status: string }[], lines: { status: string }[]): number {
  return (
    fields.filter((field) => isOpen(field.status)).length +
    lines.filter((line) => isOpen(line.status)).length
  );
}

function jsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function parseAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") {
    return null;
  }
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    throw new ReviewError("El monto no es válido.", 400);
  }
  return Math.round(amount * 100);
}

function lineText(
  section: string,
  qty: number,
  description: string,
  unitPriceCents: number | null,
): string {
  if (section === "ALIMENTOS") {
    const price = unitPriceCents === null ? "—" : formatCents(unitPriceCents);
    return `${description}\nN° pax: ${qty}\nPRECIO: USD ${price} c/u x ${qty} pax`;
  }
  return personnelLine(qty, description, unitPriceCents);
}

async function loadEvent(eventId: string) {
  const event = await getPrisma().event.findUnique({
    where: { id: eventId },
    include: {
      budgets: {
        orderBy: { version: "desc" },
        take: 1,
        include: { benefits: { orderBy: { position: "asc" } } },
      },
      beos: {
        include: {
          fields: { orderBy: { key: "asc" } },
          lines: { orderBy: { position: "asc" } },
        },
      },
    },
  });
  if (!event) {
    throw new ReviewError("No se encontró el evento.", 404);
  }
  return event;
}

function toReview(
  event: Awaited<ReturnType<typeof loadEvent>>,
  memos: ReviewMemo[],
  memoTypes: { id: string; name: string }[],
): EventReview {
  const beos = [...event.beos]
    .sort((left, right) => {
      const byDate = left.date.localeCompare(right.date);
      if (byDate !== 0) return byDate;
      const bySalon = left.salon.localeCompare(right.salon, "es");
      if (bySalon !== 0) return bySalon;
      return (KIND_ORDER[left.kind] ?? 9) - (KIND_ORDER[right.kind] ?? 9);
    })
    .map((beo) => ({
      id: beo.id,
      date: beo.date,
      salon: beo.salon,
      kind: beo.kind,
      needsReview: beo.needsReview,
      status: beo.status,
      version: beo.version,
      pendingCount: pendingOf(beo.fields, beo.lines),
      fields: beo.fields.map((field) => ({
        id: field.id,
        key: field.key,
        value: field.value,
        status: field.status,
        source: field.source,
      })),
      lines: beo.lines.map((line) => ({
        id: line.id,
        section: line.section,
        groupName: line.groupName,
        qty: line.qty,
        description: line.description,
        unitPriceCents: line.unitPriceCents,
        text: line.text,
        status: line.status,
        source: line.source,
      })),
    }));

  const shared = {} as EventReview["shared"];
  for (const key of SHARED_KEYS) {
    const field = beos
      .flatMap((beo) => beo.fields)
      .find((item) => item.key === key && item.source !== "beo.override");
    shared[key] =
      field?.value ??
      beos.flatMap((beo) => beo.fields).find((item) => item.key === key)?.value ??
      null;
  }

  return {
    eventId: event.id,
    title: event.title,
    pendingCount:
      beos
        .filter((beo) => beo.status !== "voided")
        .reduce((sum, beo) => sum + beo.pendingCount, 0) +
      memos.reduce((sum, memo) => sum + memo.pendingCount, 0),
    shared,
    beos,
    memos,
    memoTypes,
  };
}

function asReviewError(error: unknown): never {
  if (error instanceof MemoFlowError) {
    throw new ReviewError(error.message, error.status);
  }
  throw error;
}

export async function addMemoToEvent(eventId: string, memoTypeId: string): Promise<EventReview> {
  try {
    await addEventMemo(eventId, memoTypeId);
  } catch (error) {
    asReviewError(error);
  }
  return getEventReview(eventId);
}

export async function editMemoField(
  eventId: string,
  memoId: string,
  key: string,
  value: string,
): Promise<EventReview> {
  try {
    await updateMemoField(eventId, memoId, key, value);
  } catch (error) {
    asReviewError(error);
  }
  const review = await getEventReview(eventId);
  await recordAudit({
    action: "memo.field.update",
    entity: "MemoField",
    entityId: memoId,
    after: jsonValue({ key, value }),
  });
  return review;
}

export async function confirmMemoField(
  eventId: string,
  memoId: string,
  key: string,
): Promise<EventReview> {
  try {
    await validateMemoField(eventId, memoId, key);
  } catch (error) {
    asReviewError(error);
  }
  return getEventReview(eventId);
}

/** Genera otra versión del memorándum cuando una B.E.O. lo dejó desactualizado. */
export async function regenerateMemo(
  eventId: string,
  memoId: string,
  toPdf?: (docx: Buffer) => Promise<Buffer>,
): Promise<
  EventReview & {
    files: {
      id: string;
      fileName: string;
      number: string;
      exceedsPage: boolean;
      kind: string;
      driveStatus: string;
      driveUrl: string | null;
    }[];
    driveMessage: string | null;
  }
> {
  const { regenerateEventMemo } = await import("./memo-documents");
  const { listEventDocuments } = await import("./beo-documents");
  const { publishGeneratedDocuments } = await import("./drive-archive");
  let writtenId: string | null = null;
  try {
    writtenId = (await regenerateEventMemo(eventId, memoId, toPdf)).id;
    await publishGeneratedDocuments([writtenId]);
  } catch (error) {
    if (!writtenId) {
      asReviewError(error);
    }
  }
  const review = await getEventReview(eventId);
  const listed = await listEventDocuments(eventId);
  return { ...review, files: listed.files, driveMessage: listed.driveMessage };
}
export async function getEventReview(eventId: string): Promise<EventReview> {
  const event = await loadEvent(eventId);
  if (event.beos.length === 0) {
    if (event.budgets.length === 0) {
      throw new ReviewError("No hay un presupuesto para este evento.", 404);
    }
    await createBeoProposal(eventId);
    return getEventReview(eventId);
  }
  const memoTypes = (await listMemos()).map((memo) => ({ id: memo.id, name: memo.name }));
  return toReview(event, await syncEventMemos(event.id), memoTypes);
}

async function ownedBeo(eventId: string, beoId: string) {
  const beo = await getPrisma().beo.findFirst({
    where: { id: beoId, eventId },
    include: { fields: true, lines: true },
  });
  if (!beo) {
    throw new ReviewError("No se encontró la B.E.O.", 404);
  }
  return beo;
}

function storedFieldValue(key: string, value: string): string | null {
  const trimmed = value.trim();
  if (key === "rentCents") {
    const cents = parseAmount(trimmed);
    return cents === null ? null : String(cents);
  }
  if (key === "guarantee") {
    if (!trimmed) return null;
    const pax = Number(trimmed);
    if (!Number.isInteger(pax) || pax < 0) {
      throw new ReviewError("La garantía debe ser un número entero.", 400);
    }
    return String(pax);
  }
  return trimmed || null;
}

export async function updateBeoField(input: {
  eventId: string;
  beoId: string;
  key: string;
  value: string;
  remember: boolean;
}): Promise<EventReview> {
  const beo = await ownedBeo(input.eventId, input.beoId);
  const field = beo.fields.find((item) => item.key === input.key);
  if (!field) {
    throw new ReviewError("No se encontró el campo.", 404);
  }
  const next = storedFieldValue(input.key, input.value);
  const source = (SHARED_KEYS as readonly string[]).includes(input.key)
    ? "beo.override"
    : "beo.edit";
  await getPrisma().beoField.update({
    where: { id: field.id },
    data: { value: next, status: "RULE", source },
  });
  if (input.key === "salonName" && next) {
    await getPrisma().beo.update({ where: { id: beo.id }, data: { salon: next } });
  }
  await recordAudit({
    action: "beo.field.update",
    entity: "BeoField",
    entityId: field.id,
    before: jsonValue({ value: field.value, status: field.status }),
    after: jsonValue({ value: next, status: "RULE" }),
  });
  if (input.remember && input.key === "salonName" && field.value && next) {
    try {
      await saveLearnedNormalization({
        task: "block_fields",
        sourceText: field.value,
        result: next,
      });
    } catch (error) {
      if (error instanceof NormalizationInputError) {
        throw new ReviewError(error.message, 400);
      }
      throw error;
    }
  }
  return getEventReview(input.eventId);
}

export async function validateBeoField(
  eventId: string,
  beoId: string,
  key: string,
): Promise<EventReview> {
  const beo = await ownedBeo(eventId, beoId);
  const field = beo.fields.find((item) => item.key === key);
  if (!field) {
    throw new ReviewError("No se encontró el campo.", 404);
  }
  await getPrisma().beoField.update({
    where: { id: field.id },
    data: { status: "RULE" },
  });
  await recordAudit({
    action: "beo.field.validate",
    entity: "BeoField",
    entityId: field.id,
    before: jsonValue({ status: field.status, value: field.value }),
    after: jsonValue({ status: "RULE", value: field.value }),
  });
  return getEventReview(eventId);
}

export async function updateSharedField(
  eventId: string,
  key: string,
  value: string,
): Promise<EventReview> {
  if (!(SHARED_KEYS as readonly string[]).includes(key)) {
    throw new ReviewError("Ese dato no se comparte entre las B.E.O.", 400);
  }
  const event = await loadEvent(eventId);
  const next = storedFieldValue(key, value);
  for (const beo of event.beos) {
    const field = beo.fields.find((item) => item.key === key);
    if (!field || field.source === "beo.override") {
      continue;
    }
    await getPrisma().beoField.update({
      where: { id: field.id },
      data: { value: next, status: "RULE", source: "event.shared" },
    });
    await recordAudit({
      action: "beo.field.share",
      entity: "BeoField",
      entityId: field.id,
      before: jsonValue({ value: field.value, status: field.status }),
      after: jsonValue({ value: next, status: "RULE" }),
    });
  }
  return getEventReview(eventId);
}

export async function addBeoLine(input: {
  eventId: string;
  beoId: string;
  section: string;
  groupName: string;
  qty: number;
  description: string;
  unitPrice: string;
}): Promise<EventReview> {
  const beo = await ownedBeo(input.eventId, input.beoId);
  const description = input.description.trim();
  if (!description || !Number.isInteger(input.qty) || input.qty < 0) {
    throw new ReviewError("La línea necesita cantidad y descripción.", 400);
  }
  const unitPriceCents = parseAmount(input.unitPrice);
  const position = beo.lines.reduce((max, line) => Math.max(max, line.position), -1) + 1;
  const created = await getPrisma().beoLine.create({
    data: {
      beoId: beo.id,
      position,
      section: input.section,
      groupName: input.groupName,
      qty: input.qty,
      description,
      unitPriceCents,
      text: lineText(input.section, input.qty, description, unitPriceCents),
      status: "RULE",
      source: "beo.edit",
    },
  });
  await recordAudit({
    action: "beo.line.add",
    entity: "BeoLine",
    entityId: created.id,
    after: jsonValue({ description, qty: input.qty, unitPriceCents }),
  });
  return getEventReview(input.eventId);
}

export async function updateBeoLine(input: {
  eventId: string;
  lineId: string;
  qty: number;
  description: string;
  unitPrice: string;
  section: string;
}): Promise<EventReview> {
  const line = await getPrisma().beoLine.findFirst({
    where: { id: input.lineId, beo: { eventId: input.eventId } },
  });
  if (!line) {
    throw new ReviewError("No se encontró la línea.", 404);
  }
  const description = input.description.trim();
  if (!description || !Number.isInteger(input.qty) || input.qty < 0) {
    throw new ReviewError("La línea necesita cantidad y descripción.", 400);
  }
  const unitPriceCents = parseAmount(input.unitPrice);
  const section = input.section || line.section;
  await getPrisma().beoLine.update({
    where: { id: line.id },
    data: {
      qty: input.qty,
      description,
      unitPriceCents,
      section,
      text: lineText(section, input.qty, description, unitPriceCents),
      status: "RULE",
      source: "beo.edit",
    },
  });
  await recordAudit({
    action: "beo.line.update",
    entity: "BeoLine",
    entityId: line.id,
    before: jsonValue({
      qty: line.qty,
      description: line.description,
      unitPriceCents: line.unitPriceCents,
    }),
    after: jsonValue({ qty: input.qty, description, unitPriceCents }),
  });
  return getEventReview(input.eventId);
}

export async function deleteBeoLine(eventId: string, lineId: string): Promise<EventReview> {
  const line = await getPrisma().beoLine.findFirst({
    where: { id: lineId, beo: { eventId } },
  });
  if (!line) {
    throw new ReviewError("No se encontró la línea.", 404);
  }
  await getPrisma().beoLine.delete({ where: { id: line.id } });
  await recordAudit({
    action: "beo.line.delete",
    entity: "BeoLine",
    entityId: line.id,
    before: jsonValue({
      description: line.description,
      qty: line.qty,
      unitPriceCents: line.unitPriceCents,
    }),
  });
  return getEventReview(eventId);
}

export async function mergeBeos(
  eventId: string,
  targetId: string,
  sourceId: string,
): Promise<EventReview> {
  if (targetId === sourceId) {
    throw new ReviewError("Elige dos B.E.O. distintas.", 400);
  }
  const target = await ownedBeo(eventId, targetId);
  const source = await ownedBeo(eventId, sourceId);
  if (target.date !== source.date) {
    throw new ReviewError("Solo se unen B.E.O. del mismo día.", 400);
  }
  const start = target.lines.reduce((max, line) => Math.max(max, line.position), -1) + 1;
  await getPrisma().$transaction(async (tx) => {
    const lines = [...source.lines].sort((left, right) => left.position - right.position);
    for (const [index, line] of lines.entries()) {
      await tx.beoLine.update({
        where: { id: line.id },
        data: { beoId: target.id, position: start + index },
      });
    }
    await tx.beo.delete({ where: { id: source.id } });
  });
  await recordAudit({
    action: "beo.merge",
    entity: "Beo",
    entityId: target.id,
    before: jsonValue({ sourceId: source.id, salon: source.salon }),
    after: jsonValue({ salon: target.salon, date: target.date }),
  });
  return getEventReview(eventId);
}

export async function splitBeo(input: {
  eventId: string;
  beoId: string;
  salon: string;
  lineIds: string[];
}): Promise<EventReview> {
  const salon = input.salon.trim();
  if (!salon) {
    throw new ReviewError("Indica el salón de la B.E.O. nueva.", 400);
  }
  const beo = await ownedBeo(input.eventId, input.beoId);
  const moving = beo.lines.filter((line) => input.lineIds.includes(line.id));
  if (moving.length !== input.lineIds.length) {
    throw new ReviewError("Hay líneas que no pertenecen a esta B.E.O.", 400);
  }
  const event = await loadEvent(input.eventId);
  const position = event.beos.reduce((max, item) => Math.max(max, item.position), -1) + 1;
  const created = await getPrisma().$transaction(async (tx) => {
    const next = await tx.beo.create({
      data: {
        eventId: input.eventId,
        position,
        status: "draft",
        date: beo.date,
        salon,
        kind: beo.kind,
        needsReview: false,
        fields: {
          create: beo.fields.map((field) => ({
            key: field.key,
            value: field.key === "salonName" ? salon : field.value,
            status: field.key === "salonName" ? "RULE" : field.status,
            source: field.key === "salonName" ? "beo.edit" : field.source,
          })),
        },
      },
    });
    for (const [index, line] of moving.entries()) {
      await tx.beoLine.update({
        where: { id: line.id },
        data: { beoId: next.id, position: index },
      });
    }
    return next;
  });
  await recordAudit({
    action: "beo.split",
    entity: "Beo",
    entityId: created.id,
    before: jsonValue({ beoId: beo.id }),
    after: jsonValue({ salon, lines: moving.length }),
  });
  return getEventReview(input.eventId);
}

/** Genera las B.E.O. del evento cuando ya no quedan pendientes. */
export async function startGeneration(
  eventId: string,
  options?: {
    numbers?: string[];
    acknowledge?: boolean;
    toPdf?: (docx: Buffer) => Promise<Buffer>;
  },
): Promise<import("./beo-documents").GenerationResult> {
  const { generateEventDocuments } = await import("./beo-documents");
  return generateEventDocuments(eventId, options);
}

/** Anula una B.E.O. generada. El número queda usado y sale de la descarga del evento. */
export async function voidBeo(eventId: string, beoId: string): Promise<EventReview> {
  const beo = await ownedBeo(eventId, beoId);
  if (beo.status === "voided") {
    return getEventReview(eventId);
  }
  if (beo.status !== "generated") {
    throw new ReviewError("Solo se puede anular una B.E.O. ya generada.", 409);
  }
  await getPrisma().beo.update({ where: { id: beoId }, data: { status: "voided" } });
  const { markMemosStale } = await import("./event-memos");
  await markMemosStale(eventId);
  await recordAudit({
    action: "beo.void",
    entity: "Beo",
    entityId: beoId,
    after: jsonValue({ status: "voided" }),
  });
  return getEventReview(eventId);
}

/** Regenera solo las B.E.O. y memorándums elegidos, con el mismo número. */
export async function regenerateSelected(
  eventId: string,
  input: { beoIds: string[]; memoIds: string[]; toPdf?: (docx: Buffer) => Promise<Buffer> },
): Promise<
  EventReview & {
    files: { id: string; fileName: string; number: string }[];
    driveMessage: string | null;
    started: true;
  }
> {
  const { regenerateSelectedDocuments } = await import("./beo-documents");
  const { listEventDocuments } = await import("./beo-documents");
  const generated = await regenerateSelectedDocuments(eventId, input);
  const review = await getEventReview(eventId);
  const listed = await listEventDocuments(eventId);
  return {
    ...review,
    started: true,
    files: listed.files,
    driveMessage: generated.driveMessage ?? listed.driveMessage,
  };
}

/** Reintenta la subida a Drive de un documento que sigue pendiente o en error. */
export async function retryDriveUpload(
  eventId: string,
  documentId: string,
): Promise<
  EventReview & {
    files: {
      id: string;
      fileName: string;
      number: string;
      exceedsPage: boolean;
      kind: string;
      driveStatus: string;
      driveUrl: string | null;
    }[];
    driveMessage: string | null;
  }
> {
  const { retryGeneratedDocument } = await import("./drive-archive");
  const { listEventDocuments } = await import("./beo-documents");
  await retryGeneratedDocument(eventId, documentId);
  const review = await getEventReview(eventId);
  const listed = await listEventDocuments(eventId);
  return { ...review, files: listed.files, driveMessage: listed.driveMessage };
}
